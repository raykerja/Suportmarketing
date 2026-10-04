import { createClient } from 'npm:@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const publishableKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const webhookUrl = Deno.env.get('MARKETING_N8N_WEBHOOK')!;
const webhookSecret = Deno.env.get('MARKETING_WEBHOOK_SECRET')!;
const allowedOrigins = new Set([
  'https://raykerja.cloud',
  'https://www.raykerja.cloud',
  'https://raykerja.github.io',
]);
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

function response(body: unknown, status = 200, origin = '') {
  const headers: Record<string, string> = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (allowedOrigins.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Headers'] = 'authorization, apikey, content-type, x-client-info, x-ray-secret';
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Vary'] = 'Origin';
  }
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin') || '';
  if (request.method === 'OPTIONS') return response({}, allowedOrigins.has(origin) ? 204 : 403, origin);
  if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405, origin);
  let data: Record<string, unknown>;
  try { data = await request.json(); } catch { return response({ error: 'JSON tidak valid' }, 400, origin); }

  if (request.headers.has('x-ray-secret')) {
    if (request.headers.get('x-ray-secret') !== webhookSecret) return response({ error: 'Unauthorized' }, 401, origin);
    const id = String(data.research_id || '');
    if (!id) return response({ error: 'research_id wajib' }, 400, origin);
    const targets = Array.isArray(data.targets) ? data.targets : [];
    const status = data.ok === true ? 'done' : 'error';
    const { data: existing, error: lookupError } = await admin.from('marketing_researches')
      .select('research_id').eq('research_id', id).maybeSingle();
    if (lookupError) return response({ error: 'Database gagal dibaca' }, 500, origin);
    if (!existing) return response({ error: 'research_id tidak dikenal' }, 404, origin);
    if (status === 'done' && targets.length) {
      const rows = targets.map((t, i) => ({ t, i })).filter(({ t }) => t && typeof t === 'object' && t.nama_target).map(({ t, i }) => ({
        research_id: id, result_index: i, nama_target: String(t.nama_target), target_type: String(t.target_type || ''),
        kabupaten_kota: String(t.kabupaten_kota || ''), provinsi: String(t.provinsi || ''),
        lead_score: Number(t.lead_score) || 0, kategori: String(t.kategori || ''), data: t,
      }));
      const { error: leadError } = await admin.from('marketing_leads').upsert(rows, { onConflict: 'research_id,result_index' });
      if (leadError) return response({ error: 'Lead gagal disimpan' }, 500, origin);
    }
    const { error } = await admin.from('marketing_researches')
      .update({ status, targets, jumlah_ditemukan: targets.length, error: status === 'error' ? String(data.error || 'Riset gagal').slice(0, 300) : null, updated_at: new Date().toISOString() })
      .eq('research_id', id);
    if (error) return response({ error: 'Database gagal diperbarui' }, 500, origin);
    return response({ ok: true }, 200, origin);
  }

  if (origin && !allowedOrigins.has(origin)) return response({ error: 'Origin tidak diizinkan' }, 403, origin);
  const bearer = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!bearer) return response({ error: 'Login diperlukan' }, 401, origin);
  const authClient = createClient(url, publishableKey, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser(bearer);
  if (authError || !authData.user) return response({ error: 'Sesi tidak valid' }, 401, origin);
  const { data: membership, error: membershipError } = await admin.from('marketing_members')
    .select('user_id').eq('user_id', authData.user.id).maybeSingle();
  if (membershipError) return response({ error: 'Akses tidak dapat diperiksa' }, 500, origin);
  if (!membership) return response({ error: 'Akun belum diberi akses Marketing' }, 403, origin);
  if (data.action !== 'research') return response({ error: 'Aksi tidak dikenal' }, 400, origin);

  const targetType = String(data.target_type || '').toUpperCase();
  const kecamatan = String(data.kecamatan || '').trim().slice(0, 100);
  const kabupatenKota = String(data.kabupaten_kota || '').trim().slice(0, 100);
  const provinsi = String(data.provinsi || '').trim().slice(0, 100);
  const bidang = String(data.bidang || '').trim().slice(0, 150);
  const jumlah = Number(data.jumlah);
  if (!['SWASTA', 'PEMERINTAH'].includes(targetType) || !kecamatan || !kabupatenKota || !provinsi ||
      (targetType === 'SWASTA' && !bidang) || !Number.isInteger(jumlah) || jumlah < 1 || jumlah > 10) {
    return response({ error: 'Jenis, wilayah, bidang, atau jumlah tidak valid' }, 400, origin);
  }
  const id = 'RK-' + crypto.randomUUID();
  const { error: insertError } = await admin.from('marketing_researches').insert({ research_id: id, owner_id: authData.user.id,
    target_type: targetType, kecamatan, kabupaten_kota: kabupatenKota, provinsi, bidang, jumlah });
  if (insertError) return response({ error: 'Gagal mencatat permintaan riset' }, 500, origin);
  let ack: Record<string, unknown>;
  try {
    const n8n = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-RAY-Secret': webhookSecret },
      body: JSON.stringify({ research_id: id, target_type: targetType, kecamatan, kabupaten_kota: kabupatenKota, provinsi, bidang, jumlah }),
      signal: AbortSignal.timeout(25000) });
    if (!n8n.ok) throw new Error(`n8n HTTP ${n8n.status}`);
    ack = await n8n.json();
  } catch (e) {
    await admin.from('marketing_researches').update({ status: 'error', error: String(e).slice(0, 120) }).eq('research_id', id);
    return response({ error: `Riset gagal dimulai: ${String(e).slice(0, 120)}` }, 502, origin);
  }
  if (String(ack.research_id || '') !== id) {
    await admin.from('marketing_researches').update({ status: 'error', error: 'n8n mengembalikan ID yang berbeda' }).eq('research_id', id);
    return response({ error: 'n8n mengembalikan research_id yang berbeda' }, 502, origin);
  }
  return response({ ok: true, research_id: id }, 200, origin);
});
