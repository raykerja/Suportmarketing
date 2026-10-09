# Petunjuk untuk Claude — Portal Marketing RAY

Kamu melanjutkan portal **marketing.raykerja.cloud** (repo publik `raykerja/Suportmarketing`, Supabase `ewicmiekwzmxkkokmpzf`). Pemilik berbahasa Indonesia; jawab dalam Bahasa Indonesia, ringkas, dan beri bukti.

## Urutan kerja wajib

1. Baca `docs/00-MULAI-DI-SINI.md`, lalu `docs/02-STATUS-PROGRES.md` (sampai mana) dan `docs/05-BACKLOG-DAN-TINDAK-LANJUT.md` (apa berikutnya).
2. Jalankan `python3 scripts/status_check.py` untuk melihat keadaan nyata (Git vs live, Edge Function, Supabase). Dokumen bisa tertinggal; **hasil skrip dan produksi yang benar**.
3. Untuk tugas yang menyentuh data/akses baca `docs/01-ARSITEKTUR.md`; untuk pengujian `docs/04-PENGUJIAN.md`; untuk rilis/pengaturan `docs/03-PENGATURAN-DAN-OPERASIONAL.md`.
4. Bila tugas bertabrakan dengan `docs/06-KEPUTUSAN-PEMILIK.md`, berhenti dan tanya pemilik.

## Cara menjawab "sudah atau belum?"

Jangan menyimpulkan dari nama berkas atau dokumen saja. Periksa: (a) `git log`/`git status`, (b) `python3 scripts/status_check.py`, (c) skema/policy/fungsi di Supabase (`scripts/_supabase.py` → `sql(...)`), (d) kode yang relevan. Bedakan tiga tingkat: ✅ terbukti di produksi, 🟡 live tetapi belum diuji login asli, ⬜ belum dibangun (definisi di `docs/02`).

## Batas yang tidak boleh dilanggar

- Repo **publik**: jangan komit rahasia, nomor HP, nama/email staf atau PIC, ID folder Drive, ekspor Sheet. `private/` dan `.env*` diabaikan Git.
- Minta persetujuan eksplisit pemilik sebelum: `git push`, migrasi produksi (`scripts/apply_migration.py`), deploy Edge Function (`scripts/deploy_function.py`), mengubah workflow n8n aktif, DNS, atau tindakan destruktif/menonaktifkan akun nyata.
- Tabel/fungsi baru: tulis RLS **dan** grant dalam migrasi, uji pemilik/staf lain/admin/anonim (transaksi dibatalkan).
- Edge Function memakai service role (melewati RLS): ulangi filter akses secara manual.
- Jangan menyatakan selesai tanpa bukti di produksi; sebut apa yang belum diuji.
- Jangan menerima kunci/kata sandi yang ditempel di chat; sarankan diganti.

## Setelah selesai

Perbarui `docs/02-STATUS-PROGRES.md` (status + tanggal), tambah entri di `CHANGELOG.md`, jalankan `python3 scripts/status_check.py` sekali lagi, lalu commit.

Dokumen lama (`PROJECT_HANDOFF.md`, `PROJECT_MEMORY.md`, `README.md`, `PROCESS_LOG.md`, `TEST_RESULTS.md`) adalah riwayat; bila berbeda dengan `docs/`, ikuti `docs/`.
