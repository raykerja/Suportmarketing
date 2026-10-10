import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { validateStaffWorkbook } from './staff-import.mjs';
import { WILAYAH_DATA } from './data/wilayah.mjs';

const cfg = window.RAY_CONFIG || {};
const progressPreviewMode = cfg.progressEnabled !== true;
const staffLoginDomain = 'staff.marketing.raykerja.cloud';
let invitePending = /(?:^|[&#])type=(?:invite|recovery)(?:&|$)/.test(location.hash);
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const memberLabel = (member) => member?.display_name || (member?.email || '').split('@')[0] || 'Akun';
const date = (v) => v ? new Date(v).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const client = cfg.supabaseUrl && cfg.supabasePublishableKey
  ? createClient(cfg.supabaseUrl, cfg.supabasePublishableKey) : null;
let currentUser = null;
let currentMember = null;
let staffImportRows = [];
let existingStaffUsernames = [];
let staffImportBusy = false;
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
let expenseCache = [];

function status(id, message, error = false) {
  const el = $(id); el.textContent = message; el.style.color = error ? '#b73729' : '#0a4fa6';
}
function clearStaffImportPreview() {
  staffImportRows.forEach((row) => { row.password = ''; });
  staffImportRows = [];
  $('#staff-import-preview').hidden = true;
  $('#staff-import-create').disabled = true;
}
function publishVisitSnapshot(error = '') {
  const visits = error ? [] : visitCache.map((row) => ({
    id: row.id,
    name: row.data?.nama_perusahaan,
    at: row.data?.waktu_realisasi_kunjungan || row.created_at,
    owner: row.data?.nama_marketing,
    contact: row.data?.nama_pejabat_pic_1,
    response: row.data?.respon,
    note: row.data?.catatan,
    next: row.data?.tanggal_follow_up,
    visitStage: row.data?.visit_stage
  }));
  window.dispatchEvent(new CustomEvent('marketing:visits-snapshot', { detail: { visits, error } }));
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
    activeClients = []; picAliases = []; memberOptions = []; priceRows = []; priceLoaded = false; showDbView('target'); renderActiveClients(); publishActiveClients(); picVisitRows = []; publishPicVisits(); publishOffers([], []);
    visitCache = []; $('#visit-list').textContent = ''; $('#visit-saved').innerHTML = '<option value="">Pilih kunjungan</option>';
    publishVisitSnapshot();
    expenseCache = []; $('#expense-list').textContent = '';
    $('#review-list').textContent = ''; $('#offer-list').textContent = ''; $('#lead-list').textContent = '';
    $('#ai-answer').textContent = ''; $('#ai-answer').hidden = true; $('#ai-sources').textContent = '';
    status('#ai-search-status', '');
    $('#account-info').textContent = ''; $('#folder-url').value = '';
    $('#member-list').textContent = ''; $('#admin-settings').hidden = true;
    clearStaffImportPreview(); existingStaffUsernames = [];
    $('#staff-import-file').value = '';
    $('#staff-import-results').textContent = ''; status('#staff-import-status', '');
    activateTab('visits', false);
  }
  $('#login-panel').hidden = !!user;
  $('#setup-panel').hidden = !user || !invitePending;
  $('#workspace').hidden = !user || invitePending;
  $('#open-settings').hidden = !user || invitePending;
  $('#logout').hidden = !user || invitePending;
  if (user && !invitePending) {
    activateTab(history.state?.marketingTab || 'visits', false);
    loadSettings(); loadResearches(); loadLeads(); loadLetters(); loadOffers(); loadVisits(); loadProgress(); loadExpenses(); loadActiveClients().then(() => { loadPicVisits(); loadClientOffers(); });
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
  const login = $('#login-name').value.trim().toLowerCase();
  const email = login.includes('@') ? login : `${login}@${staffLoginDomain}`;
  const { error } = await client.auth.signInWithPassword({ email, password: $('#password').value });
  status('#login-status', error ? 'Username atau kata sandi tidak sesuai.' : '', !!error);
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

const activeClientTabs = new Set(['clients', 'pic-visits', 'client-progress']);
const salesTabs = new Set(['visits', 'progress']);
const pipelineTabs = new Set(['research', 'review', 'letters', 'manual-offer', 'price-simulation', 'leads']);
const expenseTabs = new Set(['expenses']);
function activateTab(tab, record = true) {
  if (!$('#' + tab)?.classList.contains('panel')) tab = 'visits';
  const current = document.querySelector('.panel:not([hidden])')?.id;
  if (current === 'settings' && tab !== 'settings') {
    if (staffImportBusy && currentUser) { status('#staff-import-status', 'Tunggu sampai pembuatan akun selesai sebelum pindah menu.', true); return; }
    clearStaffImportPreview();
    $('#staff-import-file').value = '';
  }
  if (record && current !== tab) {
    if (!history.state?.marketingTab) history.replaceState({ ...history.state, marketingTab: current || 'visits' }, '');
    history.pushState({ ...history.state, marketingTab: tab }, '');
  }
  document.querySelectorAll('[data-tab]').forEach((button) => button.classList.toggle('active', button.dataset.tab === tab));
  const inActiveClient = activeClientTabs.has(tab);
  $('#active-client-tabs').hidden = !inActiveClient;
  $('#active-client-menu').classList.toggle('active', inActiveClient);
  $('#active-client-menu').setAttribute('aria-expanded', String(inActiveClient));
  const inSales = salesTabs.has(tab);
  $('#sales-tabs').hidden = !inSales;
  $('#sales-menu').classList.toggle('active', inSales);
  $('#sales-menu').setAttribute('aria-expanded', String(inSales));
  const inPipeline = pipelineTabs.has(tab);
  $('#pipeline-tabs').hidden = !inPipeline;
  $('#pipeline-menu').classList.toggle('active', inPipeline);
  $('#pipeline-menu').setAttribute('aria-expanded', String(inPipeline));
  const inExpense = expenseTabs.has(tab);
  $('#expense-menu').classList.toggle('active', inExpense);
  $('#expense-menu').setAttribute('aria-expanded', String(inExpense));
  document.querySelectorAll('.panel').forEach((panel) => { panel.hidden = panel.id !== tab; });
  if (tab === 'review') loadLeads();
  if (tab === 'letters') { loadLeads(); loadOffers(); }
  if (tab === 'manual-offer') loadOffers();
  if (tab === 'price-simulation') { if (!priceLoaded) loadPrices(); else renderSimTable(); }
}
document.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => activateTab(button.dataset.tab)));
$('#active-client-menu').addEventListener('click', () => activateTab('clients'));
$('#sales-menu').addEventListener('click', () => activateTab('visits'));
$('#pipeline-menu').addEventListener('click', () => activateTab('research'));
$('#expense-menu').addEventListener('click', () => activateTab('expenses'));
window.addEventListener('popstate', (event) => {
  if (currentUser && !invitePending) activateTab(event.state?.marketingTab || 'visits', false);
});

function closeSettingsMenu() {
  $('#settings-menu').hidden = true;
  $('#open-settings').setAttribute('aria-expanded', 'false');
}
$('#open-settings').addEventListener('click', (event) => {
  event.stopPropagation();
  const willOpen = $('#settings-menu').hidden;
  if (willOpen) { $('#settings-menu').hidden = false; $('#open-settings').setAttribute('aria-expanded', 'true'); }
  else closeSettingsMenu();
});
$('#settings-menu').addEventListener('click', (event) => { if (event.target.closest('[data-tab]')) closeSettingsMenu(); });
$('#settings-menu').addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const item = event.target.closest('[data-tab]');
  if (!item) return;
  event.preventDefault(); item.click();
});
document.addEventListener('click', (event) => { if (!$('#settings-menu').hidden && !event.target.closest('.settings-menu-wrap')) closeSettingsMenu(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !$('#settings-menu').hidden) closeSettingsMenu(); });

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
// Database Client Active (data produksi): RLS membatasi staf pada client aktif yang PIC-nya dirinya; admin mengubah lewat RPC.
let activeClients = [];
let activeClientLoaded = false;
let activeClientError = '';
let picAliases = [];
let memberOptions = [];
let editingClient = null;
let visitStats = [];
let changeLog = [];
const isAdmin = () => currentMember?.role === 'admin';
const picTokens = (row) => {
  const split = (raw) => (raw || '').split(',').flatMap((part) => (part.trim() === 'PAK TOHAR' ? ['PAK TOHAR'] : part.split(/\s+/))).filter(Boolean);
  return [...new Set([...split(row.korlap_raw), ...split(row.admin_raw)])];
};
const korlapTokens = (row) => picTokens({ korlap_raw: row.korlap_raw });
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const daysLeft = (r) => r.kontrak_akhir ? Math.round((new Date(r.kontrak_akhir + 'T00:00:00') - new Date(todayIso() + 'T00:00:00')) / 86400000) : null;
const shortDate = (v) => v ? new Date(v + 'T12:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
function contractCell(r) {
  if (!r.kontrak_akhir && !r.kontrak_mulai) return r.masa_kontrak ? esc(r.masa_kontrak) : '<small>belum diisi</small>';
  const left = daysLeft(r);
  const badge = left === null ? '' : left < 0 ? `<span class="badge error">Berakhir ${-left} hari lalu</span>` : left <= 30 ? `<span class="badge error">${left} hari lagi</span>`
    : left <= 90 ? `<span class="badge processing">${left} hari lagi</span>` : `<span class="badge">${left} hari lagi</span>`;
  return `${esc(shortDate(r.kontrak_mulai) || '?')} – ${esc(shortDate(r.kontrak_akhir) || '?')}<br>${badge}${r.masa_kontrak ? `<br><small>${esc(r.masa_kontrak)}</small>` : ''}`;
}
async function loadActiveClients() {
  if (!client || !currentUser) return;
  const requestedUserId = currentUser.id;
  activeClientError = '';
  const [clients, aliases] = await Promise.all([
    client.from('marketing_clients').select('*').order('source_no').limit(2000),
    client.from('marketing_pic_aliases').select('*').order('alias')
  ]);
  if (currentUser?.id !== requestedUserId) return;
  activeClientLoaded = true;
  if (clients.error) { activeClients = []; activeClientError = 'Daftar client belum dapat dimuat: ' + clients.error.message; }
  else activeClients = clients.data || [];
  picAliases = aliases.data || [];
  if (isAdmin()) {
    const stats = await client.from('marketing_pic_visits').select('client_id,owner_id,created_at').order('created_at', { ascending: false }).limit(5000);
    if (currentUser?.id !== requestedUserId) return;
    visitStats = stats.data || [];
  } else visitStats = [];
  renderActiveClients();
  publishActiveClients();
}
function fillSelect(sel, label, values, keep) {
  const el = $(sel);
  el.innerHTML = `<option value="all">${label}</option>` + values.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
  el.value = values.includes(keep) ? keep : 'all';
}
// Nomor HP -> tautan WhatsApp (wa.me). Satu isian boleh memuat beberapa nomor dipisah "/", "," atau ";".
function waLinks(raw) {
  const parts = String(raw ?? '').split(/[\/;,]/).map((part) => part.trim()).filter(Boolean);
  return parts.map((part) => {
    let digits = part.replace(/\D/g, '');
    if (digits.startsWith('0')) digits = '62' + digits.slice(1);
    else if (digits.startsWith('8')) digits = '62' + digits;
    if (!/^62\d{8,13}$/.test(digits)) return esc(part);
    return `<a href="https://wa.me/${digits}" target="_blank" rel="noopener noreferrer" title="Chat WhatsApp ${esc(part)}">${esc(part)}</a>`;
  }).join('<br>');
}
const visitedIds = () => new Set(visitStats.map((v) => v.client_id));
function filteredClients() {
  const q = $('#ac-search').value.trim().toLocaleLowerCase('id');
  const branch = $('#ac-branch').value, cat = $('#ac-category').value, pic = $('#ac-pic').value, contract = $('#ac-contract').value;
  const statusFilter = isAdmin() ? $('#ac-status-filter').value : 'aktif';
  const never = isAdmin() && $('#ac-visited').value === 'never';
  const seen = visitedIds();
  return activeClients.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (q && ![r.nama_client, r.pic_user, r.cabang, r.korlap_raw, r.admin_raw].some((v) => (v || '').toLocaleLowerCase('id').includes(q))) return false;
    if (branch !== 'all' && r.cabang !== branch) return false;
    if (cat !== 'all' && r.kategori !== cat) return false;
    if (pic !== 'all' && !picTokens(r).includes(pic)) return false;
    const left = daysLeft(r);
    if (contract === 'none' && r.kontrak_akhir) return false;
    if (contract === '30' && !(left !== null && left >= 0 && left <= 30)) return false;
    if (contract === '90' && !(left !== null && left >= 0 && left <= 90)) return false;
    if (contract === 'expired' && !(left !== null && left < 0)) return false;
    if (never && seen.has(r.id)) return false;
    return true;
  });
}
function renderActiveClients() {
  const rows = activeClients;
  const admin = isAdmin();
  const live = rows.filter((r) => r.status === 'aktif');
  $('#ac-scope').textContent = !activeClientLoaded ? 'Memuat daftar client…' : admin
    ? 'Akun admin: menampilkan dan dapat mengubah semua client perusahaan.'
    : 'Menampilkan client aktif yang PIC Korlap atau PIC Admin-nya adalah akun ini.';
  for (const id of ['#ac-add', '#ac-alias-toggle', '#ac-history-toggle', '#ac-export']) $(id).hidden = !admin;
  for (const id of ['#ac-status-wrap', '#ac-visited-wrap']) $(id).hidden = !admin;
  $('#ac-dashboard').hidden = !admin;
  if (!admin) { $('#ac-alias-card').hidden = true; $('#ac-history-card').hidden = true; }
  const uniq = (fn) => [...new Set(rows.map(fn).filter(Boolean))].sort();
  fillSelect('#ac-branch', 'Semua cabang', uniq((r) => r.cabang), $('#ac-branch').value);
  fillSelect('#ac-category', 'Semua kategori', uniq((r) => r.kategori), $('#ac-category').value);
  fillSelect('#ac-pic', 'Semua PIC', [...new Set(rows.flatMap(picTokens))].sort(), $('#ac-pic').value);
  $('#ac-branches').innerHTML = uniq((r) => r.cabang).map((v) => `<option value="${esc(v)}">`).join('');
  const visible = filteredClients();
  const soon = live.filter((r) => { const l = daysLeft(r); return l !== null && l >= 0 && l <= 90; }).length;
  $('#ac-summary').innerHTML = `<div><strong>${live.length}</strong><small>Client aktif</small></div><div><strong>${live.filter((r) => r.kategori === 'PEMERINTAHAN').length}</strong><small>Pemerintahan</small></div><div><strong>${live.filter((r) => r.kategori === 'SWASTA').length}</strong><small>Swasta</small></div><div><strong>${soon}</strong><small>Kontrak ≤ 90 hari</small></div>${admin ? `<div><strong>${rows.length - live.length}</strong><small>Diarsipkan</small></div>` : ''}`;
  $('#ac-status').textContent = activeClientError || (activeClientLoaded ? `Menampilkan ${visible.length} dari ${rows.length} client.` : '');
  $('#ac-status').classList.toggle('error', !!activeClientError);
  const maps = (r) => (/^https?:\/\//i.test(r.google_maps || '') ? r.google_maps : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(r.google_maps || r.nama_client));
  const head = ['No', 'Nama client', 'Cabang', 'Kategori', 'PIC user', 'No. HP', 'PIC Korlap', 'PIC Admin', 'Masa kontrak', 'Google Maps', 'Aksi'];
  $('#ac-table').innerHTML = `<thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${visible.length ? visible.map((r) => `<tr class="${r.status === 'arsip' ? 'ac-archived' : ''}">
    <td class="num">${esc(r.source_no)}</td><td><strong>${esc(r.nama_client)}</strong>${r.status === 'arsip' ? `<br><span class="badge error">Arsip</span> <small>${esc(r.archive_reason)}</small>` : ''}</td><td>${esc(r.cabang)}</td><td>${esc(r.kategori)}</td><td>${esc(r.pic_user)}</td><td>${waLinks(r.nomor_hp)}</td>
    <td>${esc(r.korlap_raw)}</td><td>${esc(r.admin_raw)}</td><td>${contractCell(r)}</td>
    <td>${r.google_maps ? `<a href="${esc(maps(r))}" target="_blank" rel="noopener noreferrer">${esc(/^https?:\/\//i.test(r.google_maps) ? 'Buka link' : r.google_maps)}</a>` : `<a href="${esc(maps(r))}" target="_blank" rel="noopener noreferrer"><small>Cari di Maps</small></a>`}</td>
    <td class="act">${admin ? `<button type="button" data-ac-edit="${esc(r.id)}">Ubah</button><button type="button" data-ac-archive="${esc(r.id)}">${r.status === 'arsip' ? 'Aktifkan lagi' : 'Arsipkan'}</button>` : ''}${r.status === 'aktif' ? `<button type="button" data-ac-visit="${esc(r.id)}">Catat Visit</button><button type="button" data-ac-offer="${esc(r.id)}">Penawaran</button>` : ''}</td></tr>`).join('')
    : `<tr><td colspan="${head.length}" class="hint">${activeClientLoaded ? 'Belum ada client yang cocok. Jika akun ini seharusnya punya client, hubungi admin untuk memeriksa pemetaan PIC.' : ''}</td></tr>`}</tbody>`;
  if (admin) { renderAliasTable(); renderDashboard(live); }
}
function renderDashboard(live) {
  const seen = visitedIds();
  const since = Date.now() - 30 * 86400000;
  const recent = visitStats.filter((v) => new Date(v.created_at).getTime() >= since);
  const never = live.filter((r) => !seen.has(r.id)).length;
  const noDate = live.filter((r) => !r.kontrak_akhir).length;
  $('#ac-dash-note').textContent = `· ${never} client belum pernah dikunjungi · ${recent.length} kunjungan 30 hari terakhir`;
  const korlaps = picAliases.filter((a) => a.pic_role === 'korlap').map((a) => {
    const mine = live.filter((r) => korlapTokens(r).includes(a.alias));
    const ids = new Set(mine.map((r) => r.id));
    const member = memberOptions.find((m) => m.user_id === a.user_id);
    return { alias: a.alias, member: member?.display_name || '(belum punya akun)', total: mine.length, visited: mine.filter((r) => seen.has(r.id)).length, month: recent.filter((v) => ids.has(v.client_id)).length };
  }).filter((k) => k.total).sort((a, b) => (b.total - b.visited) - (a.total - a.visited));
  $('#ac-dash-body').innerHTML = `<div class="progress-summary"><div><strong>${never}</strong><small>Belum pernah dikunjungi</small></div><div><strong>${recent.length}</strong><small>Kunjungan 30 hari</small></div><div><strong>${noDate}</strong><small>Tanggal kontrak belum diisi</small></div></div>
    <div class="table-wrap"><table><thead><tr><th>PIC Korlap</th><th>Akun</th><th>Client</th><th>Sudah dikunjungi</th><th>Belum</th><th>Kunjungan 30 hari</th></tr></thead><tbody>${korlaps.map((k) => `<tr><td><strong>${esc(k.alias)}</strong></td><td>${esc(k.member)}</td><td>${k.total}</td><td>${k.visited}</td><td>${k.total - k.visited}</td><td>${k.month}</td></tr>`).join('')}</tbody></table></div>
    <p class="hint">Dihitung dari Kunjungan PIC yang tercatat di portal sejak fitur ini aktif; kunjungan sebelumnya tidak ikut terhitung.</p>`;
}
function renderAliasTable() {
  const count = (alias, role) => activeClients.filter((r) => r.status === 'aktif' && picTokens({ [role + '_raw']: r[role + '_raw'] }).includes(alias)).length;
  const opts = (sel) => `<option value="">(belum punya akun)</option>` + memberOptions.map((m) => `<option value="${esc(m.user_id)}" ${m.user_id === sel ? 'selected' : ''}>${esc(m.display_name)}</option>`).join('');
  $('#ac-alias-table').innerHTML = `<thead><tr><th>PIC</th><th>Peran</th><th>Jumlah client aktif</th><th>Akun portal</th></tr></thead><tbody>${picAliases.map((a) => `<tr><td><strong>${esc(a.alias)}</strong></td><td>${a.pic_role === 'korlap' ? 'Korlap' : 'Admin'}</td><td>${count(a.alias, a.pic_role)}</td><td><select data-alias="${esc(a.alias)}" data-role="${esc(a.pic_role)}">${opts(a.user_id)}</select></td></tr>`).join('')}</tbody>`;
}
async function loadChangeLog() {
  $('#ac-history-table').innerHTML = '<tbody><tr><td class="hint">Memuat…</td></tr></tbody>';
  const { data, error } = await client.from('marketing_client_changes').select('*').order('changed_at', { ascending: false }).limit(300);
  if (error) { $('#ac-history-table').innerHTML = `<tbody><tr><td class="hint">Riwayat belum dapat dimuat: ${esc(error.message)}</td></tr></tbody>`; return; }
  changeLog = data || [];
  const who = (id) => memberOptions.find((m) => m.user_id === id)?.display_name || (id === currentUser?.id ? 'Anda' : '—');
  const nameOf = (c) => activeClients.find((r) => r.id === c.client_id)?.nama_client || c.after?.nama_client || c.before?.nama_client || '';
  const labels = { nama_client: 'Nama', cabang: 'Cabang', kategori: 'Kategori', pic_user: 'PIC user', nomor_hp: 'No. HP', google_maps: 'Maps', masa_kontrak: 'Catatan kontrak', kontrak_mulai: 'Mulai kontrak', kontrak_akhir: 'Akhir kontrak', korlap: 'Korlap', admin: 'Admin', status: 'Status', display_name: 'Nama staf' };
  const show = (v) => Array.isArray(v) ? v.join(', ') || '-' : (v === null || v === undefined || v === '' ? '-' : String(v));
  const diff = (c) => {
    if (c.action === 'alias') return `PIC ${c.after?.alias} (${c.after?.role}) → ${memberOptions.find((m) => m.user_id === c.after?.user_id)?.display_name || 'belum punya akun'}`;
    if (c.action === 'create') return 'Client baru ditambahkan';
    if (c.action === 'status') return `Status: ${show(c.before?.status)} → ${show(c.after?.status)}${c.after?.alasan ? ` (${c.after.alasan})` : ''}`;
    const out = Object.keys(labels).filter((k) => k in (c.after || {}) && show(c.before?.[k]) !== show(c.after?.[k])).map((k) => `${labels[k]}: ${show(c.before?.[k])} → ${show(c.after?.[k])}`);
    return out.join('; ') || 'Tanpa perubahan isi';
  };
  const act = { create: 'Tambah', update: 'Ubah', alias: 'Pemetaan PIC', status: 'Status', member_name: 'Nama staf' };
  $('#ac-history-table').innerHTML = `<thead><tr><th>Waktu</th><th>Oleh</th><th>Jenis</th><th>Client</th><th>Perubahan</th></tr></thead><tbody>${changeLog.length ? changeLog.map((c) => `<tr><td>${esc(new Date(c.changed_at).toLocaleString('id-ID'))}</td><td>${esc(who(c.changed_by))}</td><td>${esc(act[c.action] || c.action)}</td><td>${esc(nameOf(c))}</td><td>${esc(diff(c))}</td></tr>`).join('') : '<tr><td colspan="5" class="hint">Belum ada perubahan.</td></tr>'}</tbody>`;
}
function openClientForm(row) {
  editingClient = row || null;
  $('#ac-form-title').textContent = row ? `Ubah client #${row.source_no}` : 'Tambah client';
  $('#ac-f-nama').value = row?.nama_client || ''; $('#ac-f-cabang').value = row?.cabang || '';
  $('#ac-f-kategori').value = row?.kategori || ''; $('#ac-f-picuser').value = row?.pic_user || '';
  $('#ac-f-hp').value = row?.nomor_hp || ''; $('#ac-f-kontrak').value = row?.masa_kontrak || ''; $('#ac-f-maps').value = row?.google_maps || '';
  $('#ac-f-mulai').value = row?.kontrak_mulai || ''; $('#ac-f-akhir').value = row?.kontrak_akhir || '';
  const has = (raw, alias) => picTokens({ korlap_raw: raw }).includes(alias);
  for (const role of ['korlap', 'admin']) {
    $('#ac-f-' + role).innerHTML = picAliases.filter((a) => a.pic_role === role).map((a) => `<label><input type="checkbox" value="${esc(a.alias)}" ${row && has(row[role + '_raw'], a.alias) ? 'checked' : ''}>${esc(a.alias)}</label>`).join('') || '<small>Belum ada PIC. Tambahkan lewat Pemetaan PIC.</small>';
  }
  status('#ac-form-status', ''); $('#ac-form-save').disabled = false;
  $('#ac-dialog').showModal();
}
async function saveClientForm(event) {
  event.preventDefault();
  if (!$('#ac-f-nama').value.trim()) { status('#ac-form-status', 'Nama client wajib diisi.', true); return; }
  if ($('#ac-f-mulai').value && $('#ac-f-akhir').value && $('#ac-f-akhir').value < $('#ac-f-mulai').value) { status('#ac-form-status', 'Tanggal berakhir tidak boleh sebelum tanggal mulai.', true); return; }
  const checked = (role) => [...document.querySelectorAll(`#ac-f-${role} input:checked`)].map((i) => i.value);
  const payload = { id: editingClient?.id || null, expected_updated_at: editingClient?.updated_at, nama_client: $('#ac-f-nama').value, cabang: $('#ac-f-cabang').value,
    kategori: $('#ac-f-kategori').value, pic_user: $('#ac-f-picuser').value, nomor_hp: $('#ac-f-hp').value, masa_kontrak: $('#ac-f-kontrak').value,
    kontrak_mulai: $('#ac-f-mulai').value, kontrak_akhir: $('#ac-f-akhir').value,
    google_maps: $('#ac-f-maps').value, korlap: checked('korlap'), admin: checked('admin') };
  $('#ac-form-save').disabled = true; status('#ac-form-status', 'Menyimpan…');
  const { error } = await client.rpc('marketing_save_client', { p: payload });
  if (error) { $('#ac-form-save').disabled = false; status('#ac-form-status', error.message, true); return; }
  $('#ac-dialog').close();
  await loadActiveClients();
  status('#ac-status', editingClient ? 'Perubahan client tersimpan.' : 'Client baru tersimpan.');
}
let xlsxLoading = null;
function loadXlsx() {
  if (window.XLSX) return Promise.resolve();
  xlsxLoading ||= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'vendor/xlsx-0.18.5.full.min.js';
    script.onload = resolve;
    script.onerror = () => { xlsxLoading = null; reject(new Error('Pustaka Excel gagal dimuat')); };
    document.head.appendChild(script);
  });
  return xlsxLoading;
}
async function exportClients() {
  const rows = filteredClients();
  if (!rows.length) { status('#ac-status', 'Tidak ada baris untuk diekspor.', true); return; }
  try { await loadXlsx(); } catch (error) { status('#ac-status', error.message, true); return; }
  const data = rows.map((r) => ({ 'No': r.source_no, 'Nama Client': r.nama_client, 'Cabang': r.cabang, 'Kategori': r.kategori, 'PIC User': r.pic_user, 'Nomor HP': r.nomor_hp,
    'PIC Korlap': r.korlap_raw, 'PIC Admin': r.admin_raw, 'Kontrak Mulai': r.kontrak_mulai || '', 'Kontrak Berakhir': r.kontrak_akhir || '', 'Catatan Kontrak': r.masa_kontrak,
    'Google Maps': r.google_maps, 'Status': r.status, 'Alasan Arsip': r.archive_reason }));
  const sheet = window.XLSX.utils.json_to_sheet(data);
  sheet['!cols'] = [6, 44, 12, 14, 24, 22, 16, 14, 14, 16, 26, 36, 8, 28].map((wch) => ({ wch }));
  const book = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(book, sheet, 'Client Active');
  window.XLSX.writeFile(book, `client-active-${todayIso()}.xlsx`);
  status('#ac-status', `${rows.length} baris diekspor.`);
}
['#ac-search', '#ac-branch', '#ac-category', '#ac-pic', '#ac-contract', '#ac-status-filter', '#ac-visited'].forEach((sel) => $(sel).addEventListener('input', renderActiveClients));
$('#ac-refresh').addEventListener('click', loadActiveClients);
$('#ac-add').addEventListener('click', () => openClientForm(null));
$('#ac-export').addEventListener('click', exportClients);
$('#ac-alias-toggle').addEventListener('click', () => { $('#ac-alias-card').hidden = !$('#ac-alias-card').hidden; });
$('#ac-history-toggle').addEventListener('click', () => { $('#ac-history-card').hidden = !$('#ac-history-card').hidden; if (!$('#ac-history-card').hidden) loadChangeLog(); });
$('#ac-form').addEventListener('submit', saveClientForm);
$('#ac-form-cancel').addEventListener('click', () => $('#ac-dialog').close());
$('#ac-table').addEventListener('click', async (event) => {
  const edit = event.target.closest('[data-ac-edit]');
  if (edit) { const row = activeClients.find((r) => r.id === edit.dataset.acEdit); if (row) openClientForm(row); return; }
  const archive = event.target.closest('[data-ac-archive]');
  if (archive) {
    const row = activeClients.find((r) => r.id === archive.dataset.acArchive);
    if (!row) return;
    let reason = '';
    if (row.status === 'aktif') {
      reason = window.prompt(`Arsipkan "${row.nama_client}"?\nClient tidak akan terlihat oleh staf dan tidak bisa dicatat kunjungannya. Data dan riwayat tetap tersimpan.\n\nAlasan pengarsipan:`, 'Kontrak berakhir');
      if (reason === null) return;
      if (!reason.trim()) { status('#ac-status', 'Alasan pengarsipan wajib diisi.', true); return; }
    } else if (!window.confirm(`Aktifkan kembali "${row.nama_client}"?`)) return;
    const { error } = await client.rpc('marketing_set_client_status', { p_id: row.id, p_status: row.status === 'aktif' ? 'arsip' : 'aktif', p_reason: reason });
    if (error) { status('#ac-status', error.message, true); return; }
    await loadActiveClients();
    status('#ac-status', row.status === 'aktif' ? 'Client diarsipkan.' : 'Client diaktifkan kembali.');
    return;
  }
  const visit = event.target.closest('[data-ac-visit]');
  if (visit) window.marketingPicVisit?.open(visit.dataset.acVisit);
  const offer = event.target.closest('[data-ac-offer]');
  if (offer) window.marketingOffers?.open(offer.dataset.acOffer);
});
$('#ac-alias-table').addEventListener('change', async (event) => {
  const sel = event.target.closest('select[data-alias]');
  if (!sel) return;
  const { error } = await client.rpc('marketing_set_pic_alias', { p_alias: sel.dataset.alias, p_role: sel.dataset.role, p_user_id: sel.value || null });
  status('#ac-alias-status', error ? error.message : `Pemetaan ${sel.dataset.alias} tersimpan.`, !!error);
  if (!error) await loadActiveClients();
});
$('#ac-alias-new').addEventListener('submit', async (event) => {
  event.preventDefault();
  const { error } = await client.rpc('marketing_set_pic_alias', { p_alias: $('#ac-alias-name').value, p_role: $('#ac-alias-role').value, p_user_id: null, p_note: 'ditambah admin' });
  status('#ac-alias-status', error ? error.message : 'PIC baru ditambahkan.', !!error);
  if (!error) { $('#ac-alias-name').value = ''; await loadActiveClients(); }
});

