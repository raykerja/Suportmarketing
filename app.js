import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg = window.RAY_CONFIG || {};
let invitePending = /(?:^|[&#])type=(?:invite|recovery)(?:&|$)/.test(location.hash);
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const date = (v) => v ? new Date(v).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const client = cfg.supabaseUrl && cfg.supabasePublishableKey
  ? createClient(cfg.supabaseUrl, cfg.supabasePublishableKey) : null;
let currentUser = null;
let currentMember = null;
let pollTimer = null;
let letterPollTimer = null;
let visitPollTimer = null;
let researchCache = [];
let leadCache = [];
let letterCache = [];
let visitCache = [];
let editingVisitId = null;
let editingLetterId = null;

function status(id, message, error = false) {
  const el = $(id); el.textContent = message; el.style.color = error ? '#b73729' : '#17634e';
}
function printDocument(html) {
  const area = $('#print-area');
  area.innerHTML = html;
  area.hidden = false;
  window.print();
  setTimeout(() => { area.hidden = true; area.innerHTML = ''; }, 1000);
}
function showWorkspace(user) {
  currentUser = user;
  if (!user) { $('#activation-link').value = ''; $('#activation-panel').hidden = true; }
  $('#login-panel').hidden = !!user;
  $('#setup-panel').hidden = !user || !invitePending;
  $('#workspace').hidden = !user || invitePending;
  $('#logout').hidden = !user || invitePending;
  if (user && !invitePending) { loadSettings(); loadResearches(); loadLeads(); loadLetters(); loadVisits(); }
  else {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (letterPollTimer) { clearInterval(letterPollTimer); letterPollTimer = null; }
    if (visitPollTimer) { clearInterval(visitPollTimer); visitPollTimer = null; }
  }
}
if (!client) status('#login-status', 'Konfigurasi Supabase belum tersedia. Hubungi admin.', true);
else {
  client.auth.getUser().then(({ data }) => showWorkspace(data.user));
  client.auth.onAuthStateChange((_event, session) => showWorkspace(session?.user || null));
}

$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!client) return;
  status('#login-status', 'Memeriksa akun…');
  const { error } = await client.auth.signInWithPassword({ email: $('#email').value.trim(), password: $('#password').value });
  status('#login-status', error ? 'Email atau kata sandi tidak sesuai.' : '', !!error);
});
$('#logout').addEventListener('click', async () => { await client.auth.signOut(); showWorkspace(null); });
$('#setup-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!client || !currentUser) return;
  const password = $('#new-password').value;
  if (password.length < 12) { status('#setup-status', 'Gunakan minimal 12 karakter.', true); return; }
  const { error } = await client.auth.updateUser({ password });
  if (error) { status('#setup-status', 'Gagal menyimpan kata sandi: ' + error.message, true); return; }
  invitePending = false;
  history.replaceState(null, '', location.pathname);
  showWorkspace(currentUser);
});

document.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b === button));
  document.querySelectorAll('.panel').forEach((p) => { p.hidden = p.id !== button.dataset.tab; });
}));

const visitFields = ['area','nama_perusahaan','kategori','nomor_kontak_perusahaan','alamat','tanggal_janji_kunjungan',
  'jabatan_pic','nama_pejabat_pic_1','nama_pejabat_pic_2','nomor_kontak_pic','tanggal_realisasi_kunjungan',
  'respon','tanggal_follow_up','catatan','titik_lokasi_laporan','koordinat_target','tanggal_follow_up_aktual',
  'catatan_hasil_follow_up','plotting_area','informasi_penting','tenaga_kerja_saat_ini','bagian_kerja_outsourcing',
  'jumlah_calon_tenaga_kerja','petugas_telemarketing','status_telemarketing','tanggal_menghubungi','catatan_telemarketing'];
