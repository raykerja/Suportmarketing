# Pengaturan & operasional

## 1. Akses yang harus diberikan pemilik kepada staf pengembang

Masing-masing **terpisah**; GitHub saja tidak cukup.

| Layanan | Untuk apa | Cara memberi |
| --- | --- | --- |
| GitHub `raykerja/Suportmarketing` | Membaca dan push kode | Undang sebagai collaborator (tulis). Repositori publik, jadi membaca tidak perlu izin |
| Supabase proyek `ewicmiekwzmxkkokmpzf` | Migrasi, deploy Edge Function, membaca data | Undang ke organisasi/proyek di dashboard Supabase **atau** beri token akses pribadi (Account → Access Tokens) khusus staf itu |
| n8n perusahaan | Mengubah workflow riset/surat/penawaran/kunjungan | Akun n8n atau API key; hanya bila tugasnya menyentuh n8n |
| Google Workspace (Sheet `MARKETING RAYMP 2026`, folder Drive, Apps Script Drive Gateway) | Cadangan Drive, sinkron Sheet | Bagikan sheet/skrip ke akun staf; Apps Script berjalan atas akun pemilik |
| Akun uji portal | Menguji tampilan | Buat akun staf/admin uji lewat Pengaturan; hapus/nonaktifkan setelah selesai |

Rotasi/pencabutan: bila staf berhenti, cabut collaborator GitHub, undangan Supabase, token pribadinya, dan akun uji.

## 2. Rahasia: apa saja dan di mana (tanpa nilai)

Tidak ada yang boleh masuk Git, chat, atau URL.