// Daftar harga seragam & peralatan. Admin membaca tabel (harga beli + jual); staf membaca view yang hanya memuat harga jual.
let priceRows = [];
let priceView = 'target';
let priceLoaded = false;
let priceError = '';
let editingPrice = null;
const rupiah = (value) => value === null || value === undefined ? '' : 'Rp ' + Number(value).toLocaleString('id-ID');
async function loadPrices() {
  if (!client || !currentUser || !currentMember) return;
  const requestedUserId = currentUser.id;
  const source = isAdmin() ? 'marketing_price_items' : 'marketing_price_list';
  let query = client.from(source).select('*').order('kategori').order('no').limit(1000);
  if (isAdmin()) query = query.order('no');
  const { data, error } = await query;
  if (currentUser?.id !== requestedUserId) return;
  priceLoaded = true;
  priceError = error ? 'Daftar harga belum dapat dimuat: ' + error.message : '';
  priceRows = error ? [] : data || [];
  renderPrices();
  renderSimTable();
}
function showDbView(view) {
  priceView = view;
  document.querySelectorAll('[data-db-view]').forEach((b) => b.classList.toggle('active', b.dataset.dbView === view));
  $('#db-target').hidden = view !== 'target';
  $('#db-price').hidden = view === 'target';
  if (view !== 'target') { if (!priceLoaded) loadPrices(); renderPrices(); }
}
function renderPrices() {
  if (priceView === 'target') return;
  const admin = isAdmin();
  const kategori = priceView;
  const q = $('#price-query').value.trim().toLocaleLowerCase('id');
  const all = priceRows.filter((r) => r.kategori === kategori);
  const rows = all.filter((r) => (admin || r.active !== false) && (!q || [r.item, r.grup].some((v) => (v || '').toLocaleLowerCase('id').includes(q))));
  $('#price-title').textContent = kategori === 'seragam' ? 'Harga Seragam' : 'Harga Peralatan dan Perlengkapan Kerja';
  $('#price-scope').textContent = !priceLoaded ? 'Memuat…' : admin
    ? 'Akun admin: harga beli, harga jual, dan margin terlihat; hanya admin yang dapat mengubah.' : 'Menampilkan harga jual. Item bertanda "diverifikasi" sedang diperiksa admin; tanyakan harganya ke admin.';
  $('#price-add').hidden = !admin; $('#price-export').hidden = !admin;
  const flagged = all.filter((r) => r.perlu_verifikasi).length;
  const margins = admin ? all.filter((r) => r.active !== false && r.harga_beli > 0).map((r) => (r.harga_jual - r.harga_beli) / r.harga_beli) : [];
  $('#price-summary').innerHTML = `<div><strong>${all.filter((r) => r.active !== false).length}</strong><small>Item</small></div><div><strong>${flagged}</strong><small>Perlu diverifikasi</small></div>${admin && margins.length ? `<div><strong>${Math.round(margins.reduce((a, b) => a + b, 0) / margins.length * 100)}%</strong><small>Rata-rata margin</small></div>` : ''}`;
  $('#price-status').textContent = priceError || (priceLoaded ? `Menampilkan ${rows.length} dari ${all.length} item.` : '');
  $('#price-status').classList.toggle('error', !!priceError);
  $('#price-groups').innerHTML = [...new Set(all.map((r) => r.grup).filter(Boolean))].map((g) => `<option value="${esc(g)}">`).join('');
  const head = admin ? ['No', 'Item', ...(kategori === 'seragam' ? ['Kenaikan'] : []), 'Harga beli', 'Harga jual', 'Margin', 'Status', 'Aksi'] : ['No', 'Item', 'Harga jual'];
  const moneyCols = new Set(['Kenaikan', 'Harga beli', 'Harga jual', 'Margin']);
  let lastGroup = null;
  const body = rows.map((r) => {
    const groupRow = kategori === 'seragam' && r.grup !== lastGroup ? `<tr class="group-row"><td colspan="${head.length}">${esc(r.grup)}</td></tr>` : '';
    lastGroup = r.grup;
    const flag = r.perlu_verifikasi ? '<span class="badge processing">Perlu diverifikasi</span>' : '<span class="badge">OK</span>';
    const margin = admin ? `${rupiah(r.harga_jual - r.harga_beli)}<br><small>${r.harga_beli ? Math.round((r.harga_jual - r.harga_beli) / r.harga_beli * 100) + '%' : '-'}</small>` : '';
    const cells = admin
      ? `<td class="num">${esc(r.no)}</td><td><strong>${esc(r.item)}</strong>${r.catatan ? `<br><small>${esc(r.catatan)}</small>` : ''}${r.active === false ? ' <span class="badge error">Disembunyikan</span>' : ''}</td>${kategori === 'seragam' ? `<td class="money">${r.kenaikan ? '+' + Number(r.kenaikan).toLocaleString('id-ID') : '-'}</td>` : ''}<td class="money">${rupiah(r.harga_beli)}</td><td class="money"><strong>${rupiah(r.harga_jual)}</strong></td><td class="money">${margin}</td><td>${flag}</td><td class="act"><button type="button" data-price-edit="${esc(r.id)}">Ubah</button></td>`
      : `<td class="num">${esc(r.no)}</td><td><strong>${esc(r.item)}</strong></td><td class="money">${r.harga_jual === null ? '<span class="badge processing">Sedang diverifikasi</span>' : `<strong>${rupiah(r.harga_jual)}</strong>`}</td>`;
    return groupRow + `<tr>${cells}</tr>`;
  }).join('');
  $('#price-table').innerHTML = `<thead><tr>${head.map((h) => `<th class="${moneyCols.has(h) ? 'money' : ''}">${h}</th>`).join('')}</tr></thead><tbody>${body || `<tr><td colspan="${head.length}" class="hint">${priceLoaded ? 'Belum ada item yang cocok.' : ''}</td></tr>`}</tbody>`;
}
function openPriceForm(row) {
  editingPrice = row || null;
  $('#price-form-title').textContent = row ? `Ubah item #${row.no}` : `Tambah item ${priceView}`;
  $('#price-f-item').value = row?.item || ''; $('#price-f-grup').value = row?.grup || (priceView === 'peralatan' ? 'Peralatan dan Perlengkapan Kerja' : '');
  $('#price-f-beli').value = row?.harga_beli ?? ''; $('#price-f-jual').value = row?.harga_jual ?? '';
  $('#price-f-verif').checked = !!row?.perlu_verifikasi; $('#price-f-catatan').value = row?.catatan || ''; $('#price-f-active').checked = row ? row.active !== false : true;
  status('#price-form-status', ''); $('#price-form-save').disabled = false;
  $('#price-dialog').showModal();
}
async function savePriceForm(event) {
  event.preventDefault();
  const beli = $('#price-f-beli').value, jual = $('#price-f-jual').value;
  if (!$('#price-f-item').value.trim() || beli === '' || jual === '') { status('#price-form-status', 'Nama item, harga beli, dan harga jual wajib diisi.', true); return; }
  const payload = { id: editingPrice?.id || null, kategori: priceView, expected_updated_at: editingPrice?.updated_at, item: $('#price-f-item').value, grup: $('#price-f-grup').value,
    harga_beli: Number(beli), harga_jual: Number(jual), perlu_verifikasi: $('#price-f-verif').checked, catatan: $('#price-f-catatan').value, active: $('#price-f-active').checked };
  $('#price-form-save').disabled = true; status('#price-form-status', 'Menyimpan…');
  const { error } = await client.rpc('marketing_save_price_item', { p: payload });
  if (error) { $('#price-form-save').disabled = false; status('#price-form-status', error.message, true); return; }
  $('#price-dialog').close();
  await loadPrices();
  status('#price-status', 'Perubahan harga tersimpan.');
}
async function exportPrices() {
  const rows = priceRows.filter((r) => r.kategori === priceView);
  try { await loadXlsx(); } catch (error) { status('#price-status', error.message, true); return; }
  const data = rows.map((r) => ({ 'No': r.no, 'Kelompok': r.grup, 'Item': r.item, 'Harga Beli': r.harga_beli, 'Harga Jual': r.harga_jual, 'Margin (Rp)': r.harga_jual - r.harga_beli,
    'Margin (%)': r.harga_beli ? Math.round((r.harga_jual - r.harga_beli) / r.harga_beli * 1000) / 10 : '', 'Perlu Diverifikasi': r.perlu_verifikasi ? 'ya' : '', 'Catatan': r.catatan }));
  const sheet = window.XLSX.utils.json_to_sheet(data);
  sheet['!cols'] = [6, 28, 48, 14, 14, 14, 12, 18, 50].map((wch) => ({ wch }));
  const book = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(book, sheet, priceView === 'seragam' ? 'Harga Seragam' : 'Harga Peralatan');
  window.XLSX.writeFile(book, `harga-${priceView}-${todayIso()}.xlsx`);
  status('#price-status', `${rows.length} item diekspor.`);
}
document.querySelectorAll('[data-db-view]').forEach((b) => b.addEventListener('click', () => showDbView(b.dataset.dbView)));
$('#price-query').addEventListener('input', renderPrices);
$('#price-refresh').addEventListener('click', loadPrices);
$('#price-add').addEventListener('click', () => openPriceForm(null));
$('#price-export').addEventListener('click', exportPrices);
$('#price-form').addEventListener('submit', savePriceForm);
$('#price-form-cancel').addEventListener('click', () => $('#price-dialog').close());
$('#price-table').addEventListener('click', (event) => {
  const edit = event.target.closest('[data-price-edit]');
  if (edit) { const row = priceRows.find((r) => r.id === edit.dataset.priceEdit); if (row) openPriceForm(row); }
});