function localToday() {
  const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0,10);
}
function visitPayload() {
  const form = $('#visit-form'); const result = {};
  for (const name of visitFields) result[name] = String(form.elements[name]?.value || '').trim();
  result.tanggal_input = localToday();
  result.nama_marketing = currentMember?.display_name || currentMember?.email || currentUser?.email || '';
  return result;
}
function resetVisitForm() {
  $('#visit-form').reset(); editingVisitId = null;
  $('#visit-form-title').textContent = 'Catat kunjungan'; $('#new-visit').hidden = true;
  $('#visit-form').elements.tanggal_realisasi_kunjungan.value = localToday();
  $('#photo-note').textContent = ''; status('#visit-status', '');
}
function fillVisitForm(row) {
  editingVisitId = row.id; $('#visit-form-title').textContent = 'Lengkapi kunjungan'; $('#new-visit').hidden = false;
  for (const name of visitFields) if ($('#visit-form').elements[name]) $('#visit-form').elements[name].value = row.data?.[name] || '';
  $('#visit-photo').value = '';
  $('#photo-note').textContent = row.photo_drive_url ? 'Foto tersimpan di Drive. Pilih foto baru hanya jika ingin menggantinya.' : row.photo_path ? 'Foto tersimpan; sinkronisasi Drive sedang diproses.' : '';
  document.querySelector('[data-tab="visits"]').click();
  $('#visit-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function loadVisits() {
  if (!client || !currentUser) return;
  const { data, error } = await client.from('marketing_visits').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) { $('#visit-list').textContent = 'Laporan belum dapat dibaca: ' + error.message; return; }
  visitCache = data || [];
  $('#visit-list').innerHTML = visitCache.length ? visitCache.map((v) => `<div class="item"><strong>${esc(v.data?.nama_perusahaan)}</strong><small>${esc(v.data?.tanggal_realisasi_kunjungan)} · ${esc(v.data?.nama_marketing || '')}</small><div>${esc(v.data?.respon || '—')} · <span class="badge ${v.sheet_status === 'error' ? 'error' : v.sheet_status === 'synced' ? '' : 'processing'}">${v.sheet_status === 'synced' ? 'Masuk Sheet' : v.sheet_status === 'error' ? 'Sinkronisasi gagal' : 'Menunggu Sheet'}</span></div><small>Follow up: ${esc(v.data?.tanggal_follow_up || 'belum ditetapkan')}</small><p>${esc(v.data?.catatan || '')}</p>${v.sheet_error ? `<small class="error">${esc(v.sheet_error)}</small>` : ''}${v.photo_drive_url ? `<div><a href="${esc(v.photo_drive_url)}" target="_blank" rel="noopener noreferrer">Lihat foto</a></div>` : ''}${v.owner_id === currentUser.id ? `<div class="item-actions"><button type="button" data-open-visit="${esc(v.id)}">Buka / ubah</button>${v.sheet_status === 'error' || v.sheet_status === 'pending' ? `<button type="button" data-retry-visit="${esc(v.id)}">Coba sinkron lagi</button>` : ''}</div>` : ''}</div>`).join('') : '<p class="hint">Belum ada laporan kunjungan.</p>';
  const recentProcessing = visitCache.some((v) => v.sheet_status === 'processing' && Date.now() - new Date(v.updated_at).getTime() < 180000);
  if (recentProcessing && !visitPollTimer) visitPollTimer = setInterval(loadVisits, 5000);
  if (!recentProcessing && visitPollTimer) { clearInterval(visitPollTimer); visitPollTimer = null; }
}
$('#refresh-visits').addEventListener('click', loadVisits);
$('#new-visit').addEventListener('click', resetVisitForm);
$('#visit-list').addEventListener('click', async (event) => {
  const open = event.target.closest('[data-open-visit]')?.dataset.openVisit;
  const retry = event.target.closest('[data-retry-visit]')?.dataset.retryVisit;
  if (open) { const row = visitCache.find((v) => v.id === open); if (row) fillVisitForm(row); }
  if (retry) { status('#visit-status', 'Mencoba sinkronisasi…'); await syncVisit(retry); await loadVisits(); }
});
$('#visit-company').addEventListener('change', () => {
  const name = $('#visit-company').value.trim().toLocaleLowerCase('id');
  const lead = leadCache.find((r) => r.nama_target?.toLocaleLowerCase('id') === name);
  if (!lead) return;
  const form = $('#visit-form');
  if (!form.elements.alamat.value) form.elements.alamat.value = lead.data?.alamat || '';
  if (!form.elements.nomor_kontak_perusahaan.value) form.elements.nomor_kontak_perusahaan.value = lead.data?.telepon || '';
  if (!form.elements.kategori.value) form.elements.kategori.value = lead.data?.bidang || lead.data?.jenis || '';
  if (!form.elements.area.value) form.elements.area.value = lead.kabupaten_kota || '';
});
$('#get-location').addEventListener('click', () => {
  if (!navigator.geolocation) { $('#location-status').textContent = 'Lokasi tidak tersedia di perangkat ini.'; return; }
  $('#location-status').textContent = 'Meminta izin lokasi…';
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    $('#visit-coordinates').value = `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
    $('#location-status').textContent = `Lokasi terisi (akurasi sekitar ${Math.round(coords.accuracy)} m).`;
  }, () => { $('#location-status').textContent = 'Lokasi tidak dapat diambil. Isi koordinat secara manual bila diperlukan.'; },
  { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
});
async function syncVisit(id) {
  const { data, error } = await client.functions.invoke('marketing', { body: { action: 'sync_visit', visit_id: id } });
  status('#visit-status', error || !data?.ok ? 'Laporan tersimpan di Supabase, tetapi belum masuk Sheet: ' + (data?.error || error?.message || 'Gagal memulai sinkronisasi') : 'Laporan tersimpan. Sinkronisasi Sheet sedang diproses.', !!error || !data?.ok);
}
$('#visit-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!client || !currentUser) return;
  const button = $('#save-visit'); button.disabled = true;
  status('#visit-status', 'Menyimpan laporan…');
  try {
    const payload = visitPayload();
    const { data, error } = await client.functions.invoke('marketing', { body: { action: 'save_visit', visit_id: editingVisitId, visit: payload } });
    if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Gagal menyimpan laporan');
    editingVisitId = data.visit_id;
    const photo = $('#visit-photo').files?.[0];
    if (photo) {
      if (photo.size > 10 * 1024 * 1024) throw new Error('Laporan tersimpan, tetapi foto lebih dari 10 MB. Pilih foto yang lebih kecil.');
      const ext = (photo.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${currentUser.id}/${data.visit_id}/${crypto.randomUUID()}.${ext}`;
      const upload = await client.storage.from('marketing-visit-photos').upload(path, photo, { contentType: photo.type || 'image/jpeg' });
      if (upload.error) throw new Error('Laporan tersimpan, tetapi foto gagal diunggah: ' + upload.error.message);
      const linked = await client.functions.invoke('marketing', { body: { action: 'attach_visit_photo', visit_id: data.visit_id, photo_path: path } });
      if (linked.error || !linked.data?.ok) throw new Error('Laporan tersimpan, tetapi foto gagal ditautkan: ' + (linked.data?.error || linked.error?.message));
    }
    $('#visit-photo').value = '';
    await syncVisit(data.visit_id);
    await loadVisits();
    if (!editingVisitId) resetVisitForm();
  } catch (e) { status('#visit-status', String(e.message || e), true); }
  finally { button.disabled = false; }
});
resetVisitForm();

