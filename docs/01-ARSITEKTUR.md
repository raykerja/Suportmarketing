# Arsitektur — bagaimana sistem bekerja

## Gambaran

```
Browser staf/admin ──► GitHub Pages (HTML/CSS/JS statis, repo ini)
        │
        ├─► Supabase Auth (login username/kata sandi)
        ├─► Supabase Postgres (RLS)  ◄── baca langsung + RPC untuk perubahan tertentu
        └─► Edge Function `marketing` (aksi yang butuh service role / layanan luar)
                 ├─► n8n (riset target, surat, dokumen penawaran, sinkron kunjungan ke Google Sheet + foto Drive)
                 ├─► Apps Script "Drive Gateway" (cadangan kunjungan/progres ke folder Drive tiap staf; tanpa n8n)
                 └─► OpenAI (ringkasan jawaban asisten AI; kunci hanya di secret server)
```

Prinsip: **browser tidak pernah memegang kunci rahasia**. `config.js` hanya berisi URL Supabase dan *publishable key*. Hak akses ditegakkan di database (RLS), bukan di tampilan.

## Frontend (root repositori)

| File | Isi |
| --- | --- |
| `index.html` | Seluruh halaman: login, menu, panel (Client Active, PIC Visit, Monitoring, Sales Visit, Progress, Target, Review, Surat/Penawaran, Pengaturan) |
| `app.js` (ES module) | Logika utama: login, tab, Sales Visit, riset, penawaran, Pengaturan akun, **tabel Client Active + edit admin**, dasbor admin, riwayat perubahan, ekspor Excel, pemuatan data PIC Visit/Monitoring, jembatan `window.marketingApi` |
| `clients-preview.js` | Nama historis (dulu pratinjau). **Sekarang kode produksi** untuk PIC Visit (dua tahap), Monitoring & Tindaklanjut penawaran ulang, dan dasbor aktivitas kunjungan. Menerima data lewat event `marketing:*-snapshot` dari `app.js` |
| `style.css`, `theme-ray.css` | Gaya dan tema RAY (biru) |
| `config.js` | URL + publishable key Supabase (publik, memang boleh di Git) |
| `staff-import.mjs`, `vendor/` | Validasi impor Excel akun staf; pustaka `read-excel-file` (baca Excel) dan SheetJS `xlsx` (ekspor Excel, dimuat hanya saat tombol ekspor ditekan) |

Versi cache file ditandai `?v=...` di `index.html`; **naikkan nomor versi saat mengubah JS/CSS** agar browser staf memuat yang baru.

### Peta menu

- **Active Client, Repitching & Progress**: `1. Database Client Active` (tabel), `2. PIC Visit`, `3. Monitoring & Tindaklanjut`.
- **New Client, Visit & Progress**: Sales Visit (dua tahap + foto), Progress.
- **Target, Penawaran & Database**: Cari Target, Review Hasil, Buat Penawaran, **4. Database (Target & Harga)** — di dalamnya tiga tampilan: Database Target, Harga Seragam, Harga Peralatan.
- **Pengaturan** (ikon/tombol di header): folder Drive sendiri; untuk admin: akun tim, impor Excel akun, nonaktifkan/reset sandi, ganti nama & folder staf.
- **Asisten Marketing** (kotak pencarian di atas): jawaban AI berdasarkan data yang boleh diakses akun.

## Peran dan akses

| Peran | Hak |
| --- | --- |
| `staff` | Hanya data miliknya: Sales Visit, PIC Visit, riset/surat/penawaran yang ia buat; **client aktif yang PIC Korlap atau PIC Admin-nya dipetakan ke akunnya**; progres penawaran client itu |
| `admin` ("super admin") | Semua data; ubah/tambah/arsipkan client; ubah PIC dan pemetaan PIC→akun; buat/nonaktifkan akun, reset sandi, ganti nama & folder staf; riwayat perubahan; ekspor Excel; dasbor kunjungan |

Admin dan super admin adalah **role yang sama** (`admin`). Belum ada tingkat di antaranya (lihat backlog). Saat ini ada 4 admin dan 24 staf aktif.

Login staf memakai **username**; secara internal Supabase Auth memakai email `username@staff.marketing.raykerja.cloud` (tanpa kotak masuk sungguhan). Admin pertama memakai email sungguhan.

## Model data client dan PIC

Sumber: sheet "DATABASE CLIENT 2026" milik pemilik (274 baris, kolom NO, NAMA CLIENT, CABANG, PIC USER, NOMOR HP, PIC KORLAP, GOOGLE MAPS, KATEGORI, MASA KONTRAK, PIC ADMIN), diimpor sekali dengan `scripts/import_clients.py`. **Sejak itu database Supabase adalah sumber kebenaran**; sheet tidak disinkronkan balik.

- `marketing_clients` — satu baris per client (`source_no` = nomor di sheet, `status` aktif/arsip, `kontrak_mulai`/`kontrak_akhir` bertipe date, `masa_kontrak` = catatan teks).
- `marketing_client_pics` — relasi client ↔ alias PIC per peran (`korlap`/`admin`). Satu client bisa punya beberapa PIC.
- `marketing_pic_aliases` — **kamus nama PIC → akun portal** (`user_id`). `user_id` kosong berarti PIC itu belum punya akun; client-nya hanya terlihat admin sampai dipetakan (menu Pemetaan PIC → akun).
- `korlap_raw`/`admin_raw` di `marketing_clients` hanyalah salinan teks untuk tampilan, selalu diisi ulang oleh RPC `marketing_save_client`.

