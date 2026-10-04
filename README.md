# Raykerja Marketing

Portal Marketing PT Ray Mitra Perkasa untuk `marketing.raykerja.cloud`. Source halaman berada di GitHub Pages; data terstruktur dan pengaturan akun berada di Supabase. Hasil riset dan surat yang dibuat pengguna disalin ke folder Google Drive milik pengguna melalui n8n.

## Struktur

| File | Fungsi |
| --- | --- |
| `index.html`, `style.css`, `app.js` | Login, Cari Target Market, preview hasil, database target, surat, pengaturan akun/folder |
| `config.js` | URL dan publishable key Supabase untuk browser |
| `supabase/migrations/20261004_marketing.sql` | Tabel, indeks, status Drive, RLS per akun |
| `supabase/functions/marketing/index.ts` | Undangan akun, pengaturan folder, pemicu dua webhook, callback |
| `scripts/prepare_n8n.py`, `scripts/prepare_letter_n8n.py` | Draft privat dua workflow n8n |
| `scripts/configure_auth.py`, `scripts/invite_admin.py`, `scripts/add_member.py` | Konfigurasi Auth dan admin pertama |
| `scripts/import_sheet.py`, `scripts/import_legacy_letter.py` | Impor data historis |

`private/` dan `.env` diabaikan Git. Jangan memasukkan credential, service role key, secret webhook, ekspor data target, atau JSON workflow privat ke repo publik.

## Alur dan akses

- Cari Target Market tetap **satu formulir** dengan pilihan swasta/pemerintah. Browser → Edge Function → webhook `raykerja-target` → riset n8n → file JSON di Drive akun → callback → preview dan target di Supabase. Bila Drive gagal, hasil tetap tampil dengan status `partial` dan pesan kesalahan.
- Surat/penawaran: draft disimpan di `marketing_letters`, lalu Edge Function memicu webhook `raykerja-letter` untuk membuat salinan `.txt` di Drive akun. Status dan link file diperbarui lewat callback. Jika Drive gagal, draft Supabase tetap tersedia.
- Staf hanya melihat riset, target, dan surat miliknya. Admin dapat melihat semua riset dan target serta mengundang akun staf dan mengatur folder mereka. Staf dapat mengubah link foldernya sendiri di menu **Pengaturan**. Folder riset dibekukan pada saat permintaan dibuat sehingga pergantian folder kemudian tidak mengalihkan hasil riset yang sedang berjalan.
- Link folder harus berbentuk `https://drive.google.com/drive/folders/ID`. Folder harus memberikan akses **Editor** ke akun Google yang terhubung dengan credential Google Drive n8n. Aplikasi belum memeriksa izin folder secara langsung; kegagalan akan terlihat pada status Drive.
- Sumber historis: Google Sheet `Data hasil Marketing`, 57 baris/38 kolom per 4 Oktober 2026, dan satu percakapan surat pada RAY AI. Ekspor lokal hanya di `private/`.

## Urutan deployment setelah persetujuan produksi

1. Backup kondisi Supabase dan n8n. Jalankan migration SQL; verifikasi tabel, RLS, dan status kolom Drive.
2. Set tiga Edge Function secrets: `MARKETING_WEBHOOK_SECRET` dari penyimpanan key lokal, `MARKETING_N8N_WEBHOOK` ke `/webhook/raykerja-target`, `MARKETING_N8N_LETTER_WEBHOOK` ke `/webhook/raykerja-letter`. Deploy `marketing` dengan `verify_jwt = false`; fungsi sendiri memverifikasi JWT pengguna dan secret callback.
3. Jalankan `python3 scripts/prepare_n8n.py` lalu `python3 scripts/prepare_letter_n8n.py`. Review draft di `private/`, buat dua workflow baru di n8n, lalu aktifkan. Workflow RAY AI/Telegram lama tetap berjalan.
4. Jalankan impor Sheet secara dry run, kemudian `--apply`. Verifikasi 57 baris historis. Lakukan impor surat historis setelah admin pertama terdaftar.
5. Push source yang aman ke `raykerja/Suportmarketing`, aktifkan GitHub Pages branch `main` root, set custom domain **`marketing.raykerja.cloud`**. Pada DNS Hostinger, buat CNAME `marketing` → `raykerja.github.io`. **Jangan ubah record apex `@`, `www`, MX, SPF, atau DKIM.** Verifikasi resolusi DNS dan HTTPS.
6. Jalankan `scripts/configure_auth.py --apply`, undang `yasir@raykerja.cloud` dengan `scripts/invite_admin.py --apply`, lalu `scripts/add_member.py --apply`. Akun pertama menjadi admin. Masuk lewat link undangan dan buat kata sandi.
7. Dari menu Pengaturan, tetapkan folder Drive Yasir. Uji satu riset dan satu surat. Verifikasi hasil di preview, Supabase, dan file di folder Drive. Baru setelah itu undang staf tambahan dari halaman dan tetapkan folder masing-masing.

DNS subdomain mengikuti [panduan GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site). Propagasi DNS dapat membutuhkan waktu.

## Keterbatasan dan pemulihan

- Surat saat ini berbasis template yang dapat diedit, belum penulisan AI generatif dari chat RAY AI. Salinan Drive berupa teks `.txt`; cetak PDF tersedia dari browser. Tinjau isi surat sebelum dikirim.
- Akun Drive n8n harus diberi izin Editor pada setiap folder pengguna. Jika file gagal dibuat, cek permission folder, masa berlaku OAuth, dan eksekusi n8n. Untuk riset, cek status `partial`; untuk surat, cek `drive_status=error`.
- Jika webhook gagal, cek eksekusi workflow, secret, callback HTTP, dan log Edge Function. Respons webhook awal hanya tanda proses diterima.
- Rollback: nonaktifkan dua workflow Raykerja, kembalikan CNAME `marketing` jika ada nilai sebelumnya, dan rollback source GitHub. Data Supabase tidak dihapus otomatis. Portal RAY AI lama tetap independen.
