# Memori proyek Marketing RAY

**Diperbarui:** 7 Oktober 2026 (malam). Ini adalah catatan kelanjutan, bukan bukti bahwa status produksi tetap sama pada hari lain. Verifikasi ulang sebelum perubahan. Baca `AGENTS.md` dan `PROJECT_HANDOFF.md` untuk aturan serta peta sistem lengkap.

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

**Rilis 7 Oktober 2026:** Menu upload Excel akun staf di Pengaturan admin sudah dipush lewat commit `cea2994` dan terbit di GitHub Pages; enam aset live cocok dengan source. Parser memakai file vendor lokal `read-excel-file` MIT versi 9.3.10, validasi ada di `staff-import.mjs`, dan pembuatan akun memakai `create_staff` per baris. Interaksi setelah login admin dan pembuatan akun nyata belum diuji.

1. Periksa `git status`, `origin/main`, dokumen handoff, changelog, log proses, dan hasil uji; cocokkan lagi dengan produksi sebelum menyunting.
2. Uji satu pencarian nyata setelah login sah. Pastikan tombol **Cari dengan AI**, sumber sesuai hak akun, jawaban merujuk sumber, dan kegagalan provider terlihat jelas. Hindari data uji calon klien fiktif di produksi.
3. Sebelum membangun data Client Active, rancang kepemilikan PIC, grant minimum, RLS, policy Storage, dan uji isolasi dua akun. Pertahankan Sales Visit dan preview yang ada sampai pengganti tervalidasi.
4. Perubahan produksi, migration, deploy, dan push baru memerlukan instruksi eksplisit untuk tindakan tersebut sesuai `AGENTS.md`. Dokumentasikan hasil nyata; bedakan uji source, API anonim, dan uji end-to-end setelah login.

## Status akhir 7 Oktober 2026 (malam) — lanjutkan dari sini

- **Tahap 1 selesai:** backup kunjungan ke Drive staf. **Tahap 2 selesai:** progres aktif (migration `20261004_marketing_progress.sql` terpasang, `progressEnabled: true`), uji isolasi di DB lolos (staf A tidak melihat/menulis data staf B, admin melihat semua, anon ditolak).
- **Backup Drive tanpa n8n:** Edge Function `marketing` v18 → Apps Script Drive Gateway (akun pemilik yasir@raykerja.cloud, web app "Siapa saja", secret di badan permintaan) → Google Sheet "Riwayat Kunjungan - <nama>" + JSON di `_backup_mesin`. Uji 28/28 akun, folder induk tiap Sheet diverifikasi. Gateway kadang membalas error sesaat (HTML 403/404/200 atau lock timeout); Edge mengulang 3x; kegagalan tampil di web dengan tombol coba lagi.
- **Folder staf:** harus dibagikan ke yasir@raykerja.cloud sebagai Editor. Semua 28 folder sudah bisa ditulis per 7 Okt.
- **Sisa uji yang ada:** ~56 baris `[UJI SISTEM]` di tab DataMarketing (Google Sheet) belum dihapus; interaksi tombol web dengan sesi staf asli dan tampilan HP belum diuji.
- **Berikutnya (keputusan pemilik):** (1) retry otomatis terjadwal untuk backup gagal; (2) jalur Drive → Supabase: edit di Drive disimpan sebagai **versi terpisah** (asli tidak ditimpa), pemilik menekan Terapkan/Abaikan di web, deteksi lewat modifiedTime + hash kolom, hanya kolom whitelist (catatan, tanggal follow up, catatan hasil follow up, status marketing), Apps Script `onEdit` per Sheet (≈28 klik izin) atau pemeriksa 1 menit; (3) Tahap 3 Client Active/PIC dari Excel pemilik (tunggu file); (4) dashboard admin; (5) pemindahan surat/riset/penawaran dari n8n hanya bila diminta.
- Kolom Sheet progres AJ–AM pada draf lama sengaja tidak dipakai (header belum ada di Sheet).