$('#target-type').addEventListener('change', () => {
  const swasta = $('#target-type').value === 'SWASTA';
  $('#bidang-wrap').hidden = !swasta;
  $('#bidang').required = swasta;
});

async function loadResearches() {
  if (!client || !currentUser) return;
  const { data, error } = await client.from('marketing_researches').select('*').order('created_at', { ascending: false }).limit(30);
  if (error) { $('#research-list').textContent = 'Gagal membaca riset: ' + error.message; return; }
  researchCache = data || [];
  $('#research-list').innerHTML = researchCache.length ? researchCache.map((r) => `<div class="item"><strong>${esc(r.target_type)} · ${esc(r.kecamatan)}, ${esc(r.kabupaten_kota)}</strong><small>${esc(date(r.created_at))} · ${esc(r.research_id)}</small><div><span class="badge ${esc(r.status)}">${esc(r.status.toUpperCase())}</span> ${Number(r.jumlah_ditemukan) || 0}/${Number(r.jumlah) || 0} target</div><button type="button" data-research="${esc(r.research_id)}">Lihat hasil</button></div>`).join('') : '<p class="hint">Belum ada riset.</p>';
  if (researchCache.some((r) => r.status === 'processing') && !pollTimer) pollTimer = setInterval(loadResearches, 5000);
  if (!researchCache.some((r) => r.status === 'processing') && pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}
$('#refresh-research').addEventListener('click', loadResearches);
$('#research-list').addEventListener('click', (event) => {
  const id = event.target.closest('[data-research]')?.dataset.research;
  const row = researchCache.find((r) => r.research_id === id);
  if (!row) return;
  const result = $('#research-result'); result.hidden = false;
  const targets = Array.isArray(row.targets) ? row.targets : [];
  const rows = targets.map((t) => `<tr><td><strong>${esc(t.nama_target)}</strong><br>${esc(t.jenis || t.bidang)}</td><td>${esc(t.alamat)}<br>${esc(t.telepon)}<br>${esc(t.email)}</td><td>${esc(t.hrd || t.kepala_dinas || t.direktur || 'Belum ditemukan')}</td><td>${esc(t.lead_score)} · ${esc(t.kategori)}</td><td>${t.sumber && /^https?:\/\//i.test(t.sumber) ? `<a href="${esc(t.sumber)}" target="_blank" rel="noopener noreferrer">Sumber</a>` : '—'}</td></tr>`).join('');
  result.innerHTML = `<div class="section-head"><h2>Hasil ${esc(row.research_id)}</h2><button id="print-research">Cetak / PDF</button></div><p>${esc(row.target_type)} · ${esc(row.kecamatan)}, ${esc(row.kabupaten_kota)}, ${esc(row.provinsi)} · ${Number(row.jumlah_ditemukan) || 0} target</p>${row.drive_file_url ? `<p><a href="${esc(row.drive_file_url)}" target="_blank" rel="noopener noreferrer">Buka salinan di Google Drive</a></p>` : row.drive_error ? `<p class="error">Hasil sudah masuk Supabase, tetapi salinan Drive gagal: ${esc(row.drive_error)}</p>` : ''}${row.error ? `<p class="error">${esc(row.error)}</p>` : ''}${rows ? `<div class="table-wrap"><table><thead><tr><th>Target</th><th>Kontak</th><th>Pengambil keputusan</th><th>Skor</th><th>Referensi</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="hint">Hasil belum tersedia.</p>'}`;
  $('#print-research').addEventListener('click', () => printDocument(`<h1>Laporan Riset Target Market</h1><p>PT Ray Mitra Perkasa · ${esc(row.research_id)} · ${esc(row.kecamatan)}, ${esc(row.kabupaten_kota)}, ${esc(row.provinsi)}</p><table><thead><tr><th>Target</th><th>Kontak</th><th>Pengambil keputusan</th><th>Skor</th><th>Referensi</th></tr></thead><tbody>${rows}</tbody></table>`));
  result.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
$('#research-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('#research-submit'); button.disabled = true;
  status('#research-status', 'Mengirim riset ke n8n…');
  const body = { action: 'research', target_type: $('#target-type').value, kecamatan: $('#kecamatan').value.trim(),
    kabupaten_kota: $('#kabupaten').value.trim(), provinsi: $('#provinsi').value.trim(), bidang: $('#bidang').value.trim(), jumlah: Number($('#jumlah').value) };
  try {
    const { data, error } = await client.functions.invoke('marketing', { body });
    if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Permintaan gagal');
    status('#research-status', `Riset diterima. ID: ${data.research_id}. Hasil akan muncul otomatis.`);
    await loadResearches();
  } catch (error) { status('#research-status', String(error.message || error), true); }
  finally { button.disabled = false; }
});

async function loadLeads() {
  if (!client || !currentUser) return;
  const { data, error } = await client.from('marketing_leads').select('id,nama_target,target_type,kabupaten_kota,provinsi,lead_score,kategori,data').order('imported_at', { ascending: false }).limit(500);
  if (error) { $('#lead-list').textContent = 'Gagal membaca database: ' + error.message; return; }
  leadCache = data || []; renderLeads();
  $('#target-suggestions').innerHTML = leadCache.map((r) => `<option value="${esc(r.nama_target)}"></option>`).join('');
}
function renderLeads() {
  const q = $('#lead-query').value.trim().toLocaleLowerCase('id');
  const rows = leadCache.filter((r) => !q || [r.nama_target, r.kabupaten_kota, r.provinsi].some((x) => String(x || '').toLocaleLowerCase('id').includes(q)));
  $('#lead-list').innerHTML = rows.length ? `<table><thead><tr><th>Target</th><th>Jenis</th><th>Wilayah</th><th>Kontak</th><th>Skor</th><th>Sumber</th></tr></thead><tbody>${rows.map((r) => `<tr><td><strong>${esc(r.nama_target)}</strong><br>${esc(r.data?.bidang || r.data?.jenis)}</td><td>${esc(r.target_type)}</td><td>${esc(r.kabupaten_kota)}, ${esc(r.provinsi)}</td><td>${esc(r.data?.telepon)}<br>${esc(r.data?.email)}</td><td>${esc(r.lead_score)} · ${esc(r.kategori)}</td><td>${r.data?.sumber && /^https?:\/\//i.test(r.data.sumber) ? `<a href="${esc(r.data.sumber)}" target="_blank" rel="noopener noreferrer">Sumber</a>` : '—'}</td></tr>`).join('')}</tbody></table>` : '<p class="hint">Belum ada target yang cocok.</p>';
}
$('#lead-query').addEventListener('input', renderLeads);
$('#refresh-leads').addEventListener('click', loadLeads);

function makeDraft() {
  const recipient = $('#recipient').value.trim() || '[Nama penerima]';
  const subject = $('#subject').value.trim() || '[Perihal]';
  const service = $('#service').value;
  $('#letter-body').value = `PT Ray Mitra Perkasa\nSolusi Tenaga Kerja Profesional\n\nNomor: [ISI]\nLampiran: [ISI]\nPerihal: ${subject}\n\nKepada Yth.\n${recipient}\nDi tempat\n\nDengan hormat,\n\nPT Ray Mitra Perkasa bergerak di bidang jasa outsourcing/alih daya tenaga kerja. Melalui surat ini, kami menyampaikan penawaran awal layanan ${service} untuk mendukung kebutuhan operasional perusahaan/instansi Bapak/Ibu.\n\nRuang lingkup, jumlah personel, standar layanan, lokasi kerja, jadwal, dan nilai penawaran akan kami sesuaikan setelah pembahasan kebutuhan bersama. Kami siap menjelaskan mekanisme pengawasan, pelaporan, dan evaluasi layanan.\n\nKami berharap memperoleh kesempatan untuk berdiskusi lebih lanjut. Atas perhatian Bapak/Ibu, kami mengucapkan terima kasih.\n\nHormat kami,\nPT Ray Mitra Perkasa\n\n[Nama dan jabatan penandatangan]`;
  status('#letter-status', 'Draft awal dibuat. Periksa dan lengkapi bagian [ISI] sebelum dikirim.');
}
$('#make-draft').addEventListener('click', makeDraft);
$('#print-letter').addEventListener('click', () => printDocument(`<h1>${esc($('#subject').value || 'Surat Penawaran')}</h1><div class="letter-print">${esc($('#letter-body').value)}</div>`));
async function loadLetters() {
  if (!client || !currentUser) return;
  const { data, error } = await client.from('marketing_letters').select('*').order('updated_at', { ascending: false }).limit(100);
  if (error) { $('#letter-list').textContent = 'Gagal membaca surat: ' + error.message; return; }
  letterCache = data || [];
  $('#letter-list').innerHTML = letterCache.length ? letterCache.map((r) => `<div class="item"><strong>${esc(r.subject)}</strong><small>${esc(r.recipient)} · ${esc(date(r.updated_at))}</small><div>Drive: ${esc(r.drive_status || 'pending')} ${r.drive_file_url ? `<a href="${esc(r.drive_file_url)}" target="_blank" rel="noopener noreferrer">Buka file</a>` : ''}</div>${r.drive_error ? `<small class="error">${esc(r.drive_error)}</small>` : ''}<button type="button" data-letter="${esc(r.id)}">Buka</button></div>`).join('') : '<p class="hint">Belum ada draft tersimpan.</p>';
  if (letterCache.some((r) => r.drive_status === 'pending') && !letterPollTimer) letterPollTimer = setInterval(loadLetters, 5000);
  if (!letterCache.some((r) => r.drive_status === 'pending') && letterPollTimer) { clearInterval(letterPollTimer); letterPollTimer = null; }
}
$('#letter-list').addEventListener('click', (event) => {
  const row = letterCache.find((r) => r.id === event.target.closest('[data-letter]')?.dataset.letter);
  if (!row) return;
  editingLetterId = row.id; $('#recipient').value = row.recipient; $('#subject').value = row.subject; $('#letter-body').value = row.body;
  status('#letter-status', 'Draft dibuka. Perubahan akan disimpan pada draft yang sama.');
});
$('#letter-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const row = { recipient: $('#recipient').value.trim(), subject: $('#subject').value.trim(), body: $('#letter-body').value.trim(), updated_at: new Date().toISOString() };
  if (!row.body) { status('#letter-status', 'Isi surat wajib diisi.', true); return; }
  const query = editingLetterId ? client.from('marketing_letters').update(row).eq('id', editingLetterId) : client.from('marketing_letters').insert(row);
  const { data, error } = await query.select('id').single();
  if (error) { status('#letter-status', 'Gagal menyimpan: ' + error.message, true); return; }
  editingLetterId = data.id;
  const { data: saved, error: driveError } = await client.functions.invoke('marketing', { body: { action: 'save_letter', letter_id: data.id } });
  status('#letter-status', driveError || !saved?.ok ? 'Draft tersimpan di Supabase, tetapi salinan Drive belum berhasil: ' + (saved?.error || driveError?.message || 'Kesalahan tidak diketahui') : 'Draft tersimpan di Supabase. Salinan Drive sedang diproses.', !!driveError || !saved?.ok);
  await loadLetters();
});

async function loadSettings() {
  if (!client || !currentUser) return;
  const { data, error } = await client.functions.invoke('marketing', { body: { action: 'settings' } });
  if (error || !data?.ok) { status('#folder-status', data?.error || error?.message || 'Pengaturan gagal dibaca', true); return; }
  currentMember = data.self;
  $('#account-info').textContent = `${data.self.display_name || data.self.email} · ${data.self.role === 'admin' ? 'Admin' : 'Staf'}`;
  $('#folder-url').value = data.self.drive_folder_url || '';
  $('#admin-settings').hidden = data.self.role !== 'admin';
  $('#member-list').innerHTML = (data.members || []).map((m) => `<div class="item"><strong>${esc(m.display_name || m.email)}</strong><small>${esc(m.email)} · ${esc(m.role)} · ${m.active ? 'aktif' : 'nonaktif'}</small><form class="member-folder-form" data-user-id="${esc(m.user_id)}"><label>Folder Drive<input type="url" value="${esc(m.drive_folder_url || '')}" required></label><button type="submit">Simpan folder</button></form></div>`).join('');
}
$('#folder-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const { data, error } = await client.functions.invoke('marketing', { body: { action: 'set_folder', drive_folder_url: $('#folder-url').value.trim() } });
  status('#folder-status', error || !data?.ok ? data?.error || error?.message || 'Gagal menyimpan folder' : 'Folder akun tersimpan.', !!error || !data?.ok);
  if (data?.ok) loadSettings();
});
$('#invite-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('#activation-link').value = ''; $('#activation-panel').hidden = true;
  status('#invite-status', 'Membuat akun dan link aktivasi…');
  const { data, error } = await client.functions.invoke('marketing', { body: { action: 'invite_member', email: $('#invite-email').value.trim(),
    display_name: $('#invite-name').value.trim(), drive_folder_url: $('#invite-folder').value.trim() } });
  status('#invite-status', error || !data?.ok ? data?.error || error?.message || 'Akun gagal dibuat' : `Akun ${data.email} dibuat. Salin link aktivasi berikut dan kirim hanya kepada pemilik email.`, !!error || !data?.ok);
  if (data?.ok) { $('#activation-link').value = data.activation_link || ''; $('#activation-panel').hidden = !data.activation_link; $('#invite-form').reset(); loadSettings(); }
});
$('#copy-activation').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#activation-link').value); status('#invite-status', 'Link aktivasi disalin. Kirim hanya kepada pemilik akun.'); }
  catch { status('#invite-status', 'Gagal menyalin otomatis. Pilih dan salin link secara manual.', true); }
});
$('#member-list').addEventListener('submit', async (event) => {
  const form = event.target.closest('.member-folder-form');
  if (!form) return;
  event.preventDefault();
  const { data, error } = await client.functions.invoke('marketing', { body: { action: 'set_folder', user_id: form.dataset.userId,
    drive_folder_url: form.querySelector('input').value.trim() } });
  status('#invite-status', error || !data?.ok ? data?.error || error?.message || 'Folder gagal disimpan' : 'Folder staf tersimpan.', !!error || !data?.ok);
  if (data?.ok) loadSettings();
});