// Simulasi Harga Seragam & Peralatan: hitung estimasi belanja, tidak mengubah data mana pun.
let simView = 'seragam';
const simSelections = { seragam: new Map(), peralatan: new Map() }; // itemId -> jumlah, hanya ada bila dicentang
function renderSimTable() {
  const all = priceRows.filter((r) => r.kategori === simView && r.active !== false);
  const q = $('#sim-query').value.trim().toLocaleLowerCase('id');
  const rows = all.filter((r) => !q || [r.item, r.grup].some((v) => (v || '').toLocaleLowerCase('id').includes(q)));
  $('#sim-title').textContent = simView === 'seragam' ? 'Simulasi Harga Seragam' : 'Simulasi Harga Peralatan';
  const selected = simSelections[simView];
  let totalItem = 0; let totalRp = 0;
  for (const r of all) {
    if (!selected.has(r.id)) continue;
    totalItem += 1;
    if (r.harga_jual !== null) totalRp += Number(r.harga_jual) * Number(selected.get(r.id) || 0);
  }
  $('#sim-summary').innerHTML = `<div><strong>${totalItem}</strong><small>Item dipilih</small></div><div><strong>${rupiah(totalRp)}</strong><small>Total estimasi</small></div>`;
  $('#sim-status').textContent = priceLoaded ? `Menampilkan ${rows.length} dari ${all.length} item.` : 'Memuat…';
  let lastGroup = null;
  const body = rows.map((r) => {
    const groupRow = simView === 'seragam' && r.grup !== lastGroup ? `<tr class="group-row"><td colspan="6">${esc(r.grup)}</td></tr>` : '';
    lastGroup = r.grup;
    const checked = selected.has(r.id);
    const qty = selected.get(r.id) || 1;
    const unavailable = r.harga_jual === null;
    const subtotal = unavailable ? '<span class="badge processing">Sedang diverifikasi</span>' : rupiah(Number(r.harga_jual) * Number(qty));
    const dis = unavailable ? 'disabled' : '';
    const stepper = `<div class="qty-stepper"><button type="button" class="qty-dec" data-sim-qty-dec="${esc(r.id)}" ${dis} aria-label="Kurangi">−</button><input type="number" min="1" max="100000" step="1" inputmode="numeric" value="${esc(qty)}" data-sim-qty="${esc(r.id)}" ${dis}><button type="button" class="qty-inc" data-sim-qty-inc="${esc(r.id)}" ${dis} aria-label="Tambah">+</button></div>`;
    return groupRow + `<tr class="${checked ? 'sim-selected' : ''}"><td class="check"><input type="checkbox" data-sim-check="${esc(r.id)}" ${checked ? 'checked' : ''} ${dis}></td><td class="num">${esc(r.no)}</td><td class="name">${esc(r.item)}</td><td class="qty" data-label="Jumlah">${stepper}</td><td class="money price" data-label="Harga jual">${unavailable ? '<span class="badge processing">Sedang diverifikasi</span>' : rupiah(r.harga_jual)}</td><td class="money subtotal" data-label="Subtotal">${subtotal}</td></tr>`;
  }).join('');
  $('#sim-table').innerHTML = `<thead><tr><th>Pilih</th><th>No</th><th>Item</th><th>Jumlah</th><th class="money">Harga jual</th><th class="money">Subtotal</th></tr></thead><tbody>${body || `<tr><td colspan="6" class="hint">${priceLoaded ? 'Belum ada item yang cocok.' : ''}</td></tr>`}</tbody>`;
}
function showSimView(view) {
  simView = view;
  document.querySelectorAll('[data-sim-view]').forEach((b) => b.classList.toggle('active', b.dataset.simView === view));
  if (!priceLoaded) loadPrices(); else renderSimTable();
}
document.querySelectorAll('[data-sim-view]').forEach((b) => b.addEventListener('click', () => showSimView(b.dataset.simView)));
$('#sim-query').addEventListener('input', renderSimTable);
$('#sim-refresh').addEventListener('click', loadPrices);
function setSimQty(id, qty) {
  const selected = simSelections[simView];
  const clamped = Math.max(1, Math.min(100000, Number(qty) || 1));
  if (selected.has(id)) selected.set(id, clamped);
  renderSimTable();
}
$('#sim-table').addEventListener('change', (event) => {
  const check = event.target.closest('[data-sim-check]');
  const qtyInput = event.target.closest('[data-sim-qty]');
  const selected = simSelections[simView];
  if (check) {
    const id = check.dataset.simCheck;
    if (check.checked) selected.set(id, Number($(`[data-sim-qty="${id}"]`)?.value) || 1); else selected.delete(id);
    renderSimTable();
  } else if (qtyInput) {
    setSimQty(qtyInput.dataset.simQty, qtyInput.value);
  }
});
$('#sim-table').addEventListener('click', (event) => {
  const dec = event.target.closest('[data-sim-qty-dec]');
  const inc = event.target.closest('[data-sim-qty-inc]');
  if (!dec && !inc) return;
  const id = (dec || inc).dataset.simQtyDec || (dec || inc).dataset.simQtyInc;
  const current = Number($(`[data-sim-qty="${id}"]`)?.value) || 1;
  const selected = simSelections[simView];
  if (!selected.has(id)) selected.set(id, current); // menekan stepper otomatis mencentang item
  const checkbox = $(`[data-sim-check="${id}"]`);
  if (checkbox) checkbox.checked = true;
  setSimQty(id, current + (inc ? 1 : -1));
});

