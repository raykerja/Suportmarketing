# Serah terima proyek Support Marketing RMP

Dokumen ini adalah titik awal bila proyek dibuka dari laptop, IDE, atau platform coding lain. Source resmi: [raykerja/Suportmarketing](https://github.com/raykerja/Suportmarketing), branch `main`. Situs production: `https://marketing.raykerja.cloud` (GitHub Pages). Gunakan commit `main` terbaru; jangan mulai ulang aplikasi dari nol.

## Peta sistem

| Komponen | Lokasi/koneksi | Status |
| --- | --- | --- |
| Frontend HTML/CSS/JS | Root repository, `index.html`, `app.js`, `style.css`, `theme-ray.css`, `clients-preview.js` | Production di GitHub Pages |
| Supabase | Project ref `ewicmiekwzmxkkokmpzf`; konfigurasi browser di `config.js`; Edge Function `marketing` | Auth, riset, target, surat, kunjungan aktif |
| n8n riset | Workflow `NxD7a2bT0G29RZOE`, path `raykerja-target` | Aktif |
| n8n surat | Workflow `gZ6PzuR1IUm4A3Vv`, path `raykerja-letter` | Aktif |
| n8n kunjungan | Workflow `m12aJ6zFGhfgCjqP`, path `raykerja-visit` | Aktif; sinkron ke Sheet dan Drive |
| n8n dokumen penawaran web | Draft `n8n/offer-documents.template.json`, path `raykerja-offer` | Belum diaktifkan; Telegram generator lama tetap aktif |
| Google Sheet | `MARKETING RAYMP 2026`, tab `DataMarketing`; ID dan struktur kolom dalam `README.md` | Sinkron kunjungan aktif |
| Google Drive | Folder diatur per akun pada menu Pengaturan; file riset/surat dan foto dari n8n | Bergantung izin folder setiap akun |

## Status fitur penting

- **Kunjungan** memakai Supabase dan sinkron ke `DataMarketing`. Formulir HP terdiri dari tiga langkah.
- **Riset target** dan **Surat & Penawaran** memakai Supabase, n8n, dan folder Drive per akun.
- **Review hasil riset → dokumen penawaran web** disiapkan pada branch lokal. Riset `raykerja-target` sudah aktif; generator Google Docs dan RAB web memerlukan migration, workflow baru, secret Edge Function, dan deploy sebelum dapat diuji end-to-end.
- **Progres & Pengingat** masih pratinjau di browser karena `progressEnabled: false`. Migration `20261004_marketing_progress.sql` dan revisi workflow hanya draft; jangan menganggapnya sudah terpasang.
- **Klien Aktif & Penawaran Ulang** masih pratinjau dengan data fiktif di `clients-preview.js`. Belum ada tabel klien, penawaran ulang, atau data kontrak nyata yang tersambung.
- Admin pertama: `yasir@raykerja.cloud`. Akun staf dan foldernya dikelola melalui menu Pengaturan.

## Cara membuka dari platform lain

1. Clone `https://github.com/raykerja/Suportmarketing.git`, checkout `main`, dan baca `README.md`, `CHANGELOG.md`, `PROCESS_LOG.md`, serta `TEST_RESULTS.md` sebelum mengubah kode.
2. Untuk melihat frontend tanpa mengubah sistem lain, jalankan server statis lokal dari root repository, misalnya `python3 -m http.server 8000`, lalu buka `http://localhost:8000`. Login tetap memakai Supabase production jika `config.js` tidak diganti; gunakan akun yang sah dan hindari data uji pada production.
3. Untuk lingkungan Supabase baru, salin `config.example.js` menjadi `config.js` lalu isi URL proyek dan **publishable key** lingkungan tersebut. Jangan masukkan service role key ke browser. Terapkan migration sesuai urutan di `supabase/migrations/` pada lingkungan baru, lalu konfigurasi Auth redirect URL dan Edge Function secrets. Lakukan backup dan validasi sebelum mengubah proyek production yang sudah berjalan.
4. Template workflow n8n yang aman untuk Git ada di `n8n/`. Untuk menyambung ke workflow production yang sudah aktif, gunakan ID di tabel; jangan mengimpor duplikat ke production tanpa rencana cutover. Credential Google Drive/Sheets, OpenAI, pencarian, API n8n, dan secret webhook tetap berada di pengelola credential masing-masing.
5. Setelah perubahan frontend disetujui, push ke `main` memicu GitHub Pages. Domain dan `CNAME` sudah dikonfigurasi. Verifikasi status Actions, aset HTTPS, halaman login, lalu alur setelah login yang relevan.

## Konfigurasi yang sengaja tidak ada di GitHub

- Secret: `SUPABASE_SERVICE_ROLE_KEY`, `MARKETING_WEBHOOK_SECRET`, token API Supabase/n8n/GitHub, dan OAuth Google. Edge Function juga memakai `MARKETING_N8N_WEBHOOK` dan `MARKETING_N8N_LETTER_WEBHOOK` serta variabel Supabase bawaan.
- Generator dokumen web menambah `MARKETING_N8N_OFFER_WEBHOOK` pada Edge Function, berisi URL produksi `/webhook/raykerja-offer` tanpa secret di URL.
- File lokal `private/`, `.env*`, ekspor Sheet, salinan workflow aktif dengan credential, dan data pribadi.
- Akses ke GitHub **tidak otomatis** memberi akses ke Supabase, n8n, atau Google Workspace. Platform baru memerlukan izin tersendiri untuk layanan tersebut. Jangan menyalin secret ke repo, chat publik, atau URL.

## Urutan aktivasi generator dokumen web (menunggu persetujuan production)

1. Pastikan backup workflow aktif riset dan generator Telegram tersedia di `private/`; backup skema Supabase dan catat commit/versi Edge Function sebelum tindakan production.
2. Terapkan `supabase/migrations/20261004_marketing_offers.sql`; verifikasi `review_status`, tabel `marketing_offers`, RLS, dan grant baca saja untuk browser.
3. Siapkan revisi `n8n/target-research.template.json`: pada workflow riset aktif ubah tool SiRUP yang responsnya kosong menjadi pencarian dokumen RUP/SiRUP resmi via Serper, perbarui prompt/parser/penyusun hasil, dan uji paket TA sebelumnya. Simpan backup workflow aktif serta catat perubahan node.
4. Impor `n8n/offer-documents.template.json` sebagai workflow nonaktif. Isi empat placeholder ID/secret, pasang ulang credential Google, uji satu eksekusi terkontrol, lalu aktifkan webhook `raykerja-offer`. Jangan ubah workflow Telegram lama.
5. Set secret Edge Function `MARKETING_N8N_OFFER_WEBHOOK`, deploy fungsi `marketing`, lalu push frontend ke `main` agar GitHub Pages memperbarui `marketing.raykerja.cloud`.
6. Login sebagai Yasir. Jalankan satu riset kecil atau pilih target uji milik akun, setujui di Review Hasil, isi UMK, buat penawaran, lalu verifikasi dua file **di folder Drive akun**, status/URL pada `marketing_offers`, rumus RAB, placeholder Docs, dan nomor surat. Jangan kirim dokumen ke klien sebelum nilai biaya ditinjau.
7. Jika gagal, hentikan workflow web, kembalikan versi Edge Function dan commit frontend sebelumnya. Biarkan tabel baru sebagai data historis; jangan hapus otomatis. File uji Drive dan record Supabase hanya dibersihkan dengan persetujuan.

## Pemeriksaan sebelum menyatakan selesai

Jalankan `node --check app.js`, `node --check clients-preview.js`, dan `git diff --check`. Untuk perubahan UI, uji 320/390 px dan desktop. Untuk perubahan backend, verifikasi hasil di Supabase **dan** Sheet/Drive, bukan hanya status webhook. Catat hasil di `TEST_RESULTS.md`. Tindakan production dan destruktif mengikuti persetujuan eksplisit pada instruksi proyek.
