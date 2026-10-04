# Raykerja Marketing

Portal Marketing PT Ray Mitra Perkasa untuk `marketing.raykerja.cloud`. Source halaman berada di GitHub Pages; data terstruktur dan pengaturan akun berada di Supabase. Hasil riset dan surat yang dibuat pengguna disalin ke folder Google Drive milik pengguna melalui n8n.

## Struktur

| File | Fungsi |
| --- | --- |
| `index.html`, `style.css`, `app.js` | Login, formulir kunjungan HP, Cari Target Market, preview hasil, database target, surat, pengaturan akun/folder |
| `config.js` | URL dan publishable key Supabase untuk browser |
| `supabase/migrations/20261004_marketing.sql` | Tabel, indeks, status Drive, RLS per akun |
| `supabase/migrations/20261004_marketing_visits.sql` | Tabel kunjungan, RLS, bucket foto privat |
| `supabase/functions/marketing/index.ts` | Undangan akun, pengaturan folder, pemicu dua webhook, callback |
| `scripts/prepare_n8n.py`, `scripts/prepare_letter_n8n.py` | Draft privat dua workflow n8n |
| `scripts/prepare_visit_n8n.py` | Draft privat webhook foto Drive dan sinkronisasi Google Sheet |
| `scripts/configure_auth.py`, `scripts/invite_admin.py`, `scripts/add_member.py` | Konfigurasi Auth dan admin pertama |
| `scripts/import_sheet.py`, `scripts/import_legacy_letter.py` | Impor data historis |

`private/` dan `.env` diabaikan Git. Jangan memasukkan credential, service role key, secret webhook, ekspor data target, atau JSON workflow privat ke repo publik.

## Alur dan akses

- Cari Target Market tetap **satu formulir** dengan pilihan swasta/pemerintah. Browser → Edge Function → webhook `raykerja-target` → riset n8n → file JSON di Drive akun → callback → preview dan target di Supabase. Bila Drive gagal, hasil tetap tampil dengan status `partial` dan pesan kesalahan.
- Surat/penawaran: draft disimpan di `marketing_letters`, lalu Edge Function memicu webhook `raykerja-letter` untuk membuat salinan `.txt` di Drive akun. Status dan link file diperbarui lewat callback. Jika Drive gagal, draft Supabase tetap tersedia.
- Staf hanya melihat riset, target, dan surat miliknya. Admin dapat melihat semua riset dan target serta membuat akun staf dan mengatur folder mereka. Karena proyek belum memiliki SMTP khusus, halaman admin menampilkan link aktivasi satu kali untuk disalin dan dikirim secara privat kepada staf. Staf dapat mengubah link foldernya sendiri di menu **Pengaturan**. Folder riset dibekukan pada saat permintaan dibuat sehingga pergantian folder kemudian tidak mengalihkan hasil riset yang sedang berjalan.
- Kunjungan: staf memilih target hasil riset atau mengetik target baru, mengisi data inti di HP, lalu menyimpan. Supabase menjadi database utama `marketing_visits`; n8n melakukan **append or update** ke tab `DataMarketing` pada Sheet `MARKETING RAYMP 2026` dengan `ID LAPORAN` sebagai kunci. Kolom AE/AF berisi ID dan email akun. Perubahan laporan memperbarui baris yang sama. Jika sinkronisasi gagal, laporan tetap di Supabase dan staf dapat menekan **Coba sinkron lagi**. Admin melihat laporan dan status semua staf, sedangkan hanya pemilik dapat mengubahnya.
- Foto kunjungan opsional diambil dari kamera/galeri HP, diunggah ke bucket Supabase privat (`marketing-visit-photos`), lalu disalin oleh n8n ke folder Drive akun. Tautan Drive masuk kolom `FOTO KUNJUNGAN`. Tombol **Ambil lokasi HP** memerlukan izin lokasi dari perangkat dan koneksi HTTPS; koordinat dapat diisi manual.
- Link folder harus berbentuk `https://drive.google.com/drive/folders/ID`. Folder harus memberikan akses **Editor** ke akun Google yang terhubung dengan credential Google Drive n8n. Aplikasi belum memeriksa izin folder secara langsung; kegagalan akan terlihat pada status Drive.
- Sumber historis: Google Sheet `Data hasil Marketing`, 57 baris/38 kolom per 4 Oktober 2026, dan satu percakapan surat pada RAY AI. Ekspor lokal hanya di `private/`.

## Deployment dan konfigurasi