// PIC Visit ke client aktif (data produksi, RLS: staf hanya miliknya, admin membaca semua).
let picVisitRows = [];
function publishActiveClients() {
  const clients = activeClients.filter((r) => r.status === 'aktif').map((r) => ({ id: r.id, name: r.nama_client, area: r.cabang, pic: r.pic_user, owner: `Korlap ${r.korlap_raw || '-'} · Admin ${r.admin_raw || '-'}`, kategori: r.kategori, kontrakAkhir: r.kontrak_akhir || '' }));
  window.dispatchEvent(new CustomEvent('marketing:clients-snapshot', { detail: { clients } }));
}
function publishPicVisits(error = '') {
  const visits = error ? [] : picVisitRows.map((r) => ({ id: r.id, clientId: r.client_id, visitStage: r.visit_stage, at: r.created_at, mine: r.owner_id === currentUser?.id, data: r.data, ...r.data }));
  window.dispatchEvent(new CustomEvent('marketing:picvisits-snapshot', { detail: { visits, error } }));
}
async function loadPicVisits() {
  if (!client || !currentUser) return;
  const requestedUserId = currentUser.id;
  const { data, error } = await client.from('marketing_pic_visits').select('*').order('created_at', { ascending: false }).limit(200);
  if (currentUser?.id !== requestedUserId) return;
  if (error) { picVisitRows = []; publishPicVisits('Kunjungan PIC belum dapat dimuat: ' + error.message); return; }
  picVisitRows = data || [];
  publishPicVisits();
}
function publishOffers(offers, events, error = '') {
  window.dispatchEvent(new CustomEvent('marketing:offers-snapshot', { detail: { offers, events, error } }));
}
async function loadClientOffers() {
  if (!client || !currentUser) return;
  const requestedUserId = currentUser.id;
  const [offers, events] = await Promise.all([
    client.from('marketing_client_offers').select('*').limit(2000),
    client.from('marketing_client_offer_events').select('*').order('created_at', { ascending: false }).limit(2000)
  ]);
  if (currentUser?.id !== requestedUserId) return;
  const failed = offers.error || events.error;
  publishOffers(failed ? [] : offers.data || [], failed ? [] : events.data || [], failed ? 'Monitoring belum dapat dimuat: ' + failed.message : '');
}
window.marketingApi = {
  async saveOffer({ clientId, stage, offerType, activityDate, note, next }) {
    if (!client || !currentUser) return { error: 'Belum login.' };
    const { error } = await client.rpc('marketing_record_client_offer', { p_client_id: clientId, p_stage: stage, p_offer_type: offerType, p_activity_date: activityDate, p_note: note, p_next_follow_up: next || null });
    if (error) return { error: error.message };
    await loadClientOffers();
    return { ok: true };
  },
  async savePicVisit({ id, clientId, visitStage, data }) {
    if (!client || !currentUser) return { error: 'Belum login.' };
    const query = id
      ? client.from('marketing_pic_visits').update({ visit_stage: visitStage, data, updated_at: new Date().toISOString() }).eq('id', id)
      : client.from('marketing_pic_visits').insert({ owner_id: currentUser.id, client_id: clientId, visit_stage: visitStage, data });
    const { data: saved, error } = await query.select('id,created_at').single();
    if (error) return { error: error.message };
    await loadPicVisits();
    return { id: saved.id, at: saved.created_at };
  }
};

