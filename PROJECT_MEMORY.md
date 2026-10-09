# Memori proyek — Portal Marketing RAY

> Ringkasan singkat. **Rincian dan status terbaru ada di `docs/`** (mulai `docs/00-MULAI-DI-SINI.md`, lalu `docs/02-STATUS-PROGRES.md`). Diperbarui 9 Oktober 2026. Verifikasi dengan `python3 scripts/status_check.py` — catatan bertanggal bisa tertinggal.

## Identitas dan arsitektur
- Source resmi `raykerja/Suportmarketing` (publik), branch `main`; frontend statis `marketing.raykerja.cloud` lewat GitHub Pages.
- Supabase `ewicmiekwzmxkkokmpzf` = database utama + Auth; Edge Function `marketing` (versi 21 per 9 Okt) untuk aksi server; n8n untuk riset/surat/penawaran/sinkron Sheet; Apps Script Drive Gateway untuk cadangan Drive tanpa n8n.
- Peran: `staff` (data sendiri + client PIC-nya) dan `admin` (= super admin; 4 akun).

## Yang produksi (lihat docs/02 untuk tingkat bukti)
Akun & login; Sales Visit (+Sheet/Drive); riset, surat, penawaran (n8n); progres; **Client Active** (274 client, PIC Korlap/Admin, tabel, edit admin, arsip, tanggal kontrak, riwayat, ekspor, dasbor); **PIC Visit**; **Monitoring & Tindaklanjut**; asisten AI yang membaca data sesuai akses; admin: nonaktifkan akun, reset sandi, ganti nama/folder.

## Keamanan
Semua tabel `marketing_*` memakai RLS; `anon` ditolak; bucket foto privat; signup publik nonaktif. Tabel baru wajib: RLS + grant eksplisit + uji pemilik/staf lain/admin/anonim. Edge Function melewati RLS (service role): filter akses diulang manual (`visibleClients()`).

## Aturan kerja
1. Perubahan minimum, kompatibel; jangan tulis ulang.
2. Persetujuan eksplisit pemilik untuk push, migrasi produksi, deploy, n8n aktif, DNS, tindakan destruktif.
3. Bukti di sistem tujuan; laporkan batas uji. Setelah selesai perbarui `docs/02` dan `CHANGELOG.md`.
4. Jangan simpan rahasia/data klien/nama staf di Git (repo publik).

## Pekerjaan terbuka
Lihat `docs/05-BACKLOG-DAN-TINDAK-LANJUT.md`. Ringkas: uji manusia, 4 PIC tanpa akun, isi tanggal kontrak, cadangan Drive untuk PIC Visit/penawaran, foto PIC Visit, retry cadangan, pengingat otomatis, tingkat super admin.
