import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg = window.RAY_CONFIG || {};
const progressPreviewMode = cfg.progressEnabled !== true;
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
let offerPollTimer = null;
let visitPollTimer = null;
let researchCache = [];
let leadCache = [];
let letterCache = [];
let offerCache = [];
let offerRequestId = null;
let manualOfferRequestId = null;
const reviewNames = { pending: 'Menunggu review', approved: 'Disetujui', rejected: 'Tidak dipilih' };
let visitCache = [];
let progressVisits = [];
let progressCache = [];
let progressEvents = [];
let editingVisitId = null;
let activeVisitStep = '1';
let editingLetterId = null;

function status(id, message, error = false) {
  const el = $(id); el.textContent = message; el.style.color = error ? '#b73729' : '#0a4fa6';
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
  if (!user) {
    currentMember = null;
    researchCache = []; leadCache = []; letterCache = []; offerCache = []; offerRequestId = null; manualOfferRequestId = null;
    $('#review-list').textContent = ''; $('#offer-list').textContent = ''; $('#lead-list').textContent = '';
    $('#activation-link').value = ''; $('#activation-panel').hidden = true;
    $('#account-info').textContent = ''; $('#folder-url').value = '';
    $('#member-list').textContent = ''; $('#admin-settings').hidden = true;
    activateTab('visits', false);
  }
  $('#login-panel').hidden = !!user;
  $('#setup-panel').hidden = !user || !invitePending;
  $('#workspace').hidden = !user || invitePending;
  $('#open-settings').hidden = !user || invitePending;
  $('#logout').hidden = !user || invitePending;
  if (user && !invitePending) {
    activateTab(history.state?.marketingTab || 'visits', false);
    loadSettings(); loadResearches(); loadLeads(); loadLetters(); loadOffers(); loadVisits(); loadProgress();
  }
  else {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (letterPollTimer) { clearInterval(letterPollTimer); letterPollTimer = null; }
    if (offerPollTimer) { clearInterval(offerPollTimer); offerPollTimer = null; }
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
$('#logout').addEventListener('click', async () => {
  const { error } = await client.auth.signOut();
  if (error) { status('#folder-status', 'Gagal keluar: ' + error.message, true); return; }
  showWorkspace(null);
});
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

const pipelineTabs = new Set(['research', 'review', 'letters']);
function activateTab(tab, record = true) {
  if (!$('#' + tab)?.classList.contains('panel')) tab = 'visits';
  const current = document.querySelector('.panel:not([hidden])')?.id;
  if (record && current !== tab) {
    if (!history.state?.marketingTab) history.replaceState({ ...history.state, marketingTab: current || 'visits' }, '');
    history.pushState({ ...history.state, marketingTab: tab }, '');
  }
  document.querySelectorAll('[data-tab]').forEach((button) => button.classList.toggle('active', button.dataset.tab === tab));
  const inPipeline = pipelineTabs.has(tab);
  $('#pipeline-tabs').hidden = !inPipeline;
  $('#pipeline-menu').classList.toggle('active', inPipeline);
  $('#pipeline-menu').setAttribute('aria-expanded', String(inPipeline));
  document.querySelectorAll('.panel').forEach((panel) => { panel.hidden = panel.id !== tab; });
  if (tab === 'review') loadLeads();
  if (tab === 'letters') { loadLeads(); loadOffers(); }
}
document.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => activateTab(button.dataset.tab)));
$('#pipeline-menu').addEventListener('click', () => activateTab('research'));
window.addEventListener('popstate', (event) => {
  if (currentUser && !invitePending) activateTab(event.state?.marketingTab || 'visits', false);
});

const visitFields = ['area','nama_perusahaan','kategori','nomor_kontak_perusahaan','alamat','tanggal_janji_kunjungan',
  'jabatan_pic','nama_pejabat_pic_1','nama_pejabat_pic_2','nomor_kontak_pic','tanggal_realisasi_kunjungan',
  'respon','tanggal_follow_up','catatan','titik_lokasi_laporan','koordinat_target','tanggal_follow_up_aktual',
  'catatan_hasil_follow_up','plotting_area','informasi_penting','tenaga_kerja_saat_ini','bagian_kerja_outsourcing',
  'jumlah_calon_tenaga_kerja','petugas_telemarketing','status_telemarketing','tanggal_menghubungi','catatan_telemarketing','status_marketing','waktu_realisasi_kunjungan'];