async function loadVisits() {
  if (!client || !currentUser) return;
  const requestedUserId = currentUser.id;
  const { data, error } = await client.from('marketing_visits').select('*').order('created_at', { ascending: false }).limit(100);
  if (currentUser?.id !== requestedUserId) return;
  if (error) { $('#visit-list').textContent = 'Laporan belum dapat dibaca: ' + error.message; publishVisitSnapshot('Kunjungan Marketing belum dapat dimuat. Coba Muat ulang pada menu Kunjungan Marketing.'); return; }
  visitCache = data || [];
  publishVisitSnapshot();
  renderSavedVisits();
  $('#visit-list').innerHTML = visitCache.length ? visitCache.map((v) => `<div class="item"><strong>${esc(v.data?.nama_perusahaan)}</strong><small>${esc(date(v.data?.waktu_realisasi_kunjungan || v.created_at))} · ${esc(v.data?.nama_marketing || '')}</small><div><span class="badge ${v.data?.visit_stage === 'initial' ? 'processing' : ''}">${v.data?.visit_stage === 'initial' ? 'Tahap 1 · perlu detail' : 'Detail terisi'}</span> <span class="badge ${v.sheet_status === 'error' ? 'error' : v.sheet_status === 'synced' ? '' : 'processing'}">${v.sheet_status === 'synced' ? 'Masuk Sheet' : v.sheet_status === 'error' ? 'Sinkronisasi gagal' : 'Menunggu Sheet'}</span></div><small>Follow up: ${esc(v.data?.tanggal_follow_up || 'belum ditetapkan')}</small><p>${esc(v.data?.catatan || '')}</p>${v.sheet_error ? `<small class="error">${esc(v.sheet_error)}</small>` : ''}${v.photo_drive_url ? `<div><a href="${esc(v.photo_drive_url)}" target="_blank" rel="noopener noreferrer">Lihat foto</a></div>` : ''}${v.backup_drive_url ? `<div><a href="${esc(v.backup_drive_url)}" target="_blank" rel="noopener noreferrer">Cadangan data di Drive</a></div>` : v.backup_status === 'error' ? '<small class="error">Cadangan Drive gagal; coba sinkron lagi</small>' : ''}${v.owner_id === currentUser.id ? `<div class="item-actions"><button type="button" data-open-visit="${esc(v.id)}">${v.data?.visit_stage === 'initial' ? 'Lengkapi detail' : 'Buka / ubah'}</button>${v.sheet_status === 'error' || v.sheet_status === 'pending' || v.backup_status === 'error' ? `<button type="button" data-retry-visit="${esc(v.id)}">Coba sinkron lagi</button>` : ''}</div>` : ''}</div>`).join('') : '<p class="hint">Belum ada laporan kunjungan.</p>';
  const recentProcessing = visitCache.some((v) => v.sheet_status === 'processing' && Date.now() - new Date(v.updated_at).getTime() < 180000);
  if (recentProcessing && !visitPollTimer) visitPollTimer = setInterval(loadVisits, 5000);
  if (!recentProcessing && visitPollTimer) { clearInterval(visitPollTimer); visitPollTimer = null; }
}
$('#refresh-visits').addEventListener('click', loadVisits);
$('#refresh-activity-sales').addEventListener('click', loadVisits);
$('#refresh-new-activity-sales').addEventListener('click', loadVisits);
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

