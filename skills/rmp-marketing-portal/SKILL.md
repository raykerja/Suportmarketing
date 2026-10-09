---
name: rmp-marketing-portal
description: Lanjutkan, audit, atau jawab "sudah atau belum?" untuk portal marketing.raykerja.cloud (repo raykerja/Suportmarketing, Supabase ewicmiekwzmxkkokmpzf) — Client Active + PIC, PIC Visit, Monitoring penawaran ulang, Sales Visit, daftar harga, RAB/penawaran n8n, asisten AI, alat admin. Gunakan hanya untuk proyek portal Marketing RAY ini.
---

# Portal Marketing RAY

## Mulai (urutan tetap)
1. Baca `CLAUDE.md`, lalu `docs/00-MULAI-DI-SINI.md` → `docs/02-STATUS-PROGRES.md` (sampai mana) → `docs/05-BACKLOG-DAN-TINDAK-LANJUT.md` (apa berikutnya). Arsitektur: `docs/01`; rilis/pengaturan: `docs/03`; pengujian: `docs/04`; keputusan pemilik: `docs/06`.
2. Jalankan `python3 scripts/status_check.py` (hanya-baca). **Hasil skrip + produksi lebih benar daripada dokumen bertanggal.**
3. Dokumen lama (`PROJECT_HANDOFF.md`, `README.md`, dll.) = riwayat; bila bertentangan dengan `docs/`, ikuti `docs/`.

## Menjawab "sudah atau belum?"
Jangan menyimpulkan dari nama berkas. Periksa `git log/status`, `status_check.py`, skema/policy/fungsi (`scripts/_supabase.py` → `sql(...)`), dan kodenya. Pakai tiga tingkat: ✅ terbukti di produksi · 🟡 live tetapi belum diuji login asli (hanya DB/RLS + browser dengan mock) · ⬜ belum dibangun. Sebut batas uji apa adanya.

## Peta sistem (ringkas; rinci di docs/01)
Frontend statis GitHub Pages (`index.html`, `app.js`, `clients-preview.js` = kode produksi PIC Visit/Monitoring, `theme-ray.css`) → Supabase Auth + Postgres (RLS) + Edge Function `marketing` (satu berkas `supabase/functions/marketing/index.ts`) → n8n (riset, surat, **penawaran web = Surat + RAB**, sinkron kunjungan) + Apps Script Drive Gateway (cadangan Drive staf, tanpa n8n) + OpenAI (asisten AI). Peran: `staff` dan `admin` (= super admin).

Model client: `marketing_clients` + `marketing_client_pics` + `marketing_pic_aliases` (nama PIC → akun; `user_id` kosong = PIC belum punya akun). Staf hanya melihat client **aktif** yang PIC-nya dipetakan ke akunnya; admin semua. Perubahan admin **hanya lewat RPC** (`marketing_save_client`, `marketing_set_client_status`, `marketing_set_pic_alias`, `marketing_set_member_name`, `marketing_save_price_item`) dengan kunci optimistik dan jejak di `marketing_client_changes`. Daftar harga: harga beli hanya admin (tabel), staf lewat view `marketing_price_list` (harga jual).

## Aturan kerja
- Perubahan minimum; jangan tulis ulang. Persetujuan eksplisit pemilik sebelum push, migrasi produksi (`scripts/apply_migration.py`), deploy (`scripts/deploy_function.py`), n8n aktif, DNS, atau menonaktifkan akun nyata.
- Tabel/fungsi baru: RLS **dan** grant eksplisit; uji pemilik / staf lain / admin / anonim dengan transaksi dibatalkan; untuk Edge Function pakai akun uji sementara dan bersihkan (`docs/04`). Edge Function melewati RLS → ulangi filter akses manual (`visibleClients()`); ubah policy = ubah kode itu juga.
- **Repo PUBLIK**: tanpa nama staf/PIC, nomor HP, email, ID folder, ekspor data, token. Data impor di `private/` (gitignored), `*.xlsx` diabaikan.
- Naikkan `?v=` di `index.html` saat JS/CSS berubah. Setelah push cek **Actions** (`conclusion: success`) dan `status_check.py` (live = repo). Berkas `.nojekyll` wajib ada (tanpa itu `{{ }}` di dokumen membuat build Jekyll gagal dan situs berhenti terbit).
- Setelah selesai: perbarui `docs/02-STATUS-PROGRES.md` + `CHANGELOG.md`.

## Jebakan yang sudah terjadi
- Build Pages gagal karena `{{ }}` di markdown → `.nojekyll`.
- Memeriksa kode node n8n yang memuat secret mencetak secret → mask sebelum mencetak; jika terlanjur, rotasi.
- `select` dalam satu pernyataan tidak melihat efek fungsi di pernyataan itu (uji RLS: pisahkan); `user_id` harus di-resolve sebelum `set local role authenticated`.
- Status "tidak ada error" pada Playwright dengan mock ≠ bukti data asli.
- Penomoran surat (counter) terpakai oleh tiap eksekusi nyata generator penawaran: uji RAB lewat workflow n8n sementara, bukan webhook produksi.

## RAB/penawaran (n8n `R7kXoTLBk8X0d4cy`, node `Validasi Penawaran Web` + `Isi Data RAB`)
Template RAB Drive tidak diubah; n8n menyalin lalu menulis sel lewat `batchUpdate`: `G10` = Gaji Pokok (opsional, default = UMK), BPJS (JKK/JKM/JHT/Kesehatan) = `=UMK*persentase` ditulis eksplisit per sel (acuan **UMK Setempat**, bukan gaji pokok), Kompensasi & JP dikosongkan dengan keterangan "Sesuai Kebijakan Client". Ubah via backup → patch dengan assert → uji di workflow sementara → `PUT` (lihat skill `n8n` §9). Template di `n8n/offer-documents.template.json` harus ikut diperbarui.

## Belum dikerjakan (lihat docs/05)
Uji manusia (staf & admin asli), 4 PIC tanpa akun, tanggal kontrak 272 client, cadangan Drive untuk PIC Visit/penawaran, foto PIC Visit, retry cadangan, pengingat otomatis, tingkat super admin, daftar nama oleh AI, verifikasi 6 harga seragam, penyambungan daftar harga ke RAB.
