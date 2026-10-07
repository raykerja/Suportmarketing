/**
 * Drive Gateway Marketing RAY.
 * Menerima salinan data dari Supabase (Edge Function) lalu menulisnya ke folder Drive staf
 * atas nama pemilik skrip. Secret harus cocok dengan secret DRIVE_GATEWAY_SECRET di Supabase.
 * Nilai SECRET di bawah hanya placeholder di Git; salinan asli ada di private/ dan tidak di-commit.
 */
const SECRET = '__GATEWAY_SECRET__';
const MACHINE_DIR = '_backup_mesin';
const VISIT_HEADERS = [
  ['tanggal_realisasi_kunjungan', 'Tanggal kunjungan'], ['nama_perusahaan', 'Perusahaan'], ['kategori', 'Kategori'],
  ['nama_pejabat_pic_1', 'PIC'], ['jabatan_pic', 'Jabatan PIC'], ['nomor_kontak_pic', 'Kontak PIC'],
  ['respon', 'Respon'], ['status_marketing', 'Status'], ['tahap_terkini', 'Tahap terakhir'],
  ['tanggal_follow_up', 'Jadwal follow up'], ['catatan', 'Catatan'], ['tanggal_aktivitas_terakhir', 'Aktivitas terakhir'],
  ['catatan_progres_terakhir', 'Catatan progres'], ['foto', 'Foto'], ['id', 'ID Laporan']];
const EVENT_HEADERS = [['perusahaan', 'Perusahaan'], ['activity_date', 'Tanggal kegiatan'], ['stage', 'Tahap'],
  ['note', 'Catatan'], ['next_follow_up', 'Follow up berikutnya'], ['attachment_url', 'Lampiran'], ['visit_id', 'ID Laporan']];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const body = JSON.parse(e.postData.contents);
    if (!body.secret || body.secret !== SECRET) return out({ ok: false, error: 'unauthorized' });
    lock.waitLock(25000);
    if (body.action === 'ping') return out({ ok: true, user: Session.getEffectiveUser().getEmail() });
    if (body.action === 'backup_visits') return out(backupVisits(body));
    return out({ ok: false, error: 'aksi tidak dikenal' });
  } catch (err) {
    return out({ ok: false, error: String(err).slice(0, 300) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}
function out(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function safe(v) { const s = v == null ? '' : String(v); return /^[=+@\-]/.test(s) ? "'" + s : s; }
function findInFolder(folder, name, mime) {
  const it = folder.getFilesByName(name);
  while (it.hasNext()) { const f = it.next(); if (!mime || f.getMimeType() === mime) return f; }
  return null;
}
function subFolder(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function writeTab(ss, title, headers, rows) {
  const sh = ss.getSheetByName(title) || ss.insertSheet(title);
  sh.clear();
  const matrix = [headers.map((h) => h[1])].concat(rows.map((r) => headers.map((h) => safe(r[h[0]]))));
  sh.getRange(1, 1, matrix.length, headers.length).setValues(matrix);
  sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e8f0fe');
  sh.setFrozenRows(1);
  return sh;
}
function backupVisits(b) {
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(String(b.folder_id || ''))) throw new Error('folder_id tidak valid');
  const folder = DriveApp.getFolderById(b.folder_id);
  const owner = String(b.owner_name || 'Staf').replace(/[\\/:*?"<>|]/g, ' ').slice(0, 80);
  const name = 'Riwayat Kunjungan - ' + owner;
  let file = findInFolder(folder, name, MimeType.GOOGLE_SHEETS);
  let ss;
  if (file) ss = SpreadsheetApp.openById(file.getId());
  else { ss = SpreadsheetApp.create(name); file = DriveApp.getFileById(ss.getId()); file.moveTo(folder); }
  const visits = Array.isArray(b.visits) ? b.visits : [];
  const events = Array.isArray(b.events) ? b.events : [];
  writeTab(ss, 'Kunjungan', VISIT_HEADERS, visits);
  writeTab(ss, 'Riwayat Progres', EVENT_HEADERS, events);
  const note = ss.getSheetByName('Petunjuk') || ss.insertSheet('Petunjuk');
  note.clear();
  note.getRange(1, 1, 3, 1).setValues([['SALINAN BACA SAJA dari web Marketing RAY.'],
    ['Ubah data lewat web marketing.raykerja.cloud; perubahan di sini tidak mengubah data resmi.'],
    ['Terakhir diperbarui: ' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm') + ' WIB']]);
  const stale = ss.getSheetByName('Sheet1'); if (stale && ss.getSheets().length > 1) ss.deleteSheet(stale);
  const dir = subFolder(folder, MACHINE_DIR);
  const jsonName = 'Backup_Mesin_' + owner + '.json';
  const payload = JSON.stringify({ versi: 1, dicadangkan_pada: new Date().toISOString(), pemilik: owner, kunjungan: visits, riwayat_progres: events }, null, 2);
  let jf = findInFolder(dir, jsonName);
  if (jf) jf.setContent(payload); else jf = dir.createFile(jsonName, payload, 'application/json');
  return { ok: true, sheet_id: ss.getId(), sheet_url: ss.getUrl(), json_id: jf.getId(), json_url: jf.getUrl(),
    folder_id: folder.getId(), jumlah_kunjungan: visits.length, jumlah_progres: events.length };
}
