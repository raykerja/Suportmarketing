# Raykerja Marketing

Halaman Marketing PT Ray Mitra Perkasa. Source berada di GitHub Pages; data bisnis berada di Supabase. Riset calon klien memakai salinan workflow n8n khusus Raykerja dengan callback ke Supabase Edge Function. Workflow dan portal RAY AI lama tidak diubah.

## Struktur

| Lokasi | Fungsi |
| --- | --- |
| `index.html`, `style.css`, `app.js` | Halaman responsif: riset, database target, surat/penawaran |
| `config.js` | URL dan **publishable key** Supabase untuk browser |
| `supabase/migrations/20261004_marketing.sql` | Tabel, indeks, RLS |
| `supabase/functions/marketing/index.ts` | Pemicu n8n dan penerima callback |
| `scripts/prepare_n8n.py` | Membuat salinan workflow dari versi live ke `private/` |
| `scripts/configure_auth.py`, `scripts/invite_admin.py`, `scripts/add_member.py` | URL Auth, undangan admin, dan akses anggota |
| `scripts/import_sheet.py`, `scripts/import_legacy_letter.py` | Impor 57 target dan 1 draft surat historis |

`private/` dan `.env` diabaikan Git. Jangan masukkan management key, service role key, secret webhook, data target, atau export workflow dengan credential ke repo publik.

## Sumber dan alur data

Sumber historis: Google Sheet `Data hasil Marketing`, tab `Sheet1`, 38 kolom, 57 baris data pada 4 Oktober 2026; database RAY AI produksi memiliki satu percakapan surat, dua pesan, dan nol lampiran. Ekspor lokal ada di `private/` dan tidak dipublikasikan. Riset baru: browser → Edge Function `marketing` → webhook n8n `/webhook/raykerja-target` → callback Edge Function → `marketing_researches` dan `marketing_leads`. Draft surat disimpan di `marketing_letters`.

Data bisa dibaca hanya oleh pengguna Supabase Auth yang tercatat di `marketing_members`. Surat hanya dapat dibaca dan diubah oleh pemiliknya. Database target dan hasil riset dapat dibaca bersama oleh anggota Marketing yang terdaftar. Pendaftaran akun Supabase lain tidak otomatis memberi akses.

## Konfigurasi dan deployment

1. Jalankan migration SQL setelah backup dan approval perubahan produksi. Pastikan empat tabel ada dan RLS aktif.
2. Set dua Edge Function secrets: `MARKETING_WEBHOOK_SECRET` dari file lokal `~/.n8n_target_key` dan `MARKETING_N8N_WEBHOOK` ke URL instance n8n utama + `/webhook/raykerja-target`. Jangan taruh nilainya di Git.
3. Deploy Edge Function `marketing` dengan `verify_jwt = false`. Function tetap memverifikasi JWT dan membership untuk riset serta `X-RAY-Secret` untuk callback.
4. Jalankan `python3 scripts/prepare_n8n.py`, review ringkasannya, lalu buat workflow baru dari draft privat dan aktifkan. Pastikan URL callback mengarah ke Supabase dan tidak ada node Telegram/Google Sheets. Workflow lama tetap aktif sampai pengujian baru PASS.
5. Jalankan `python3 scripts/import_sheet.py` untuk dry run, lalu dengan `--apply` setelah approval. Verifikasi jumlah row target `source_row is not null` = 57.
6. Push source saja ke repo `raykerja/Suportmarketing`, aktifkan GitHub Pages dari branch `main` root, lalu pasang custom domain `raykerja.cloud` sebelum mengubah DNS.
7. Pada Hostinger, ganti record A `@` lama `2.57.91.91` dengan empat IP GitHub Pages: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`. Ubah CNAME `www` ke `raykerja.github.io`. Record MX/SPF/DKIM Google Workspace jangan diubah. Verifikasi DNS dan HTTPS.
8. Jalankan `scripts/configure_auth.py --apply` untuk Site URL/Redirect URL dan menutup signup publik. Lalu `scripts/invite_admin.py --apply` untuk mengundang `yasir@raykerja.cloud`. Proyek saat diperiksa memiliki 0 user. Jalankan `scripts/add_member.py --apply`; setelah itu `scripts/import_legacy_letter.py --apply`. Verifikasi satu surat dengan `legacy_source` dan lakukan uji login. Undangan email dapat kedaluwarsa; kirim ulang bila diperlukan.

Urutan domain mengikuti [dokumentasi GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site). DNS bisa memerlukan waktu propagasi hingga 24 jam.

## Penggunaan

Masuk dengan akun yang diundang admin. Menu **Cari Target Market** menerima jenis target, wilayah, bidang, dan jumlah maksimum 10. Status proses dapat dipantau pada daftar riset. Hasil dan sumber referensi tampil ketika callback selesai. Menu **Database Target** menampilkan riwayat dan hasil baru. Menu **Surat & Penawaran** membuat draft format bisnis yang dapat diedit dan disimpan; tombol Cetak / PDF memakai dialog cetak browser.

## Keterbatasan dan troubleshooting

- Draft surat saat ini berbasis template. Fitur AI generatif di chat RAY AI lama belum dipindah karena kredensial model untuk layanan baru belum disediakan. Tinjau draft secara manual sebelum dikirim.
- Akun pertama harus dibuat di Supabase Auth. Tanpa user terdaftar, halaman login tersedia tetapi tidak dapat digunakan.
- Riset berstatus `processing` terlalu lama: periksa eksekusi workflow `Raykerja Marketing - Target Research (Supabase)`, callback HTTP, serta log Edge Function. Keberhasilan webhook awal tidak membuktikan data tersimpan.
- Jika data target historis kosong, periksa migration, hasil `import_sheet.py`, RLS, dan jumlah baris `marketing_leads`.
- Jika situs masih halaman parkir Hostinger, periksa GitHub Pages custom domain, record A/CNAME, lalu tunggu propagasi.

## Rollback

DNS `@` dan `www` dapat dikembalikan ke nilai sebelumnya (`2.57.91.91` dan `raykerja.cloud`). Nonaktifkan workflow Raykerja yang baru; workflow RAY AI lama tidak disentuh. Source GitHub dapat dikembalikan ke commit sebelumnya. Jangan hapus tabel atau data Supabase sebagai bagian rollback tanpa keputusan terpisah.