function localToday() {
  const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0,10);
}
function visitPayload() {
  const form = $('#visit-form'); const result = {};
  for (const name of visitFields) result[name] = String(form.elements[name]?.value || '').trim();
  const services = Array.from(document.querySelectorAll('.visit-service')).map((row) => ({
    bagian: row.querySelector('[data-service-name]').value.trim(), jumlah: row.querySelector('[data-service-count]').value.trim(),
  })).filter((row) => row.bagian || row.jumlah);
  result.layanan_outsourcing = services;
  result.bagian_kerja_outsourcing = services.map((row) => `${row.bagian} (${row.jumlah} orang)`).join(', ');
  result.jumlah_calon_tenaga_kerja = String(services.reduce((sum, row) => sum + Number(row.jumlah || 0), 0));
  result.visit_stage = activeVisitStep === '1' ? 'initial' : 'complete';
  result.tanggal_input = localToday();
  result.nama_marketing = currentMember?.display_name || currentMember?.email || currentUser?.email || '';
  return result;
}
function openVisitStep(step) {
  activeVisitStep = String(step);
  document.querySelectorAll('[data-visit-step]').forEach((button) => {
    const active = button.dataset.visitStep === String(step);
    button.classList.toggle('active', active);
    button.setAttribute('aria-expanded', String(active));
  });
  document.querySelectorAll('[data-visit-step-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.visitStepPanel !== String(step);
  });
  $('#save-visit').textContent = step === '1' ? 'Simpan tahap 1' : 'Simpan detail kunjungan';
  if (step === '2') renderSavedVisits();
}
$('#visit-step-nav').addEventListener('click', (event) => {
  const step = event.target.closest('[data-visit-step]')?.dataset.visitStep;
  if (step) openVisitStep(step);
});
function addVisitService(bagian = '', jumlah = '') {
  const row = document.createElement('div'); row.className = 'visit-service';
  row.innerHTML = `<label>Bagian kerja<input data-service-name maxlength="100" placeholder="Security / Cleaning Service" value="${esc(bagian)}"></label><label>Jumlah orang<input data-service-count type="number" min="1" max="100000" step="1" inputmode="numeric" value="${esc(jumlah)}"></label><button type="button" data-remove-service aria-label="Hapus bagian kerja">Hapus</button>`;
  $('#visit-services').appendChild(row);
}
$('#add-visit-service').addEventListener('click', () => addVisitService());
$('#visit-services').addEventListener('click', (event) => event.target.closest('[data-remove-service]')?.closest('.visit-service')?.remove());
function visitTimestamp(row) {
  $('#visit-timestamp').textContent = row ? `Tercatat: ${date(row.data?.waktu_realisasi_kunjungan || row.created_at)}` : `Waktu kunjungan: ${date(new Date().toISOString())} (otomatis saat disimpan)`;
}
function renderSavedVisits() {
  const selected = $('#visit-saved').value;
  $('#visit-saved').innerHTML = '<option value="">Pilih kunjungan</option>' + visitCache.filter((row) => row.owner_id === currentUser?.id).map((row) => `<option value="${esc(row.id)}">${esc(row.data?.nama_perusahaan)} · ${esc(date(row.data?.waktu_realisasi_kunjungan || row.created_at))}</option>`).join('');
  if (visitCache.some((row) => row.id === selected)) $('#visit-saved').value = selected;
}
$('#visit-saved').addEventListener('change', () => {
  const row = visitCache.find((item) => item.id === $('#visit-saved').value);
  if (row) fillVisitForm(row, '2');
});
function resetVisitForm() {
  $('#visit-form').reset(); editingVisitId = null;
  openVisitStep(1);
  $('#visit-form-title').textContent = 'Catat kunjungan'; $('#new-visit').hidden = true;
  $('#visit-saved').value = ''; $('#visit-services').replaceChildren(); addVisitService(); visitTimestamp();
  $('#photo-note').textContent = ''; status('#visit-status', '');
}
function fillVisitForm(row, step = '2') {
  editingVisitId = row.id; $('#visit-form-title').textContent = 'Lengkapi kunjungan'; $('#new-visit').hidden = false;
  openVisitStep(step);
  for (const name of visitFields) if ($('#visit-form').elements[name]) $('#visit-form').elements[name].value = row.data?.[name] || '';
  $('#visit-saved').value = row.id;
  $('#visit-services').replaceChildren();
  const services = Array.isArray(row.data?.layanan_outsourcing) ? row.data.layanan_outsourcing : [];
  services.forEach((item) => addVisitService(item.bagian, item.jumlah));
  if (!services.length) addVisitService();
  visitTimestamp(row);
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
  renderSavedVisits();
  $('#visit-list').innerHTML = visitCache.length ? visitCache.map((v) => `<div class="item"><strong>${esc(v.data?.nama_perusahaan)}</strong><small>${esc(date(v.data?.waktu_realisasi_kunjungan || v.created_at))} · ${esc(v.data?.nama_marketing || '')}</small><div><span class="badge ${v.data?.visit_stage === 'initial' ? 'processing' : ''}">${v.data?.visit_stage === 'initial' ? 'Tahap 1 · perlu detail' : 'Detail terisi'}</span> <span class="badge ${v.sheet_status === 'error' ? 'error' : v.sheet_status === 'synced' ? '' : 'processing'}">${v.sheet_status === 'synced' ? 'Masuk Sheet' : v.sheet_status === 'error' ? 'Sinkronisasi gagal' : 'Menunggu Sheet'}</span></div><small>Follow up: ${esc(v.data?.tanggal_follow_up || 'belum ditetapkan')}</small><p>${esc(v.data?.catatan || '')}</p>${v.sheet_error ? `<small class="error">${esc(v.sheet_error)}</small>` : ''}${v.photo_drive_url ? `<div><a href="${esc(v.photo_drive_url)}" target="_blank" rel="noopener noreferrer">Lihat foto</a></div>` : ''}${v.owner_id === currentUser.id ? `<div class="item-actions"><button type="button" data-open-visit="${esc(v.id)}">${v.data?.visit_stage === 'initial' ? 'Lengkapi detail' : 'Buka / ubah'}</button>${v.sheet_status === 'error' || v.sheet_status === 'pending' ? `<button type="button" data-retry-visit="${esc(v.id)}">Coba sinkron lagi</button>` : ''}</div>` : ''}</div>`).join('') : '<p class="hint">Belum ada laporan kunjungan.</p>';
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
  if (!form.elements.kategori.value) {
    const category = lead.data?.bidang || lead.data?.jenis || '';
    form.elements.kategori.value = Array.from(form.elements.kategori.options).some((option) => option.value === category) ? category : 'Lainnya';
  }
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
  const failed = !!error || !data?.ok;
  status('#visit-status', failed ? 'Laporan tersimpan di Supabase, tetapi belum masuk Sheet: ' + (data?.error || error?.message || 'Gagal memulai sinkronisasi') : 'Laporan tersimpan. Sinkronisasi Sheet sedang diproses.', failed);
  return !failed;
}
$('#visit-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!client || !currentUser) return;
  if (activeVisitStep === '2' && !editingVisitId) {
    status('#visit-status', 'Pilih kunjungan yang sudah disimpan terlebih dahulu.', true); $('#visit-saved').focus(); return;
  }
  const serviceRows = Array.from(document.querySelectorAll('.visit-service'));
  if (activeVisitStep === '2' && serviceRows.some((row) => !!row.querySelector('[data-service-name]').value.trim() !== !!row.querySelector('[data-service-count]').value.trim())) {
    status('#visit-status', 'Setiap bagian kerja harus memiliki nama dan jumlah orang.', true); return;
  }
  const activePanel = $(`#visit-step-${activeVisitStep}`);
  const firstInvalid = Array.from(activePanel.querySelectorAll('input,select,textarea')).find((field) => (field.required || field.value) && !field.checkValidity()) ||
    (activeVisitStep === '2' && !$('#visit-form').elements.respon.value ? $('#visit-form').elements.respon : null) ||
    (activeVisitStep === '2' && !$('#visit-form').elements.catatan.value.trim() ? $('#visit-form').elements.catatan : null);
  if (firstInvalid) {
    firstInvalid.reportValidity();
    firstInvalid.focus();
    status('#visit-status', 'Lengkapi kolom yang ditandai sebelum menyimpan laporan.', true);
    return;
  }
  const button = $('#save-visit'); button.disabled = true;
  status('#visit-status', 'Menyimpan laporan…');
  try {
    const payload = visitPayload();
    if (activeVisitStep === '1') {
      const initialKeys = ['nama_perusahaan','kategori','nama_pejabat_pic_1','jabatan_pic','koordinat_target','visit_stage'];
      for (const key of Object.keys(payload)) if (!initialKeys.includes(key)) delete payload[key];
    } else {
      const detailKeys = ['nama_perusahaan','alamat','nomor_kontak_pic','nomor_kontak_perusahaan','respon',
        'tenaga_kerja_saat_ini','bagian_kerja_outsourcing','jumlah_calon_tenaga_kerja','layanan_outsourcing',
        'catatan','informasi_penting','status_marketing','tanggal_follow_up','visit_stage'];
      for (const key of Object.keys(payload)) if (!detailKeys.includes(key)) delete payload[key];
    }
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
    const synced = await syncVisit(data.visit_id);
    await loadVisits();
    await loadProgress();
    $('#visit-saved').value = data.visit_id;
    const saved = visitCache.find((row) => row.id === data.visit_id);
    if (saved) visitTimestamp(saved);
    if (activeVisitStep === '1' && synced) status('#visit-status', 'Tahap 1 tersimpan. Detail dapat dilengkapi sekarang atau nanti melalui pilihan kunjungan.');
  } catch (e) { status('#visit-status', String(e.message || e), true); }
  finally { button.disabled = false; }
});
resetVisitForm();