Aturan lihat client: **admin semua**; **staf** hanya `status='aktif'` yang punya relasi PIC ke alias yang `user_id`-nya dia. Aturan ini ditulis di policy RLS `marketing_clients` dan **diulang dalam kode** `visibleClients()` di Edge Function untuk asisten AI (service role melewati RLS, jadi harus disamakan manual — jika mengubah salah satu, ubah keduanya).

## Tabel Supabase (skema `public`; RLS aktif di semua)

| Tabel | Fungsi |
| --- | --- |
| `marketing_members` | Daftar akun (`role`, `active`, `display_name`, folder Drive) |
| `marketing_researches`, `marketing_leads` | Riset target pasar dan hasilnya |
| `marketing_letters`, `marketing_offers` | Surat lama dan dokumen penawaran (Docs + RAB) |
| `marketing_visits` | Sales Visit (data JSON, status sinkron Sheet, status cadangan Drive, foto) |
| `marketing_progress`, `marketing_progress_events` | Progres per Sales Visit (ditulis lewat Edge Function) |
| `marketing_clients`, `marketing_client_pics`, `marketing_pic_aliases` | Client aktif dan PIC (lihat di atas) |
| `marketing_client_changes` | **Jejak audit** perubahan client, pemetaan PIC, status arsip, nama staf |
| `marketing_pic_visits` | PIC Visit ke client aktif (tahap 1 `initial`, tahap 2 `detail`; isi di kolom JSON `data`) |
| `marketing_client_offers`, `marketing_client_offer_events` | Status & riwayat penawaran ulang per client (menu Monitoring) |
| `marketing_price_items` | Daftar harga seragam (70 item) dan peralatan (25 item). **Hanya admin** yang membaca tabel (ada harga beli/modal). Staf membaca lewat view `marketing_price_list` yang hanya memuat harga jual; harga item berstatus `perlu_verifikasi` disembunyikan dari staf |
| `marketing_ai_daily_usage` | Pembatas 30 pencarian AI/hari/akun |

Fungsi (RPC): `marketing_is_admin`, `marketing_save_client`, `marketing_set_client_status`, `marketing_set_pic_alias`, `marketing_set_member_name`, `marketing_save_price_item`, `marketing_record_client_offer` (security invoker, RLS berlaku), `marketing_record_progress`, `marketing_ai_reserve`. Fungsi `security definer` selalu memeriksa `marketing_is_admin()` di dalamnya.

Bucket Storage `marketing-visit-photos` bersifat privat.

### Pola penting di database

- Perubahan data client oleh admin **hanya lewat RPC** (bukan update tabel langsung): ada kunci optimistik `expected_updated_at` (dua admin tidak saling menimpa) dan tiap perubahan masuk `marketing_client_changes`.
- Staf **tidak punya hak tulis langsung** ke `marketing_clients`, `marketing_client_pics`, `marketing_pic_aliases`.
- `marketing_pic_visits`: staf boleh `insert` (hanya atas nama sendiri dan hanya untuk client aktif yang boleh ia lihat) dan `update` kolom `visit_stage, data, updated_at` miliknya sendiri; `owner_id` dan `client_id` tidak bisa diubah.

## Edge Function `marketing` (satu berkas: `supabase/functions/marketing/index.ts`)

Aksi: `settings`, `ai_search`, `set_folder`, `invite_member`, `create_staff`, `set_member_active`, `reset_member_password`, `save_visit`, `attach_visit_photo`, `sync_visit`, `record_progress`, `review_lead`, `generate_offer`, `generate_offer_manual`, `save_letter`, plus jalur callback n8n (dipanggil n8n dengan secret `x-ray-secret`, bukan JWT pengguna).

- Memverifikasi JWT pengguna, memeriksa `marketing_members.active`, lalu memakai service role untuk operasi yang tidak boleh dilakukan browser.
- `set_member_active` menonaktifkan akun **dan** memblokir login (ban di Supabase Auth); tidak bisa untuk akun sendiri.
- `reset_member_password` menerima sandi baru dari admin (browser membuat sandi acak 16 karakter dan menampilkannya sekali).
- `ai_search` mengumpulkan sumber (client aktif, ringkasan agregat, PIC Visit, Monitoring, Sales Visit, penawaran, target, surat) **sesuai akses akun**, lalu meminta OpenAI meringkas. Hanya agregat/ringkasan; belum bisa mendaftar nama client menurut kriteria.

## Integrasi luar

- **n8n** (instans milik perusahaan; akses lewat pemilik). Workflow aktif: riset target (`raykerja-target`), surat (`raykerja-letter`), sinkron kunjungan ke Google Sheet `DataMarketing` + foto ke Drive (`raykerja-visit`), dokumen penawaran web (`raykerja-offer`). Template tanpa kredensial di folder `n8n/`. Backup kunjungan **tidak** lagi lewat n8n.
- **Apps Script Drive Gateway** (`apps-script/drive-gateway/`): menulis cadangan kunjungan+progres (Google Sheet "Riwayat Kunjungan - <nama>" + JSON) ke folder Drive tiap staf. Dijalankan atas nama akun Workspace pemilik. Ubah skrip ⇒ buat **Deployment versi baru**.
- **Google Sheet `MARKETING RAYMP 2026`** tab `DataMarketing`: tujuan sinkron Sales Visit. Struktur kolom di `README.md`.
- **OpenAI**: model `gpt-6-luna`, `reasoning_effort: none`; kunci di secret `OPENAI_API_KEY`.

## Yang BELUM tercakup backup/sinkron

PIC Visit dan penawaran ulang (Monitoring) **hanya ada di Supabase**; belum dicadangkan ke Sheet/Drive per staf seperti Sales Visit. Lihat [05](05-BACKLOG-DAN-TINDAK-LANJUT.md).