function addExpensePhotoRow() {
  const rows = $('#expense-photo-rows');
  if (rows.children.length >= 3) return;
  const row = document.createElement('div'); row.className = 'visit-service';
  row.innerHTML = '<label>Foto<input type="file" accept="image/*" capture="environment" data-expense-photo></label>' +
    (rows.children.length ? '<button type="button" data-remove-expense-photo aria-label="Hapus foto">Hapus</button>' : '');
  rows.appendChild(row);
  $('#add-expense-photo').hidden = rows.children.length >= 3;
}
$('#add-expense-photo').addEventListener('click', addExpensePhotoRow);
$('#expense-photo-rows').addEventListener('click', (event) => {
  if (!event.target.closest('[data-remove-expense-photo]')) return;
  event.target.closest('.visit-service').remove();
  $('#add-expense-photo').hidden = $('#expense-photo-rows').children.length >= 3;
});
const digitsOnly = (v) => String(v || '').replace(/\D/g, '');
const groupThousands = (v) => digitsOnly(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
$('#expense-amount').addEventListener('input', (event) => {
  const field = event.target;
  const digitsBeforeCursor = digitsOnly(field.value.slice(0, field.selectionStart)).length;
  field.value = groupThousands(field.value);
  let seen = 0, pos = field.value.length;
  for (let i = 0; i < field.value.length; i++) {
    if (/\d/.test(field.value[i])) seen++;
    if (seen === digitsBeforeCursor) { pos = i + 1; break; }
  }
  field.setSelectionRange(pos, pos);
});
function resetExpenseForm() {
  $('#expense-form').reset();
  $('#expense-photo-rows').replaceChildren();
  addExpensePhotoRow();
  $('#add-expense-photo').hidden = false;
  $('#expense-name').value = memberLabel(currentMember);
  $('#expense-date').value = localToday();
  $('#expense-timestamp').textContent = `Waktu laporan: ${date(new Date().toISOString())} (otomatis saat disimpan)`;
  status('#expense-status', '');
}
async function loadExpenses() {
  if (!client || !currentUser) return;
  const requestedUserId = currentUser.id;
  const { data, error } = await client.from('marketing_expenses').select('*').order('created_at', { ascending: false }).limit(200);
  if (currentUser?.id !== requestedUserId) return;
  if (error) { $('#expense-list').textContent = 'Laporan belum dapat dibaca: ' + error.message; return; }
  expenseCache = data || [];
  renderExpenseList();
}
function renderExpenseList() {
  $('#expense-list').innerHTML = expenseCache.length ? expenseCache.map((row) => `<div class="item"><strong>${esc(row.jenis_pengeluaran)} · ${rupiah(row.nominal)}</strong><small>${esc(row.tanggal_realisasi)}${isAdmin() ? ' · ' + esc(row.nama_marketing) : ''} · ${row.photo_paths?.length || 0} foto</small></div>`).join('')
    : '<p class="hint">Belum ada laporan pengeluaran.</p>';
}
$('#refresh-expenses').addEventListener('click', loadExpenses);
$('#expense-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!client || !currentUser) return;
  const tanggal = $('#expense-date').value;
  const jenis = $('#expense-type').value;
  const nominal = Number(digitsOnly($('#expense-amount').value));
  if (!tanggal || !jenis || !nominal || nominal <= 0) { status('#expense-status', 'Lengkapi tanggal, jenis pengeluaran, dan nominal.', true); return; }
  if (nominal > 1000000000) { status('#expense-status', 'Nominal maksimal Rp 1.000.000.000.', true); return; }
  const button = $('#save-expense'); button.disabled = true;
  status('#expense-status', 'Menyimpan laporan…');
  try {
    const { data, error } = await client.functions.invoke('marketing', { body: { action: 'save_expense',
      tanggal_realisasi: tanggal, jenis_pengeluaran: jenis, nominal } });
    if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Gagal menyimpan laporan');
    const expenseId = data.expense_id;
    const photoInputs = Array.from(document.querySelectorAll('[data-expense-photo]')).filter((input) => input.files?.[0]).slice(0, 3);
    let photoWarning = '';
    for (const input of photoInputs) {
      const photo = input.files[0];
      if (photo.size > 10 * 1024 * 1024) { photoWarning = 'Salah satu foto lebih dari 10 MB dan dilewati.'; continue; }
      const ext = (photo.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${currentUser.id}/${expenseId}/${crypto.randomUUID()}.${ext}`;
      const upload = await client.storage.from('marketing-expense-photos').upload(path, photo, { contentType: photo.type || 'image/jpeg' });
      if (upload.error) { photoWarning = 'Foto gagal diunggah: ' + upload.error.message; continue; }
      const linked = await client.functions.invoke('marketing', { body: { action: 'attach_expense_photo', expense_id: expenseId, photo_path: path } });
      if (linked.error || !linked.data?.ok) photoWarning = 'Foto gagal ditautkan: ' + (linked.data?.error || linked.error?.message);
    }
    resetExpenseForm();
    await loadExpenses();
    status('#expense-status', photoWarning ? 'Laporan tersimpan, tetapi ' + photoWarning : 'Laporan pengeluaran tersimpan.', !!photoWarning);
  } catch (e) { status('#expense-status', String(e.message || e), true); }
  finally { button.disabled = false; }
});
resetExpenseForm();

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

// Kabupaten/Kota -> Kecamatan (cascading) + auto-isi Provinsi. Cakupan data sebagian;
// area di luar daftar tetap bisa diisi manual (kecamatan & provinsi tidak dikunci).
// Autocomplete: ketik untuk mencari, hasil disortir (cocok di awal nama dulu, baru di tengah).
function createAutocomplete(input, listEl, getOptions) {
  let items = []; let activeIndex = -1;
  const pick = (name) => {
    input.value = name; listEl.hidden = true; input.setAttribute('aria-expanded', 'false');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const render = () => {
    const all = getOptions();
    const q = input.value.trim().toLocaleLowerCase('id');
    if (!q) { items = all.slice(0, 30); }
    else {
      const starts = []; const contains = [];
      for (const name of all) {
        const n = name.toLocaleLowerCase('id');
        if (n.startsWith(q)) starts.push(name); else if (n.includes(q)) contains.push(name);
      }
      starts.sort((a, b) => a.localeCompare(b, 'id')); contains.sort((a, b) => a.localeCompare(b, 'id'));
      items = [...starts, ...contains].slice(0, 30);
    }
    activeIndex = -1;
    listEl.innerHTML = items.length
      ? items.map((name, i) => `<li role="option" data-i="${i}">${esc(name)}</li>`).join('')
      : '<li class="ac-empty">Tidak ditemukan di daftar — tetap bisa diketik manual</li>';
    listEl.hidden = false; input.setAttribute('aria-expanded', 'true');
  };
  input.addEventListener('input', render);
  input.addEventListener('focus', render);
  input.addEventListener('keydown', (event) => {
    const lis = listEl.querySelectorAll('li[data-i]');
    if (event.key === 'ArrowDown') { if (listEl.hidden) { render(); return; } event.preventDefault(); activeIndex = Math.min(activeIndex + 1, lis.length - 1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0); }
    else if (event.key === 'Enter') { if (activeIndex >= 0 && items[activeIndex]) { event.preventDefault(); pick(items[activeIndex]); } return; }
    else if (event.key === 'Escape') { listEl.hidden = true; return; }
    else return;
    lis.forEach((li, i) => li.classList.toggle('active', i === activeIndex));
    lis[activeIndex]?.scrollIntoView({ block: 'nearest' });
  });
  listEl.addEventListener('mousedown', (event) => {
    const li = event.target.closest('li[data-i]');
    if (!li) return;
    event.preventDefault(); pick(items[Number(li.dataset.i)]);
  });
  input.addEventListener('blur', () => setTimeout(() => { listEl.hidden = true; input.setAttribute('aria-expanded', 'false'); }, 150));
}

const wilayahByKabupaten = new Map(WILAYAH_DATA.map((row) => [row.kabupaten.trim().toLocaleLowerCase('id'), row]));
const allKabupatenNames = WILAYAH_DATA.map((row) => row.kabupaten).sort((a, b) => a.localeCompare(b, 'id'));
let currentKecamatanPool = [];
createAutocomplete($('#kabupaten'), $('#kabupaten-options'), () => allKabupatenNames);
createAutocomplete($('#kecamatan'), $('#kecamatan-options'), () => currentKecamatanPool);
$('#kabupaten').addEventListener('input', () => {
  const match = wilayahByKabupaten.get($('#kabupaten').value.trim().toLocaleLowerCase('id'));
  currentKecamatanPool = match ? match.kecamatan : [];
  if (match) $('#provinsi').value = match.provinsi;
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
$('#offer-gaji').addEventListener('input', () => { offerRequestId = null; });
$('#offer-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('#offer-submit'); button.disabled = true;
  const leadId = $('#offer-lead').value; const umk = Number($('#offer-umk').value);
  const gajiText = $('#offer-gaji').value.trim(); const gaji = gajiText === '' ? null : Number(gajiText);
  if (!leadId || !Number.isSafeInteger(umk) || umk < 1 || (gaji !== null && (!Number.isSafeInteger(gaji) || gaji < 1))) { status('#offer-status', 'Pilih target dan isi UMK Setempat (serta gaji pokok bila diisi) dengan angka yang valid.', true); button.disabled = false; return; }
  offerRequestId ||= crypto.randomUUID();
  status('#offer-status', 'Mengirim permintaan dokumen ke n8n…');
  try {
    const { data, error } = await client.functions.invoke('marketing', { body: { action: 'generate_offer', lead_id: leadId, umk, gaji_pokok: gaji, request_id: offerRequestId } });
    if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Generator gagal dimulai');
    offerRequestId = null;
    status('#offer-status', `Penawaran ${data.offer_id} diterima. Dokumen akan muncul di daftar setelah selesai.`);
    await loadOffers();
  } catch (error) { status('#offer-status', String(error.message || error), true); }
  finally { button.disabled = false; }
});
async function loadOffers() {
  if (!client || !currentUser) return;
  const { data, error } = await client.from('marketing_offers').select('id,owner_id,client_name,umk,gaji_pokok,status,nomor_surat,doc_file_url,rab_file_url,error,created_at,updated_at').order('created_at', { ascending: false }).limit(100);
  if (error) { $('#offer-list').textContent = 'Dokumen belum dapat dibaca: ' + error.message; return; }
  offerCache = data || [];
  const recent = (row) => row.status === 'processing' && Date.now() - new Date(row.updated_at).getTime() < 600000;
  const previewUrl = (url) => url ? url.replace(/\/edit(\?[^#]*)?(#.*)?$/, '/preview') : '';
  const offerListHtml = offerCache.length ? offerCache.map((row) => `<div class="item"><strong>${esc(row.client_name)}</strong><small>${esc(date(row.created_at))} · UMK Rp${Number(row.umk).toLocaleString('id-ID')}${row.gaji_pokok ? ` · Gaji pokok Rp${Number(row.gaji_pokok).toLocaleString('id-ID')}` : ''} · ${esc(row.nomor_surat || 'Nomor diproses')}</small><div><span class="badge ${row.status === 'error' ? 'error' : row.status === 'processing' || row.status === 'partial' ? 'processing' : ''}">${esc(row.status.toUpperCase())}</span></div><div class="offer-links">${row.doc_file_url ? `<button type="button" class="offer-preview-btn" data-preview-url="${esc(previewUrl(row.doc_file_url))}" data-preview-open="${esc(row.doc_file_url)}" data-preview-title="Surat pengantar · ${esc(row.client_name)}">Preview Surat</button>` : ''}${row.rab_file_url ? `<button type="button" class="offer-preview-btn" data-preview-url="${esc(previewUrl(row.rab_file_url))}" data-preview-open="${esc(row.rab_file_url)}" data-preview-title="RAB · ${esc(row.client_name)}">Preview RAB</button>` : ''}</div>${row.error ? `<small class="error">${esc(row.error)}</small>` : row.status === 'processing' && !recent(row) ? '<small class="error">Proses lebih dari 10 menit. Muat ulang atau minta admin memeriksa eksekusi n8n.</small>' : ''}</div>`).join('') : '<p class="hint">Belum ada dokumen penawaran.</p>';
  $('#offer-list').innerHTML = offerListHtml;
  if ($('#offer-list-manual')) $('#offer-list-manual').innerHTML = offerListHtml;
  if (offerCache.some(recent) && !offerPollTimer) offerPollTimer = setInterval(loadOffers, 5000);
  if (!offerCache.some(recent) && offerPollTimer) { clearInterval(offerPollTimer); offerPollTimer = null; }
}
$('#refresh-offers').addEventListener('click', loadOffers);
$('#refresh-offers-manual').addEventListener('click', loadOffers);
document.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-preview-url]');
  if (!btn) return;
  $('#offer-preview-title').textContent = btn.dataset.previewTitle || 'Pratinjau dokumen';
  $('#offer-preview-open').href = btn.dataset.previewOpen || btn.dataset.previewUrl;
  $('#offer-preview-frame').src = btn.dataset.previewUrl;
  $('#offer-preview-dialog').showModal();
});
$('#offer-preview-close').addEventListener('click', () => $('#offer-preview-dialog').close());
$('#offer-preview-dialog').addEventListener('close', () => { $('#offer-preview-frame').src = 'about:blank'; });

$('#manual-offer-date').value = localToday();
$('#manual-offer-form').addEventListener('input', () => { manualOfferRequestId = null; });
$('#manual-offer-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!client || !currentUser) return;
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const counts = ['security', 'cleaning', 'pramubakti', 'driver']
    .map((name) => Number($(`#manual-offer-${name}`).value));
  const umk = Number($('#manual-offer-umk').value);
  const gajiText = $('#manual-offer-gaji').value.trim(); const gaji = gajiText === '' ? null : Number(gajiText);
  if (!Number.isSafeInteger(umk) || umk < 1 || umk > 1000000000 || (gaji !== null && (!Number.isSafeInteger(gaji) || gaji < 1 || gaji > 1000000000)) ||
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
      provinsi: $('#manual-offer-province').value.trim(), umk, gaji_pokok: gaji,
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
  priceLoaded = false; priceRows = []; if (priceView !== 'target') loadPrices();
  memberOptions = (data.members || []).filter((m) => m.active !== false).map((m) => ({ user_id: m.user_id, display_name: m.display_name })).sort((a, b) => a.display_name.localeCompare(b.display_name));
  renderActiveClients();
  existingStaffUsernames = (data.members || []).filter((member) => member.email?.endsWith(`@${staffLoginDomain}`))
    .map((member) => member.email.split('@')[0]);
  $('#account-info').textContent = `${memberLabel(data.self)} · ${data.self.role === 'admin' ? 'Admin' : 'Staf'}`;
  $('#folder-url').value = data.self.drive_folder_url || '';
  $('#admin-settings').hidden = data.self.role !== 'admin';
  $('#ai-key-status').textContent = data.ai_ready ? 'Kunci AI terpasang di server.' : 'Kunci AI belum terpasang di server.';
  $('#ai-search-submit').textContent = data.ai_ready ? 'Cari dengan AI' : 'Cari data';
  $('#member-list').innerHTML = (data.members || []).map((m) => {
    const username = m.email?.endsWith(`@${staffLoginDomain}`) ? m.email.split('@')[0] : 'akun lama';
    return `<div class="item"><strong>${esc(memberLabel(m))}</strong><small>${esc(username)} · ${esc(m.role)} · ${m.active ? 'aktif' : 'nonaktif'}</small>${m.user_id === currentUser?.id ? '' : `<div class="actions"><button type="button" data-member-active="${esc(m.user_id)}" data-active="${m.active ? '0' : '1'}" data-name="${esc(memberLabel(m))}">${m.active ? 'Nonaktifkan akun' : 'Aktifkan akun'}</button><button type="button" data-member-reset="${esc(m.user_id)}" data-name="${esc(memberLabel(m))}">Reset kata sandi</button></div>`}<form class="member-name-form" data-user-id="${esc(m.user_id)}"><label>Nama staf<input type="text" maxlength="100" value="${esc(m.display_name || '')}" required></label><button type="submit">Simpan nama</button></form><form class="member-folder-form" data-user-id="${esc(m.user_id)}"><label>Folder Drive<input type="url" value="${esc(m.drive_folder_url || '')}" required></label><button type="submit">Simpan folder</button></form></div>`;
  }).join('');
}
$('#password-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const oldPassword = $('#password-old').value;
  const newPassword = $('#password-new').value;
  const confirmPassword = $('#password-confirm').value;
  if (newPassword !== confirmPassword) { status('#password-status', 'Konfirmasi kata sandi baru tidak sama dengan kata sandi baru.', true); return; }
  if (newPassword === oldPassword) { status('#password-status', 'Kata sandi baru harus berbeda dari kata sandi lama.', true); return; }
  const button = $('#password-form button[type="submit"]'); button.disabled = true;
  status('#password-status', 'Memeriksa kata sandi lama…');
  try {
    const { error: signInError } = await client.auth.signInWithPassword({ email: currentUser.email, password: oldPassword });
    if (signInError) throw new Error('Kata sandi lama salah.');
    const { error: updateError } = await client.auth.updateUser({ password: newPassword });
    if (updateError) throw updateError;
    status('#password-status', 'Kata sandi berhasil diganti. Gunakan kata sandi baru saat login berikutnya.');
    form.reset();
  } catch (error) { status('#password-status', String(error.message || error), true); }
  finally { button.disabled = false; }
});
$('#folder-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const { data, error } = await client.functions.invoke('marketing', { body: { action: 'set_folder', drive_folder_url: $('#folder-url').value.trim() } });
  status('#folder-status', error || !data?.ok ? data?.error || error?.message || 'Gagal menyimpan folder' : 'Folder akun tersimpan.', !!error || !data?.ok);
  if (data?.ok) loadSettings();
});
$('#invite-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = $('#invite-form button[type="submit"]');
  submit.disabled = true;
  status('#invite-status', 'Membuat akun staf…');
  const { data, error } = await client.functions.invoke('marketing', { body: { action: 'create_staff', username: $('#invite-username').value.trim(),
    password: $('#invite-password').value, display_name: $('#invite-name').value.trim(), drive_folder_url: $('#invite-folder').value.trim() } });
  submit.disabled = false;
  status('#invite-status', error || !data?.ok ? data?.error || error?.message || 'Akun gagal dibuat' : `Akun ${data.username} siap digunakan. Berikan username dan kata sandi secara privat kepada staf.`, !!error || !data?.ok);
  if (data?.ok) { $('#invite-form').reset(); $('#invite-password').type = 'password'; $('#toggle-invite-password').textContent = 'Tampilkan'; loadSettings(); }
});
$('#staff-import-file').addEventListener('change', () => {
  clearStaffImportPreview();
  $('#staff-import-results').textContent = '';
  status('#staff-import-status', $('#staff-import-file').files?.length ? 'Klik Periksa file Excel untuk melihat daftar akun.' : '');
});
$('#staff-import-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (currentMember?.role !== 'admin') return;
  const file = $('#staff-import-file').files?.[0];
  clearStaffImportPreview();
  $('#staff-import-results').textContent = '';
  if (!file || !/\.xlsx$/i.test(file.name) || file.size > 2 * 1024 * 1024) {
    status('#staff-import-status', 'Pilih file .xlsx dari template, maksimal 2 MB.', true); return;
  }
  if (typeof window.readXlsxFile !== 'function') {
    status('#staff-import-status', 'Pembaca Excel belum tersedia. Muat ulang halaman lalu coba lagi.', true); return;
  }
  const checkButton = $('#staff-import-form button[type="submit"]');
  checkButton.disabled = true;
  status('#staff-import-status', 'Memeriksa isi Excel…');
  try {
    const sheets = await window.readXlsxFile(file);
    const { entries, errors } = validateStaffWorkbook(sheets, existingStaffUsernames);
    if (errors.length) {
      status('#staff-import-status', `File belum siap: ${errors.length} masalah ditemukan. Perbaiki Excel lalu periksa lagi.`, true);
      $('#staff-import-results').textContent = errors.slice(0, 8).join('\n') + (errors.length > 8 ? `\n...dan ${errors.length - 8} masalah lainnya.` : '');
      return;
    }
    staffImportRows = entries;
    $('#staff-import-summary').textContent = `${entries.length} akun siap dibuat. Periksa nama, username, dan folder sebelum melanjutkan.`;
    $('#staff-import-list').textContent = entries.map((row) => `Baris ${row.row}: ${row.displayName} (${row.username})\nFolder: ${row.driveFolderUrl}`).join('\n\n');
    $('#staff-import-create').textContent = `Buat ${entries.length} akun staf`;
    $('#staff-import-create').disabled = false;
    $('#staff-import-preview').hidden = false;
    status('#staff-import-status', 'File valid. Kata sandi tidak ditampilkan.');
  } catch {
    status('#staff-import-status', 'File Excel tidak dapat dibaca. Gunakan template .xlsx yang tersedia di halaman ini.', true);
  } finally {
    checkButton.disabled = false;
  }
});
$('#staff-import-create').addEventListener('click', async () => {
  if (!client || !currentUser || currentMember?.role !== 'admin' || !staffImportRows.length) return;
  const rows = staffImportRows;
  staffImportRows = [];
  staffImportBusy = true;
  const createButton = $('#staff-import-create');
  const checkButton = $('#staff-import-form button[type="submit"]');
  createButton.disabled = true;
  checkButton.disabled = true;
  $('#staff-import-file').disabled = true;
  let created = 0;
  let skipped = 0;
  const report = [];
  let stopped = false;
  try {
    for (const [index, row] of rows.entries()) {
      if (!currentUser || currentMember?.role !== 'admin') { stopped = true; break; }
      status('#staff-import-status', `Membuat akun ${index + 1} dari ${rows.length}…`);
      let data;
      let error;
      try {
        ({ data, error } = await client.functions.invoke('marketing', { body: { action: 'create_staff',
          username: row.username, password: row.password, display_name: row.displayName, drive_folder_url: row.driveFolderUrl } }));
      } catch (caught) { error = caught; }
      if (data?.ok) { created++; report.push(`${row.username}: berhasil`); continue; }
      if (error?.context?.status === 409 || data?.error === 'Username sudah digunakan') {
        skipped++; report.push(`${row.username}: sudah terdaftar`); continue;
      }
      stopped = true;
      report.push(`${row.username}: gagal; periksa daftar akun sebelum mencoba lagi.`);
      break;
    }
    $('#staff-import-results').textContent = report.join('\n');
    status('#staff-import-status', `${created} akun dibuat, ${skipped} sudah ada.${stopped ? ' Proses berhenti sebelum semua baris selesai.' : ' Selesai.'}`, stopped);
  } finally {
    staffImportBusy = false;
    rows.forEach((row) => { row.password = ''; });
    rows.length = 0;
    $('#staff-import-file').value = '';
    $('#staff-import-file').disabled = false;
    $('#staff-import-preview').hidden = true;
    checkButton.disabled = false;
    loadSettings();
  }
});
$('#toggle-invite-password').addEventListener('click', () => {
  const input = $('#invite-password');
  input.type = input.type === 'password' ? 'text' : 'password';
  $('#toggle-invite-password').textContent = input.type === 'password' ? 'Tampilkan' : 'Sembunyikan';
});
$('#generate-invite-password').addEventListener('click', () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  $('#invite-password').value = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
  $('#invite-password').type = 'text';
  $('#toggle-invite-password').textContent = 'Sembunyikan';
});
const randomPassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  return Array.from(crypto.getRandomValues(new Uint32Array(16)), (n) => alphabet[n % alphabet.length]).join('');
};
let memberStatusTimer = null;
$('#member-list').addEventListener('click', async (event) => {
  const toggle = event.target.closest('[data-member-active]');
  const reset = event.target.closest('[data-member-reset]');
  if (!toggle && !reset) return;
  const name = (toggle || reset).dataset.name;
  if (toggle) {
    const active = toggle.dataset.active === '1';
    if (!window.confirm(active ? `Aktifkan kembali akun ${name}?` : `Nonaktifkan akun ${name}?\nStaf tidak bisa masuk dan tidak bisa melihat data. Data lama tetap tersimpan.`)) return;
    const { data, error } = await client.functions.invoke('marketing', { body: { action: 'set_member_active', user_id: toggle.dataset.memberActive, active } });
    status('#invite-status', error || !data?.ok ? data?.error || error?.message || 'Status akun gagal diubah' : (data.warning || `Akun ${name} ${active ? 'diaktifkan' : 'dinonaktifkan'}.`), !!error || !data?.ok);
    if (data?.ok) loadSettings();
    return;
  }
  if (!window.confirm(`Buat kata sandi baru untuk ${name}?\nKata sandi lama langsung tidak berlaku.`)) return;
  const password = randomPassword();
  const { data, error } = await client.functions.invoke('marketing', { body: { action: 'reset_member_password', user_id: reset.dataset.memberReset, password } });
  if (error || !data?.ok) { status('#invite-status', data?.error || error?.message || 'Kata sandi gagal diubah', true); return; }
  status('#invite-status', `Kata sandi baru ${name}: ${password} — catat sekarang dan sampaikan ke staf; tidak akan ditampilkan lagi.`);
  clearTimeout(memberStatusTimer);
  memberStatusTimer = setTimeout(() => status('#invite-status', ''), 120000);
});
$('#member-list').addEventListener('submit', async (event) => {
  const nameForm = event.target.closest('.member-name-form');
  if (nameForm) {
    event.preventDefault();
    const { error } = await client.rpc('marketing_set_member_name', { p_user_id: nameForm.dataset.userId, p_name: nameForm.querySelector('input').value });
    status('#invite-status', error ? error.message : 'Nama staf tersimpan.', !!error);
    if (!error) { loadSettings(); loadActiveClients(); }
    return;
  }
  const form = event.target.closest('.member-folder-form');
  if (!form) return;
  event.preventDefault();
  const { data, error } = await client.functions.invoke('marketing', { body: { action: 'set_folder', user_id: form.dataset.userId,
    drive_folder_url: form.querySelector('input').value.trim() } });
  status('#invite-status', error || !data?.ok ? data?.error || error?.message || 'Folder gagal disimpan' : 'Folder staf tersimpan.', !!error || !data?.ok);
  if (data?.ok) loadSettings();
});
$('#ai-search-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!client || !currentUser) return;
  const submit = $('#ai-search-submit');
  submit.disabled = true;
  $('#ai-answer').hidden = true;
  $('#ai-sources').textContent = '';
  status('#ai-search-status', 'Mencari data yang dapat Anda akses…');
  const { data, error } = await client.functions.invoke('marketing', { body: { action: 'ai_search', query: $('#ai-query').value.trim() } });
  submit.disabled = false;
  if (error || !data?.ok) { status('#ai-search-status', data?.error || error?.message || 'Pencarian gagal.', true); return; }
  $('#ai-answer').textContent = data.answer || '';
  $('#ai-answer').hidden = !data.answer;
  const safeLink = (value) => /^https:\/\/(?:docs|drive)\.google\.com\//i.test(value || '');
  $('#ai-sources').innerHTML = (data.sources || []).map((source) => `<div class="item"><strong>${esc(source.title)}</strong><small>${esc(source.type)} · ${esc(source.status || '—')} · ${esc(date(source.updated_at))}</small>${source.detail ? `<p>${esc(source.detail)}</p>` : ''}${safeLink(source.url) ? `<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">Buka dokumen Drive</a>` : ''}</div>`).join('');
  status('#ai-search-status', data.sources?.length ? `${data.sources.length} sumber ditemukan.${data.ai_ready ? '' : ' Ringkasan AI belum aktif; API key belum terpasang.'}` : 'Belum ada data yang cocok.');
});