| Nama | Letak | Dipakai oleh |
| --- | --- | --- |
| Token Management API Supabase (proyek ini) | File pemilik `~/.supabase_suportmarket_apikey_key` atau env `SUPABASE_ACCESS_TOKEN` | `scripts/*` (migrasi, deploy, status) |
| `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, dst. | Secret Edge Function (otomatis dari Supabase) | Edge Function |
| `OPENAI_API_KEY` | Supabase → Edge Functions → Secrets | Asisten AI |
| `MARKETING_WEBHOOK_SECRET` | Secret Edge Function + header workflow n8n | Callback n8n ↔ Edge Function |
| `MARKETING_N8N_WEBHOOK`, `MARKETING_N8N_LETTER_WEBHOOK`, `MARKETING_N8N_OFFER_WEBHOOK` | Secret Edge Function | Pemicu workflow n8n |
| `DRIVE_GATEWAY_URL`, `DRIVE_GATEWAY_SECRET` | Secret Edge Function; kode privat Apps Script di `private/Code.gs` (tidak di Git) | Cadangan Drive |
| Token GitHub akun `raykerja` | File pemilik `~/.github_raykerja_apikey_key` | Push dari mesin pemilik |
| Kredensial n8n, OAuth Google | Pengelola kredensial n8n / Google | n8n |

Memeriksa keberadaan secret tanpa membaca nilainya: dashboard Supabase → Edge Functions → Secrets, atau `GET /v1/projects/{ref}/secrets` (hanya mengembalikan nama).

## 3. Tugas admin sehari-hari (di web, login sebagai admin)

| Tugas | Di mana |
| --- | --- |
| Membuat akun staf | Pengaturan → Akun tim Marketing (satu per satu atau unggah Excel; sandi minimal 12 karakter, dicatat saat dibuat karena tidak ditampilkan lagi) |
| Mengganti nama / folder Drive staf | Pengaturan → daftar akun → "Simpan nama" / "Simpan folder" |
| Menonaktifkan staf yang keluar | Pengaturan → daftar akun → **Nonaktifkan akun** (login diblokir, data tetap ada). **Aktifkan akun** membukanya lagi |
| Reset kata sandi staf | Pengaturan → **Reset kata sandi** → catat sandi yang tampil (hilang dalam 2 menit) dan sampaikan ke staf |
| Mengubah data/PIC client, menambah client | Active Client → Database Client Active → **Ubah** / **+ Tambah client** |
| Mengisi masa kontrak | Form Ubah: Kontrak mulai & berakhir (tanggal) |
| Mengarsipkan client yang berhenti | Tombol **Arsipkan** (alasan wajib); **Aktifkan lagi** untuk mengembalikan |
| Akun PIC baru dibuat → hubungkan | **Pemetaan PIC → akun**: pilih akun pada baris PIC itu. Nama PIC baru: isian "Nama PIC baru" |
| Melihat siapa mengubah apa | **Riwayat perubahan** |
| Salinan data / rapat | **Ekspor Excel** (mengikuti filter) |
| Memantau kunjungan | Kartu "Ringkasan kunjungan per PIC Korlap" + filter "Belum pernah dikunjungi" |

## 4. Alur kerja pengembangan dan rilis

```
1. python3 scripts/status_check.py            # keadaan awal
2. ubah kode di cabang kerja / langsung main sesuai kesepakatan
3. uji (docs/04-PENGUJIAN.md)
4. [izin pemilik] migrasi:  python3 scripts/apply_migration.py supabase/migrations/<berkas>.sql
5. [izin pemilik] Edge Function: python3 scripts/deploy_function.py
6. naikkan versi cache ?v= di index.html bila JS/CSS berubah
7. [izin pemilik] git push origin main        # GitHub Pages terbit sendiri (1-2 menit)
8. python3 scripts/status_check.py            # pastikan live == repo
9. perbarui docs/02-STATUS-PROGRES.md + CHANGELOG.md, commit, push
```

Catatan:
- **Berkas migrasi harus idempoten untuk pembacaan manusia, tetapi dijalankan sekali.** `apply_migration.py` membungkusnya dalam transaksi; gagal = batal semua. Jangan menjalankan ulang migrasi yang sudah terpasang (banyak memakai `create table` tanpa `if not exists`).
- Urutan nama berkas migrasi tidak dilacak oleh Supabase CLI (diterapkan manual lewat API). **Catatan penerapan ada di `docs/02`**; jangan menebak dari nama berkas.
- Edge Function dikirim sebagai **satu berkas** `index.ts` (mengimpor `npm:@supabase/supabase-js@2`). Tidak ada langkah bundel.
- GitHub Pages: push ke `main`; tab Actions menunjukkan status. Domain di `CNAME`.
- Setelah mengubah Apps Script: **Deploy → Kelola deployment → versi baru**, jika tidak, perubahan tidak berlaku. Uji dengan `curl -L -d ...` (tanpa `-X POST`).
- `config.js` hanya berisi URL dan *publishable key* — aman di Git. Jangan menaruh service role key di mana pun di frontend.

## 5. Mengubah pengaturan tertentu

| Ingin mengubah | Lakukan |
| --- | --- |
| Batas pencarian AI per hari | Argumen `p_limit: 30` pada pemanggilan `marketing_ai_reserve` di `index.ts` |
| Model AI | `model: 'gpt-6-luna'` di `ai_search` (`index.ts`); `reasoning_effort: 'none'` penting agar jawaban tidak kosong |
| Teks/aturan prompt asisten | Pesan `system` di `ai_search` |
| Kategori client yang diizinkan | Cek `kategori` di RPC `marketing_save_client` dan opsi di `index.html` (`ac-f-kategori`) |
| Jenis penawaran / tahap | Daftar di `clients-preview.js` (`stages`) **dan** `check` di migrasi `marketing_client_offers` |
| Domain login staf internal | `staffLoginDomain` di `app.js` dan logika `create_staff` di Edge Function |
| Redirect URL Auth | Dashboard Supabase → Authentication → URL Configuration (`scripts/configure_auth.py` memuat nilai awal) |

## 6. Keadaan yang perlu diwaspadai

- **Repositori publik**: kode terbaca siapa saja. Jangan mengomit data client/staf, ekspor Sheet, atau `private/`.
- Admin = super admin: semua admin bisa menonaktifkan akun, reset sandi, dan melihat semua data.
- Edge Function memakai service role dan **melewati RLS**. Untuk fitur baru di sana, terapkan filter akses manual seperti `visibleClients()`.
- Akun staf berformat email internal tidak bisa menerima email; pemulihan sandi hanya lewat admin (reset).
