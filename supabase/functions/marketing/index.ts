import { createClient } from 'npm:@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const publishableKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const webhookUrl = Deno.env.get('MARKETING_N8N_WEBHOOK')!;
const letterWebhookUrl = Deno.env.get('MARKETING_N8N_LETTER_WEBHOOK')!;
const visitWebhookUrl = webhookUrl.replace(/raykerja-target$/, 'raykerja-visit');
const webhookSecret = Deno.env.get('MARKETING_WEBHOOK_SECRET')!;
const allowedOrigins = new Set([
  'https://marketing.raykerja.cloud',
  'https://raykerja.github.io',
]);
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const folderPattern = /^https:\/\/drive\.google\.com\/drive\/folders\/([A-Za-z0-9_-]{10,200})(?:[/?#].*)?$/;
function folder(value: unknown) {
  const input = String(value || '').trim();
  const match = input.match(folderPattern);
  return match ? { id: match[1], url: `https://drive.google.com/drive/folders/${match[1]}` } : null;
}
async function callWorkflow(endpoint: string, payload: Record<string, unknown>) {
  const result = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-RAY-Secret': webhookSecret },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(25000) });
  if (!result.ok) throw new Error(`n8n HTTP ${result.status}`);
  return await result.json();
}

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
    if (data.kind === 'letter') {
      const letterId = String(data.letter_id || '');
      if (!/^[0-9a-f-]{36}$/i.test(letterId)) return response({ error: 'letter_id tidak valid' }, 400, origin);
      const { data: letter } = await admin.from('marketing_letters').select('id').eq('id', letterId).maybeSingle();
      if (!letter) return response({ error: 'Surat tidak ditemukan' }, 404, origin);
      const saved = data.drive_status === 'done' && /^[A-Za-z0-9_-]{10,200}$/.test(String(data.drive_file_id || ''));
      const fileId = saved ? String(data.drive_file_id) : null;
      const { error } = await admin.from('marketing_letters').update({ drive_status: saved ? 'done' : 'error',
        drive_file_id: fileId, drive_file_url: fileId ? `https://drive.google.com/file/d/${fileId}/view` : null,
        drive_error: saved ? null : String(data.drive_error || 'Gagal menyimpan ke Drive').slice(0, 300) }).eq('id', letterId);
      return error ? response({ error: 'Database gagal diperbarui' }, 500, origin) : response({ ok: true }, 200, origin);
    }
    if (data.kind === 'visit') {
      const visitId = String(data.visit_id || '');
      if (!/^[0-9a-f-]{36}$/i.test(visitId)) return response({ error: 'visit_id tidak valid' }, 400, origin);
      const { data: visit } = await admin.from('marketing_visits').select('id').eq('id', visitId).maybeSingle();
      if (!visit) return response({ error: 'Laporan tidak ditemukan' }, 404, origin);
      const synced = data.ok === true;
      const sheetRow = data.sheet_row == null ? null : Number(data.sheet_row);
      const photoId = /^[A-Za-z0-9_-]{10,200}$/.test(String(data.photo_drive_file_id || '')) ? String(data.photo_drive_file_id) : null;
      const { error } = await admin.from('marketing_visits').update({ sheet_status: synced ? 'synced' : 'error',
        sheet_row: synced && sheetRow !== null && Number.isInteger(sheetRow) && sheetRow >= 2 ? sheetRow : null,
        sheet_error: synced ? null : String(data.error || 'Sinkronisasi Sheet gagal').slice(0, 300),
        photo_drive_file_id: photoId,
        photo_drive_url: photoId ? `https://drive.google.com/file/d/${photoId}/view` : null,
        updated_at: new Date().toISOString() }).eq('id', visitId);
      return error ? response({ error: 'Database gagal diperbarui' }, 500, origin) : response({ ok: true }, 200, origin);
    }
    const id = String(data.research_id || '');
    if (!id) return response({ error: 'research_id wajib' }, 400, origin);
    const targets = Array.isArray(data.targets) ? data.targets : [];
    const driveSaved = data.drive_status === 'done' && /^[A-Za-z0-9_-]{10,200}$/.test(String(data.drive_file_id || ''));
    const status = data.ok === true ? (driveSaved ? 'done' : 'partial') : 'error';
    const { data: existing, error: lookupError } = await admin.from('marketing_researches')
      .select('research_id,owner_id').eq('research_id', id).maybeSingle();
    if (lookupError) return response({ error: 'Database gagal dibaca' }, 500, origin);
    if (!existing) return response({ error: 'research_id tidak dikenal' }, 404, origin);
    if (data.ok === true && targets.length) {
      const rows = targets.map((t, i) => ({ t, i })).filter(({ t }) => t && typeof t === 'object' && t.nama_target).map(({ t, i }) => ({
        research_id: id, owner_id: existing.owner_id, result_index: i, nama_target: String(t.nama_target), target_type: String(t.target_type || ''),
        kabupaten_kota: String(t.kabupaten_kota || ''), provinsi: String(t.provinsi || ''),
        lead_score: Number(t.lead_score) || 0, kategori: String(t.kategori || ''), data: t,
      }));
      const { error: leadError } = await admin.from('marketing_leads').upsert(rows, { onConflict: 'research_id,result_index' });
      if (leadError) return response({ error: 'Lead gagal disimpan' }, 500, origin);
    }
    const { error } = await admin.from('marketing_researches')
      .update({ status, targets, jumlah_ditemukan: targets.length, error: status === 'error' ? String(data.error || 'Riset gagal').slice(0, 300) : null,
        drive_file_id: driveSaved ? String(data.drive_file_id) : null,
        drive_file_url: driveSaved ? `https://drive.google.com/file/d/${String(data.drive_file_id)}/view` : null,
        drive_error: data.ok === true && !driveSaved ? String(data.drive_error || 'Gagal menyimpan ke Drive').slice(0, 300) : null,
        updated_at: new Date().toISOString() })
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
    .select('user_id,email,display_name,role,drive_folder_id,drive_folder_url,active').eq('user_id', authData.user.id).maybeSingle();
  if (membershipError) return response({ error: 'Akses tidak dapat diperiksa' }, 500, origin);
  if (!membership || !membership.active) return response({ error: 'Akun belum diberi akses Marketing' }, 403, origin);
  if (data.action === 'settings') {
    const { data: members, error } = membership.role === 'admin'
      ? await admin.from('marketing_members').select('user_id,email,display_name,role,drive_folder_url,active').order('created_at')
      : { data: [], error: null };
    return error ? response({ error: 'Pengaturan gagal dibaca' }, 500, origin) : response({ ok: true, self: membership, members }, 200, origin);
  }
  if (data.action === 'set_folder') {
    const targetId = String(data.user_id || authData.user.id);
    if (targetId !== authData.user.id && membership.role !== 'admin') return response({ error: 'Hanya admin dapat mengubah folder akun lain' }, 403, origin);
    const destination = folder(data.drive_folder_url);
    if (!destination) return response({ error: 'Gunakan link folder Google Drive yang valid' }, 400, origin);
    const { data: updated, error } = await admin.from('marketing_members').update({ drive_folder_id: destination.id,
      drive_folder_url: destination.url, updated_at: new Date().toISOString() }).eq('user_id', targetId).select('user_id').maybeSingle();
    return error ? response({ error: 'Folder gagal disimpan' }, 500, origin)
      : updated ? response({ ok: true }, 200, origin) : response({ error: 'Akun tidak ditemukan' }, 404, origin);
  }
  if (data.action === 'invite_member') {
    if (membership.role !== 'admin') return response({ error: 'Hanya admin dapat membuat akun' }, 403, origin);
    const email = String(data.email || '').trim().toLowerCase();
    const destination = folder(data.drive_folder_url);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !destination) return response({ error: 'Email atau folder Drive tidak valid' }, 400, origin);
    const { data: currentMember, error: currentError } = await admin.from('marketing_members')
      .select('user_id').eq('email', email).maybeSingle();
    if (currentError) return response({ error: 'Akun gagal diperiksa' }, 500, origin);
    if (currentMember) return response({ error: 'Akun sudah ada. Ubah foldernya pada daftar akun.' }, 409, origin);
    const { data: invited, error: inviteError } = await admin.auth.admin.generateLink({ type: 'invite', email,
      options: { redirectTo: 'https://marketing.raykerja.cloud' } });
    if (inviteError || !invited.user || !invited.properties?.action_link) return response({ error: 'Link aktivasi gagal dibuat: ' + (inviteError?.message || 'Unknown') }, 502, origin);
    const { error } = await admin.from('marketing_members').upsert({ user_id: invited.user.id, email,
      display_name: String(data.display_name || '').trim().slice(0, 100), role: 'staff', active: true,
      drive_folder_id: destination.id, drive_folder_url: destination.url, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    return error ? response({ error: 'Akun dibuat tetapi akses gagal dicatat; periksa akun sebelum membuat ulang link' }, 500, origin)
      : response({ ok: true, email, activation_link: invited.properties.action_link }, 200, origin);
  }
  if (data.action === 'save_visit') {
    const fields = ['area','nama_perusahaan','kategori','nomor_kontak_perusahaan','alamat','tanggal_input',
      'tanggal_janji_kunjungan','jabatan_pic','nama_pejabat_pic_1','nama_pejabat_pic_2','nomor_kontak_pic',
      'tanggal_realisasi_kunjungan','respon','tanggal_follow_up','catatan','titik_lokasi_laporan',
      'koordinat_target','tanggal_follow_up_aktual','catatan_hasil_follow_up','nama_marketing','plotting_area',
      'informasi_penting','tenaga_kerja_saat_ini','bagian_kerja_outsourcing','jumlah_calon_tenaga_kerja',
      'petugas_telemarketing','status_telemarketing','tanggal_menghubungi','catatan_telemarketing'];
    const incoming = data.visit && typeof data.visit === 'object' && !Array.isArray(data.visit)
      ? data.visit as Record<string, unknown> : {};
    const visit: Record<string, string> = {};
    for (const key of fields) visit[key] = String(incoming[key] ?? '').trim().slice(0, key === 'catatan' ? 3000 : 2000);
    visit.nama_marketing = membership.display_name || membership.email;
    if (!visit.nama_perusahaan || visit.nama_perusahaan.length > 180 || !visit.respon || !visit.catatan ||
      !/^\d{4}-\d{2}-\d{2}$/.test(visit.tanggal_realisasi_kunjungan) ||
      !['tanggal_input','tanggal_janji_kunjungan','tanggal_follow_up','tanggal_follow_up_aktual','tanggal_menghubungi']
        .every((key) => !visit[key] || /^\d{4}-\d{2}-\d{2}$/.test(visit[key])) ||
      (visit.jumlah_calon_tenaga_kerja && (!/^\d+$/.test(visit.jumlah_calon_tenaga_kerja) || Number(visit.jumlah_calon_tenaga_kerja) > 100000))) {
      return response({ error: 'Nama target, tanggal, respons, catatan, atau jumlah tenaga kerja tidak valid' }, 400, origin);
    }
    const id = String(data.visit_id || '');
    if (id) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) return response({ error: 'visit_id tidak valid' }, 400, origin);
      const { data: previous } = await admin.from('marketing_visits').select('data')
        .eq('id', id).eq('owner_id', authData.user.id).maybeSingle();
      if (!previous) return response({ error: 'Laporan tidak ditemukan' }, 404, origin);
      visit.tanggal_input = String(previous.data?.tanggal_input || visit.tanggal_input);
      const { data: progress } = await admin.from('marketing_progress').select('stage,next_follow_up').eq('visit_id', id).maybeSingle();
      if (progress) {
        visit.tanggal_follow_up = progress.next_follow_up || '';
        if (progress.stage === 'deal') visit.respon = 'Baik';
        if (progress.stage === 'gagal') visit.respon = 'Menolak';
      }
      const { data: updated, error } = await admin.from('marketing_visits').update({ data: { ...previous.data, ...visit },
        sheet_status: 'pending', sheet_error: null, updated_at: new Date().toISOString() })
        .eq('id', id).eq('owner_id', authData.user.id).select('id').maybeSingle();
      return error ? response({ error: 'Laporan gagal diperbarui' }, 500, origin)
        : updated ? response({ ok: true, visit_id: id }, 200, origin) : response({ error: 'Laporan tidak ditemukan' }, 404, origin);
    }
    visit.tanggal_input = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric',
      month: '2-digit', day: '2-digit' }).format(new Date());
    const { data: created, error } = await admin.from('marketing_visits').insert({ owner_id: authData.user.id, data: visit })
      .select('id').single();
    return error ? response({ error: 'Laporan gagal disimpan' }, 500, origin)
      : response({ ok: true, visit_id: created.id }, 200, origin);
  }
  if (data.action === 'record_progress') {
    const visitId = String(data.visit_id || '');
    const stage = String(data.stage || '');
    const activityDate = String(data.activity_date || '');
    const nextFollowUp = String(data.next_follow_up || '');
    const note = String(data.note || '').trim();
    const attachmentUrl = String(data.attachment_url || '').trim();
    const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
    if (!/^[0-9a-f-]{36}$/i.test(visitId) || !['kunjungan','proposal','penawaran','follow_up','deal','gagal'].includes(stage) ||
      !validDate(activityDate) || (nextFollowUp && !validDate(nextFollowUp)) || !note || note.length > 3000 ||
      (attachmentUrl && (!/^https:\/\/drive\.google\.com\//.test(attachmentUrl) || attachmentUrl.length > 500)) ||
      (!['deal','gagal'].includes(stage) && !nextFollowUp)) {
      return response({ error: 'Isi tahap, tanggal kegiatan, catatan, dan jadwal follow up yang valid' }, 400, origin);
    }
    const { data: visit } = await admin.from('marketing_visits').select('id').eq('id', visitId)
      .eq('owner_id', authData.user.id).maybeSingle();
    if (!visit) return response({ error: 'Laporan tidak ditemukan atau bukan milik akun ini' }, 404, origin);
    const { data: eventId, error } = await admin.rpc('marketing_record_progress', {
      p_visit_id: visitId, p_owner_id: authData.user.id, p_stage: stage, p_activity_date: activityDate,
      p_note: note, p_next_follow_up: ['deal','gagal'].includes(stage) ? null : nextFollowUp,
      p_attachment_url: attachmentUrl || null,
    });
    return error ? response({ error: 'Progres gagal disimpan: ' + error.message.slice(0, 150) }, 500, origin)
      : response({ ok: true, event_id: eventId, visit_id: visitId }, 200, origin);
  }
  if (data.action === 'attach_visit_photo') {
    const id = String(data.visit_id || '');
    const path = String(data.photo_path || '');
    if (!/^[0-9a-f-]{36}$/i.test(id) || !new RegExp(`^${authData.user.id}/${id}/[0-9a-f-]{36}\\.(?:jpe?g|png|webp|heic|heif)$`, 'i').test(path))
      return response({ error: 'Foto atau laporan tidak valid' }, 400, origin);
    const { data: object } = await admin.storage.from('marketing-visit-photos').info(path);
    if (!object) return response({ error: 'Foto belum terunggah' }, 404, origin);
    const { data: updated, error } = await admin.from('marketing_visits').update({ photo_path: path,
      photo_drive_file_id: null, photo_drive_url: null, sheet_status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', id).eq('owner_id', authData.user.id).select('id').maybeSingle();
    return error ? response({ error: 'Foto gagal ditautkan' }, 500, origin)
      : updated ? response({ ok: true }, 200, origin) : response({ error: 'Laporan tidak ditemukan' }, 404, origin);
  }
  if (data.action === 'sync_visit') {
    const id = String(data.visit_id || '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) return response({ error: 'visit_id tidak valid' }, 400, origin);
    const { data: visit } = await admin.from('marketing_visits').select('*').eq('id', id).eq('owner_id', authData.user.id).maybeSingle();
    if (!visit) return response({ error: 'Laporan tidak ditemukan' }, 404, origin);
    if (visit.photo_path && !membership.drive_folder_id) return response({ error: 'Atur folder Drive di Pengaturan sebelum menyinkronkan foto' }, 400, origin);
    let photoUrl: string | null = null;
    if (visit.photo_path && !visit.photo_drive_file_id) {
      const { data: signed, error } = await admin.storage.from('marketing-visit-photos').createSignedUrl(visit.photo_path, 600);
      if (error || !signed?.signedUrl) return response({ error: 'Foto belum dapat dibaca' }, 500, origin);
      photoUrl = signed.signedUrl;
    }
    await admin.from('marketing_visits').update({ sheet_status: 'processing', sheet_error: null,
      updated_at: new Date().toISOString() }).eq('id', id);
    try {
      const ack = await callWorkflow(visitWebhookUrl, { visit_id: id, visit: visit.data,
        sheet_row: visit.sheet_row, email: membership.email, drive_folder_id: membership.drive_folder_id,
        photo_url: photoUrl, photo_drive_file_id: visit.photo_drive_file_id });
      if (String(ack.visit_id || '') !== id) throw new Error('ID laporan dari n8n berbeda');
    } catch (e) {
      await admin.from('marketing_visits').update({ sheet_status: 'error', sheet_error: String(e).slice(0, 300) }).eq('id', id);
      return response({ error: 'Sinkronisasi gagal dimulai: ' + String(e).slice(0, 120) }, 502, origin);
    }
    return response({ ok: true, visit_id: id }, 200, origin);
  }
  if (data.action === 'save_letter') {
    if (!membership.drive_folder_id) return response({ error: 'Atur folder Google Drive di Pengaturan sebelum menyimpan surat' }, 400, origin);
    const letterId = String(data.letter_id || '');
    if (!/^[0-9a-f-]{36}$/i.test(letterId)) return response({ error: 'letter_id tidak valid' }, 400, origin);
    const { data: letter } = await admin.from('marketing_letters').select('id,owner_id,subject,recipient,body').eq('id', letterId).maybeSingle();
    if (!letter || letter.owner_id !== authData.user.id) return response({ error: 'Surat tidak ditemukan' }, 404, origin);
    await admin.from('marketing_letters').update({ drive_status: 'pending', drive_folder_id: membership.drive_folder_id,
      drive_error: null }).eq('id', letterId);
    try {
      const ack = await callWorkflow(letterWebhookUrl, { letter_id: letterId, email: membership.email,
        drive_folder_id: membership.drive_folder_id, subject: letter.subject, recipient: letter.recipient, body: letter.body });
      if (String(ack.letter_id || '') !== letterId) throw new Error('ID surat dari n8n berbeda');
    } catch (e) {
      await admin.from('marketing_letters').update({ drive_status: 'error', drive_error: String(e).slice(0, 300) }).eq('id', letterId);
      return response({ error: 'Surat di Supabase, tetapi proses Drive gagal dimulai: ' + String(e).slice(0, 120) }, 502, origin);
    }
    return response({ ok: true }, 200, origin);
  }
  if (data.action !== 'research') return response({ error: 'Aksi tidak dikenal' }, 400, origin);
  if (!membership.drive_folder_id) return response({ error: 'Atur folder Google Drive di Pengaturan sebelum mencari target' }, 400, origin);

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
    target_type: targetType, kecamatan, kabupaten_kota: kabupatenKota, provinsi, bidang, jumlah,
    drive_folder_id: membership.drive_folder_id });
  if (insertError) return response({ error: 'Gagal mencatat permintaan riset' }, 500, origin);
  let ack: Record<string, unknown>;
  try {
    ack = await callWorkflow(webhookUrl, { research_id: id, drive_folder_id: membership.drive_folder_id,
      target_type: targetType, kecamatan, kabupaten_kota: kabupatenKota, provinsi, bidang, jumlah });
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
