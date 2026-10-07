# Memori proyek Marketing RAY

**Diperbarui:** 7 Oktober 2026. Ini adalah catatan kelanjutan, bukan bukti bahwa status produksi tetap sama pada hari lain. Verifikasi ulang sebelum perubahan. Baca `AGENTS.md` dan `PROJECT_HANDOFF.md` untuk aturan serta peta sistem lengkap.

## Identitas dan arsitektur

- Source resmi: `raykerja/Suportmarketing`, branch `main`; frontend statis `marketing.raykerja.cloud` dipublikasikan lewat GitHub Pages.
- Supabase project `ewicmiekwzmxkkokmpzf` adalah database utama aktivitas Marketing dan akun. Edge Function `marketing` menangani aksi yang memerlukan server. n8n menyinkronkan sebagian hasil ke Google Sheet dan Drive; tautan Drive tersimpan pada record Supabase.
- Komponen produksi yang sudah ada: akun, target/riset, surat dan penawaran, serta Sales Visit. Kunjungan tersimpan di `marketing_visits`; pengiriman ke Sheet/Drive memakai workflow kunjungan n8n. Rincian workflow dan status uji ada di handoff.
- Database Client Active, PIC Visit, dan riwayat progres/tindak lanjut masih pratinjau di browser. `config.js` menetapkan `progressEnabled: false`. Jangan menyebutnya data produksi atau menyalakan backend tanpa rancangan dan izin produksi tersendiri.

## Status keamanan yang diperiksa 7 Oktober 2026

- Ketujuh tabel `marketing_*` yang ada memakai RLS. Role `anon` tidak mendapat izin baca/tulis; uji Data API tanpa login untuk ketujuh tabel ditolak HTTP 401.
- Bucket `marketing-visit-photos` privat; signup publik nonaktif; tabel Marketing tidak masuk publikasi Realtime. Admin/server dengan service key tetap dapat melewati RLS, sehingga key tersebut harus tetap di server.
- Izin bawaan untuk **tabel baru** masih luas. Sebelum membuat database klien, tetapkan grant dan RLS secara eksplisit dalam migration, lalu uji akses anonim, staf pemilik, staf lain, dan admin. Sebagian grant tulis pada tabel lama lebih luas daripada kebutuhan browser meski policy saat audit menolaknya.
- Audit ini tidak mengubah database dan bukan bukti uji isolasi dua akun. Pengaturan file di Google Drive memiliki izin tersendiri dan perlu diperiksa ketika alur file diaktifkan.

## Status AI yang diperiksa 7 Oktober 2026

- Secret bernama `OPENAI_API_KEY` sudah tercatat di Supabase Edge Functions; **jangan** menyalin nilainya ke Git, browser, dokumen, atau chat. Fungsi `marketing` versi 12 aktif; source produksi identik dengan `supabase/functions/marketing/index.ts` di repository pada saat audit.
- Pencarian memakai `gpt-6-luna`, `reasoning_effort: none`, dan maksimal 400 token jawaban; batas penggunaan 30 permintaan per akun per hari (Asia/Jakarta). Pencarian hanya mencakup record terbaru dan tautan Drive yang sudah tercatat di Supabase.
- Uji tanpa login dan token salah ditolak HTTP 401. Pada saat audit belum ada pemakaian AI hari itu dan **belum ada uji jawaban AI dengan akun sah**. Kehadiran secret saja tidak membuktikan validitas key atau keberhasilan respons model.

## Lanjutkan dari sini

1. Periksa `git status`, `origin/main`, dokumen handoff, changelog, log proses, dan hasil uji; cocokkan lagi dengan produksi sebelum menyunting.
2. Uji satu pencarian nyata setelah login sah. Pastikan tombol **Cari dengan AI**, sumber sesuai hak akun, jawaban merujuk sumber, dan kegagalan provider terlihat jelas. Hindari data uji calon klien fiktif di produksi.
3. Sebelum membangun data Client Active, rancang kepemilikan PIC, grant minimum, RLS, policy Storage, dan uji isolasi dua akun. Pertahankan Sales Visit dan preview yang ada sampai pengganti tervalidasi.
4. Perubahan produksi, migration, deploy, dan push baru memerlukan instruksi eksplisit untuk tindakan tersebut sesuai `AGENTS.md`. Dokumentasikan hasil nyata; bedakan uji source, API anonim, dan uji end-to-end setelah login.