Produksi awal (GitHub Pages, DNS, Supabase, n8n riset/surat) sudah diterapkan pada 4 Oktober 2026. Fitur kunjungan menambah migration `marketing_visits`, workflow n8n `m12aJ6zFGhfgCjqP`, dan Edge Function `marketing` versi 5. Tab `DataMarketing` memiliki header `ID LAPORAN` dan `EMAIL MARKETING` pada kolom AE/AF; baris historis tidak diubah. Alur berikut menjadi runbook untuk pemasangan ulang/pemulihan.

1. Backup kondisi Supabase dan n8n. Jalankan migration SQL; verifikasi tabel, RLS, dan status kolom Drive.
2. Set tiga Edge Function secrets: `MARKETING_WEBHOOK_SECRET` dari penyimpanan key lokal, `MARKETING_N8N_WEBHOOK` ke `/webhook/raykerja-target`, `MARKETING_N8N_LETTER_WEBHOOK` ke `/webhook/raykerja-letter`. URL kunjungan diturunkan dari URL target ke `/webhook/raykerja-visit`. Deploy `marketing` dengan `verify_jwt = false`; fungsi sendiri memverifikasi JWT pengguna dan secret callback.
3. Jalankan `python3 scripts/prepare_n8n.py`, `python3 scripts/prepare_letter_n8n.py`, dan `python3 scripts/prepare_visit_n8n.py`. Review draft di `private/`, buat tiga workflow Raykerja di n8n, lalu aktifkan. Workflow RAY AI/Telegram lama tetap berjalan. Draft kunjungan menggunakan credential Google Sheets dan Drive yang sudah ada di n8n.
4. Jalankan impor Sheet secara dry run, kemudian `--apply`. Verifikasi 57 baris historis. Lakukan impor surat historis setelah admin pertama terdaftar.
5. Push source yang aman ke `raykerja/Suportmarketing`, aktifkan GitHub Pages branch `main` root, set custom domain **`marketing.raykerja.cloud`**. Pada DNS Hostinger, buat CNAME `marketing` → `raykerja.github.io`. **Jangan ubah record apex `@`, `www`, MX, SPF, atau DKIM.** Verifikasi resolusi DNS dan HTTPS.
6. Jalankan `scripts/configure_auth.py --apply`, undang `yasir@raykerja.cloud` dengan `scripts/invite_admin.py --apply`, lalu `scripts/add_member.py --apply`. Akun pertama menjadi admin. Masuk lewat link undangan dan buat kata sandi.
7. Dari menu Pengaturan, tetapkan folder Drive Yasir. Uji satu riset, satu surat, dan satu kunjungan. Verifikasi hasil di preview, Supabase, tab `DataMarketing`, dan file foto di folder Drive. Baru setelah itu undang staf tambahan dari halaman dan tetapkan folder masing-masing.

DNS subdomain mengikuti [panduan GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site). Propagasi DNS dapat membutuhkan waktu.

## Keterbatasan dan pemulihan

- Surat saat ini berbasis template yang dapat diedit, belum penulisan AI generatif dari chat RAY AI. Salinan Drive berupa teks `.txt`; cetak PDF tersedia dari browser. Tinjau isi surat sebelum dikirim.
- Link aktivasi adalah kredensial sementara. Jangan kirim di grup atau tempat publik; berikan hanya kepada pemilik alamat email. Jika link kedaluwarsa, admin perlu membuat link baru. SMTP khusus dapat ditambahkan kelak untuk pengiriman undangan otomatis.
- Form kunjungan memuat 27 bidang yang diisi staf; `TANGGAL INPUT` dan `NAMA MARKETING` ditetapkan sistem. Field telemarketing/follow up tambahan bersifat opsional. Foto maksimal 10 MB dengan format JPEG, PNG, WebP, HEIC, atau HEIF. Formulir memerlukan jaringan saat menyimpan; belum ada mode offline.
- Akun Drive n8n harus diberi izin Editor pada setiap folder pengguna. Jika file gagal dibuat, cek permission folder, masa berlaku OAuth, dan eksekusi n8n. Untuk riset, cek status `partial`; untuk surat, cek `drive_status=error`.
- Jika webhook gagal, cek eksekusi workflow, secret, callback HTTP, dan log Edge Function. Respons webhook awal hanya tanda proses diterima.
- Rollback: nonaktifkan dua workflow Raykerja, kembalikan CNAME `marketing` jika ada nilai sebelumnya, dan rollback source GitHub. Data Supabase tidak dihapus otomatis. Portal RAY AI lama tetap independen.