const stageNames = { kunjungan: 'Kunjungan', proposal: 'Proposal', penawaran: 'Penawaran', follow_up: 'Follow up', deal: 'Deal', gagal: 'Gagal' };
function previewDate(days) {
  const value = new Date(localToday() + 'T00:00:00Z');
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
function loadProgressPreview() {
  const visitId = 'preview-target';
  progressVisits = [{ id: visitId, owner_id: currentUser.id, data: {
    nama_perusahaan: 'CONTOH · PT Contoh Industri', nama_marketing: 'Data contoh',
    tanggal_realisasi_kunjungan: previewDate(-7), catatan: 'Pertemuan awal dengan HR Manager.' } }];
  progressCache = [{ visit_id: visitId, stage: 'penawaran', next_follow_up: localToday(),
    last_note: 'Penawaran telah disampaikan.', last_activity_date: previewDate(-2) }];
  progressEvents = [
    { id: 'sample-3', visit_id: visitId, stage: 'penawaran', activity_date: previewDate(-2),
      note: 'Penawaran disampaikan kepada HR Manager.', next_follow_up: localToday() },
    { id: 'sample-2', visit_id: visitId, stage: 'proposal', activity_date: previewDate(-4),
      note: 'Proposal dikirim setelah pembahasan kebutuhan.', next_follow_up: previewDate(-2) },
    { id: 'sample-1', visit_id: visitId, stage: 'kunjungan', activity_date: previewDate(-7),
      note: 'Pertemuan awal dan pengumpulan kebutuhan tenaga kerja.', next_follow_up: previewDate(-4) },
  ];
  $('#progress-preview-note').hidden = false;
  $('#save-progress').textContent = 'Coba langkah (simulasi)';
  renderProgress();
}
function progressState(visit) {
  const row = progressCache.find((p) => p.visit_id === visit.id);
  return row || { stage: 'kunjungan', next_follow_up: visit.data?.tanggal_follow_up || null,
    last_note: visit.data?.catatan || '', last_activity_date: visit.data?.tanggal_realisasi_kunjungan || '' };
}
function renderProgress() {
  const today = localToday();
  const open = progressVisits.map((visit) => ({ visit, progress: progressState(visit) }))
    .filter(({ progress }) => !['deal','gagal'].includes(progress.stage));
  const due = open.filter(({ progress }) => progress.next_follow_up && progress.next_follow_up <= today)
    .sort((a, b) => a.progress.next_follow_up.localeCompare(b.progress.next_follow_up));
  const upcoming = open.filter(({ progress }) => progress.next_follow_up && progress.next_follow_up > today).length;
  const banner = $('#visit-reminder-banner');
  banner.hidden = progressPreviewMode || !due.length;
  banner.textContent = due.length ? `${due.length} target perlu follow up hari ini atau sudah terlambat. Buka pengingat →` : '';
  $('#progress-summary').innerHTML = `<div><strong>${due.filter((x) => x.progress.next_follow_up < today).length}</strong><small>Terlambat</small></div><div><strong>${due.filter((x) => x.progress.next_follow_up === today).length}</strong><small>Hari ini</small></div><div><strong>${upcoming}</strong><small>Akan datang</small></div><div><strong>${open.filter((x) => !x.progress.next_follow_up).length}</strong><small>Belum dijadwalkan</small></div>`;
  $('#progress-due').innerHTML = due.length ? `<h3>Perlu ditindaklanjuti</h3>${due.map(({ visit, progress }) => `<div class="due-item"><div><strong>${esc(visit.data?.nama_perusahaan)}</strong><small>${esc(progress.next_follow_up)} · ${esc(stageNames[progress.stage])} · ${esc(visit.data?.nama_marketing)}</small></div>${visit.owner_id === currentUser.id ? `<button type="button" data-progress-open="${esc(visit.id)}">Catat progres</button>` : ''}</div>`).join('')}` : '<p class="hint">Tidak ada follow up yang jatuh tempo hari ini atau terlambat.</p>';
  const selected = $('#progress-visit').value;
  const own = progressVisits.filter((visit) => visit.owner_id === currentUser.id);
  $('#progress-visit').innerHTML = '<option value="">Pilih target</option>' + own.map((visit) => `<option value="${esc(visit.id)}">${esc(visit.data?.nama_perusahaan)} · ${esc(visit.data?.tanggal_realisasi_kunjungan)}</option>`).join('');
  if (own.some((visit) => visit.id === selected)) $('#progress-visit').value = selected;
  else if (progressPreviewMode && own.length) $('#progress-visit').value = own[0].id;
  renderProgressTarget();
}
function renderProgressTarget() {
  const id = $('#progress-visit').value;
  const visit = progressVisits.find((row) => row.id === id);
  const current = visit && progressState(visit);
  $('#progress-current').textContent = current ? `Tahap saat ini: ${stageNames[current.stage] || current.stage} · Follow up: ${current.next_follow_up || 'belum dijadwalkan'}` : '';
  $('#progress-steps').innerHTML = current ? ['kunjungan','proposal','penawaran','follow_up','deal','gagal']
    .map((stage) => `<span class="${current.stage === stage ? 'current' : ''}">${esc(stageNames[stage])}</span>`).join('') : '';
  const events = progressEvents.filter((row) => row.visit_id === id);
  $('#progress-history').innerHTML = !id ? '<p class="hint">Pilih target untuk melihat riwayatnya.</p>' : events.length ? events.map((row) => `<div class="item timeline-item"><strong>${esc(stageNames[row.stage])}</strong><small>${esc(row.activity_date)} · ${esc(row.next_follow_up ? 'Follow up: ' + row.next_follow_up : 'Tidak ada jadwal')}</small><p>${esc(row.note)}</p>${row.attachment_url ? `<a href="${esc(row.attachment_url)}" target="_blank" rel="noopener noreferrer">Buka file Drive</a>` : ''}</div>`).join('') : '<p class="hint">Belum ada perkembangan setelah kunjungan.</p>';
}
async function loadProgress() {
  if (!client || !currentUser) return;
  if (progressPreviewMode) { loadProgressPreview(); return; }
  const results = await Promise.all([
    client.from('marketing_visits').select('id,owner_id,data,created_at').order('created_at', { ascending: false }).limit(500),
    client.from('marketing_progress').select('*').limit(500),
    client.from('marketing_progress_events').select('*').order('created_at', { ascending: false }).limit(1000),
  ]);
  const failed = results.find((row) => row.error);
  if (failed) { $('#progress-due').textContent = 'Progres belum dapat dibaca: ' + failed.error.message; return; }
  progressVisits = results[0].data || []; progressCache = results[1].data || []; progressEvents = results[2].data || [];
  renderProgress();
}
$('#refresh-progress').addEventListener('click', loadProgress);
$('#visit-reminder-banner').addEventListener('click', () => document.querySelector('[data-tab="progress"]').click());
$('#progress-visit').addEventListener('change', renderProgressTarget);
$('#progress-letter').addEventListener('change', () => {
  const letter = letterCache.find((row) => row.id === $('#progress-letter').value);
  if (letter?.drive_file_url) $('#progress-attachment').value = letter.drive_file_url;
});
$('#progress-due').addEventListener('click', (event) => {
  const id = event.target.closest('[data-progress-open]')?.dataset.progressOpen;
  if (id) { $('#progress-visit').value = id; renderProgressTarget(); $('#progress-form').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
});
$('#progress-stage').addEventListener('change', () => {
  const closed = ['deal','gagal'].includes($('#progress-stage').value);
  $('#progress-next-wrap').hidden = closed; $('#progress-next').required = !closed;
  if (closed) $('#progress-next').value = '';
});
$('#progress-date').value = localToday();
$('#progress-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('#save-progress'); button.disabled = true;
  if (progressPreviewMode) {
    const attachment = $('#progress-attachment').value.trim();
    if (attachment && !/^https:\/\/drive\.google\.com\//.test(attachment)) {
      status('#progress-status', 'Gunakan link file Google Drive untuk simulasi.', true);
      button.disabled = false;
      return;
    }
    const visitId = $('#progress-visit').value;
    const stage = $('#progress-stage').value;
    const nextFollowUp = ['deal','gagal'].includes(stage) ? null : $('#progress-next').value;
    const row = { id: crypto.randomUUID(), visit_id: visitId, stage, activity_date: $('#progress-date').value,
      note: $('#progress-note').value.trim(), next_follow_up: nextFollowUp,
      attachment_url: attachment || null };
    progressEvents.unshift(row);
    progressCache = [{ visit_id: visitId, stage, next_follow_up: nextFollowUp,
      last_note: row.note, last_activity_date: row.activity_date }];
    renderProgress();
    status('#progress-status', 'Simulasi berhasil. Perubahan ini hanya terlihat di browser dan hilang saat halaman dimuat ulang.');
    button.disabled = false;
    return;
  }
  status('#progress-status', 'Menyimpan perkembangan…');
  try {
    const body = { action: 'record_progress', visit_id: $('#progress-visit').value, stage: $('#progress-stage').value,
      activity_date: $('#progress-date').value, note: $('#progress-note').value.trim(),
      next_follow_up: $('#progress-next').value, attachment_url: $('#progress-attachment').value.trim() };
    const { data, error } = await client.functions.invoke('marketing', { body });
    if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Gagal menyimpan perkembangan');
    const visitId = body.visit_id;
    const syncStarted = await syncVisit(visitId);
    const syncMessage = $('#visit-status').textContent;
    await Promise.all([loadProgress(), loadVisits()]);
    $('#progress-visit').value = visitId; renderProgressTarget();
    $('#progress-note').value = ''; $('#progress-attachment').value = '';
    $('#progress-letter').value = '';
    status('#progress-status', `Perkembangan tersimpan. ${syncMessage}`, !syncStarted);
  } catch (error) { status('#progress-status', String(error.message || error), true); }
  finally { button.disabled = false; }
});

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
  const { data, error } = await client.from('marketing_leads').select('id,owner_id,nama_target,target_type,kabupaten_kota,provinsi,lead_score,kategori,data,review_status').order('imported_at', { ascending: false }).limit(500);
  if (error) { $('#lead-list').textContent = 'Gagal membaca database: ' + error.message; $('#review-list').textContent = 'Review belum dapat dibaca: ' + error.message; return; }
  leadCache = data || []; renderLeads(); renderReview(); renderOfferOptions();
  $('#target-suggestions').innerHTML = leadCache.map((r) => `<option value="${esc(r.nama_target)}"></option>`).join('');
}
function renderLeads() {
  const q = $('#lead-query').value.trim().toLocaleLowerCase('id');
  const rows = leadCache.filter((r) => !q || [r.nama_target, r.kabupaten_kota, r.provinsi].some((x) => String(x || '').toLocaleLowerCase('id').includes(q)));
  $('#lead-list').innerHTML = rows.length ? `<table><thead><tr><th>Target</th><th>Jenis</th><th>Wilayah</th><th>Kontak</th><th>Skor</th><th>Review</th><th>Sumber</th></tr></thead><tbody>${rows.map((r) => `<tr><td><strong>${esc(r.nama_target)}</strong><br>${esc(r.data?.bidang || r.data?.jenis)}</td><td>${esc(r.target_type)}</td><td>${esc(r.kabupaten_kota)}, ${esc(r.provinsi)}</td><td>${esc(r.data?.telepon)}<br>${esc(r.data?.email)}</td><td>${esc(r.lead_score)} · ${esc(r.kategori)}</td><td>${esc(reviewNames[r.review_status] || 'Menunggu review')}</td><td>${r.data?.sumber && /^https?:\/\//i.test(r.data.sumber) ? `<a href="${esc(r.data.sumber)}" target="_blank" rel="noopener noreferrer">Sumber</a>` : '—'}</td></tr>`).join('')}</tbody></table>` : '<p class="hint">Belum ada target yang cocok.</p>';
}
$('#lead-query').addEventListener('input', renderLeads);
$('#refresh-leads').addEventListener('click', loadLeads);

function renderReview() {
  const rows = leadCache.filter((row) => row.owner_id === currentUser?.id);
  const counts = { pending: 0, approved: 0, rejected: 0 };
  rows.forEach((row) => { counts[row.review_status || 'pending'] += 1; });
  $('#review-summary').innerHTML = `<span>${counts.pending} menunggu</span><span>${counts.approved} disetujui</span><span>${counts.rejected} tidak dipilih</span>`;
  $('#review-list').innerHTML = rows.length ? rows.map((row) => {
    const source = row.data?.sumber;
    const rup = row.target_type === 'PEMERINTAH' ? row.data : null;
    const rupUrl = rup?.procurement_sumber || rup?.procurement_link;
    const rupInfo = rup ? `<div class="rup-evidence"><strong>RUP / SiRUP tahun sebelumnya</strong><small>Status: ${esc(rup.procurement_status_verifikasi || 'Belum terverifikasi')}</small><p>${esc(rup.procurement_paket || 'Paket belum ditemukan')} · TA ${esc(rup.procurement_tahun || '—')}</p><p>Pagu: ${esc(rup.procurement_pagu || 'Belum terverifikasi')} · Satker: ${esc(rup.satker || '—')}</p><p>Kebutuhan: ${esc(rup.procurement_kebutuhan || 'Belum terverifikasi')} · Jumlah personel: ${esc(rup.procurement_personel || rup.procurement_volume || 'Belum terverifikasi')}</p><small>${esc(rup.procurement_bukti_personel || 'Jumlah personel perlu bukti KAK/RKS.')}</small>${rupUrl && /^https:\/\//i.test(rupUrl) ? `<a href="${esc(rupUrl)}" target="_blank" rel="noopener noreferrer">Buka dokumen RUP</a>` : '<small>Dokumen RUP belum tersedia</small>'}</div>` : '';
    return `<div class="item review-card"><strong>${esc(row.nama_target)}</strong><small>${esc(row.kabupaten_kota)}, ${esc(row.provinsi)} · Skor ${esc(row.lead_score)} · ${esc(row.kategori)}</small><p>${esc(row.data?.alamat || 'Alamat belum ditemukan')}</p><small>Kontak: ${esc(row.data?.telepon || '—')} · ${esc(row.data?.email || '—')}</small><div>${source && /^https?:\/\//i.test(source) ? `<a href="${esc(source)}" target="_blank" rel="noopener noreferrer">Periksa sumber</a>` : '<span class="hint">Sumber belum tersedia</span>'}</div>${rupInfo}<div class="review-actions"><span class="badge">${esc(reviewNames[row.review_status] || reviewNames.pending)}</span><button type="button" data-review="approved" data-lead="${esc(row.id)}">Setujui</button><button type="button" data-review="rejected" data-lead="${esc(row.id)}">Tidak dipilih</button>${row.review_status === 'approved' ? `<button type="button" data-offer-lead="${esc(row.id)}">Buat penawaran</button>` : ''}</div></div>`;
  }).join('') : '<p class="hint">Belum ada hasil riset milik akun ini.</p>';
}
$('#refresh-review').addEventListener('click', loadLeads);
$('#review-list').addEventListener('click', async (event) => {
  const offerLead = event.target.closest('[data-offer-lead]')?.dataset.offerLead;
  if (offerLead) { document.querySelector('[data-tab="letters"]').click(); await loadLeads(); $('#offer-lead').value = offerLead; showOfferTarget(); return; }
  const button = event.target.closest('[data-review]');
  if (!button) return;
  button.disabled = true;
  status('#review-status', 'Menyimpan hasil review…');
  const { data, error } = await client.functions.invoke('marketing', { body: { action: 'review_lead', lead_id: button.dataset.lead, review_status: button.dataset.review } });
  status('#review-status', error || !data?.ok ? data?.error || error?.message || 'Review gagal disimpan' : 'Hasil review tersimpan.', !!error || !data?.ok);
  button.disabled = false;
  if (data?.ok) await loadLeads();
});

function renderOfferOptions() {
  const select = $('#offer-lead'); const selected = select.value;
  const rows = leadCache.filter((row) => row.owner_id === currentUser?.id && row.review_status === 'approved');
  select.innerHTML = '<option value="">Pilih target hasil review</option>' + rows.map((row) => `<option value="${esc(row.id)}">${esc(row.nama_target)} · ${esc(row.kabupaten_kota)}</option>`).join('');
  if (rows.some((row) => row.id === selected)) select.value = selected;
  showOfferTarget();
}
function showOfferTarget() {
  const row = leadCache.find((lead) => lead.id === $('#offer-lead').value);
  $('#offer-target-detail').textContent = row ? `${row.nama_target} · ${row.data?.alamat || 'Alamat belum tersedia'} · ${row.kabupaten_kota || ''}, ${row.provinsi || ''}` : 'Pilih target di menu Review Hasil terlebih dahulu.';
}
$('#offer-lead').addEventListener('change', () => { offerRequestId = null; showOfferTarget(); });
$('#offer-umk').addEventListener('input', () => { offerRequestId = null; });
$('#offer-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('#offer-submit'); button.disabled = true;
  const leadId = $('#offer-lead').value; const umk = Number($('#offer-umk').value);
  if (!leadId || !Number.isSafeInteger(umk) || umk < 1) { status('#offer-status', 'Pilih target dan isi UMK yang valid.', true); button.disabled = false; return; }
  offerRequestId ||= crypto.randomUUID();
  status('#offer-status', 'Mengirim permintaan dokumen ke n8n…');
  try {
    const { data, error } = await client.functions.invoke('marketing', { body: { action: 'generate_offer', lead_id: leadId, umk, request_id: offerRequestId } });
    if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Generator gagal dimulai');
    offerRequestId = null;
    status('#offer-status', `Penawaran ${data.offer_id} diterima. Dokumen akan muncul di daftar setelah selesai.`);
    await loadOffers();
  } catch (error) { status('#offer-status', String(error.message || error), true); }
  finally { button.disabled = false; }
});
async function loadOffers() {
  if (!client || !currentUser) return;
  const { data, error } = await client.from('marketing_offers').select('id,owner_id,client_name,umk,status,nomor_surat,doc_file_url,rab_file_url,error,created_at,updated_at').order('created_at', { ascending: false }).limit(100);
  if (error) { $('#offer-list').textContent = 'Dokumen belum dapat dibaca: ' + error.message; return; }
  offerCache = data || [];
  const recent = (row) => row.status === 'processing' && Date.now() - new Date(row.updated_at).getTime() < 600000;
  $('#offer-list').innerHTML = offerCache.length ? offerCache.map((row) => `<div class="item"><strong>${esc(row.client_name)}</strong><small>${esc(date(row.created_at))} · UMK Rp${Number(row.umk).toLocaleString('id-ID')} · ${esc(row.nomor_surat || 'Nomor diproses')}</small><div><span class="badge ${row.status === 'error' ? 'error' : row.status === 'processing' || row.status === 'partial' ? 'processing' : ''}">${esc(row.status.toUpperCase())}</span></div><div class="offer-links">${row.doc_file_url ? `<a href="${esc(row.doc_file_url)}" target="_blank" rel="noopener noreferrer">Google Docs surat pengantar</a>` : ''}${row.rab_file_url ? `<a href="${esc(row.rab_file_url)}" target="_blank" rel="noopener noreferrer">Google Sheets RAB</a>` : ''}</div>${row.error ? `<small class="error">${esc(row.error)}</small>` : row.status === 'processing' && !recent(row) ? '<small class="error">Proses lebih dari 10 menit. Muat ulang atau minta admin memeriksa eksekusi n8n.</small>' : ''}</div>`).join('') : '<p class="hint">Belum ada dokumen penawaran.</p>';
  if (offerCache.some(recent) && !offerPollTimer) offerPollTimer = setInterval(loadOffers, 5000);
  if (!offerCache.some(recent) && offerPollTimer) { clearInterval(offerPollTimer); offerPollTimer = null; }
}
$('#refresh-offers').addEventListener('click', loadOffers);

