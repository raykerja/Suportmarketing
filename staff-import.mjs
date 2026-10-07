const expectedHeaders = ['nama staf', 'username', 'kata sandi awal', 'link folder google drive staf'];
const folderPattern = /^https:\/\/drive\.google\.com\/drive\/folders\/([A-Za-z0-9_-]{10,200})(?:[/?#].*)?$/;

export function validateStaffWorkbook(sheets, existingUsernames = []) {
  const sheet = sheets?.find((item) => item.sheet === 'Akun staf') || sheets?.[0];
  const rows = sheet?.data;
  if (!Array.isArray(rows) || rows.length < 5) return { entries: [], errors: ['Sheet akun staf tidak ditemukan atau kosong.'] };
  const headers = (rows[4] || []).slice(0, 4).map((value) => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase());
  if (expectedHeaders.some((header, index) => headers[index] !== header)) {
    return { entries: [], errors: ['Kolom baris 5 tidak sesuai template. Gunakan file Excel yang diunduh dari Pengaturan.'] };
  }

  const entries = [];
  const errors = [];
  const existing = new Set(existingUsernames.map((value) => String(value).toLowerCase()));
  const seen = new Set();
  rows.slice(5).forEach((cells, index) => {
    const values = Array.isArray(cells) ? cells.slice(0, 4) : [];
    if (values.every((value) => value == null || String(value).trim() === '')) return;
    const row = index + 6;
    const displayName = String(values[0] ?? '').trim();
    const username = String(values[1] ?? '').trim().toLowerCase();
    const password = values[2];
    const driveFolderUrl = String(values[3] ?? '').trim();
    const reasons = [];
    if (!displayName || displayName.length > 100) reasons.push('nama staf wajib 1–100 karakter');
    if (!/^[a-z0-9_]{3,32}$/.test(username)) reasons.push('username harus 3–32 huruf kecil/angka/garis bawah');
    else if (seen.has(username)) reasons.push('username berulang dalam file');
    else if (existing.has(username)) reasons.push('username sudah terdaftar');
    if (typeof password !== 'string' || password.length < 12 || password.length > 128) reasons.push('kata sandi harus teks sepanjang 12–128 karakter');
    if (!folderPattern.test(driveFolderUrl)) reasons.push('link folder Google Drive tidak valid');
    if (reasons.length) errors.push(`Baris ${row}: ${reasons.join('; ')}.`);
    else entries.push({ row, displayName, username, password, driveFolderUrl });
    if (username) seen.add(username);
  });
  if (!entries.length && !errors.length) errors.push('Belum ada data staf. Isi minimal satu baris mulai baris 6.');
  if (entries.length + errors.length > 50) errors.push('Maksimal 50 akun per file.');
  return { entries, errors };
}