$('#manual-offer-date').value = localToday();
$('#open-manual-offer').addEventListener('click', () => {
  $('#manual-offer-layout').open = true;
  $('#manual-offer-layout').scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('#manual-offer-name').focus({ preventScroll: true });
});
$('#manual-offer-form').addEventListener('input', () => { manualOfferRequestId = null; });
$('#manual-offer-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!client || !currentUser) return;
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const counts = ['security', 'cleaning', 'pramubakti', 'driver']
    .map((name) => Number($(`#manual-offer-${name}`).value));
  const umk = Number($('#manual-offer-umk').value);
  if (!Number.isSafeInteger(umk) || umk < 1 || umk > 1000000000 ||
      counts.some((count) => !Number.isSafeInteger(count) || count < 0 || count > 5000) ||
      counts.every((count) => count === 0)) {
    status('#manual-offer-status', 'Periksa UMK dan isi minimal satu personel pada RAB.', true);
    return;
  }
  const button = $('#manual-offer-submit');
  button.disabled = true;
  manualOfferRequestId ||= crypto.randomUUID();
  status('#manual-offer-status', 'Mengirim penawaran manual ke n8n…');
  try {
    const { data, error } = await client.functions.invoke('marketing', { body: {
      action: 'generate_offer_manual', request_id: manualOfferRequestId,
      tanggal_surat: $('#manual-offer-date').value,
      ditujukan_kepada: $('#manual-offer-recipient').value.trim(),
      nama_target: $('#manual-offer-name').value.trim(),
      alamat: $('#manual-offer-address').value.trim(),
      kecamatan: $('#manual-offer-district').value.trim(),
      kabupaten_kota: $('#manual-offer-city').value.trim(),
      provinsi: $('#manual-offer-province').value.trim(), umk,
      jumlah_personel: { security: counts[0], cleaning: counts[1], pramubakti: counts[2], driver: counts[3] },
    } });
    if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Generator manual gagal dimulai');
    manualOfferRequestId = null;
    status('#manual-offer-status', `Penawaran ${data.offer_id} diterima. Google Docs dan RAB akan muncul di daftar setelah selesai.`);
    await loadOffers();
  } catch (error) { status('#manual-offer-status', String(error.message || error), true); }
  finally { button.disabled = false; }
});

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
  const selectedProgressLetter = $('#progress-letter').value;
  $('#progress-letter').innerHTML = '<option value="">Pilih surat tersimpan</option>' + letterCache.filter((r) => r.drive_file_url)
    .map((r) => `<option value="${esc(r.id)}">${esc(r.subject)} · ${esc(r.recipient)}</option>`).join('');
  if (letterCache.some((r) => r.id === selectedProgressLetter && r.drive_file_url)) $('#progress-letter').value = selectedProgressLetter;
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
