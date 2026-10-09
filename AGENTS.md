# Petunjuk agen untuk proyek Support Marketing RMP

**Mulai dari `CLAUDE.md` dan folder `docs/`** (`docs/00-MULAI-DI-SINI.md` → `docs/02-STATUS-PROGRES.md`). Dokumen lama (`PROJECT_MEMORY.md`, `PROJECT_HANDOFF.md`, `README.md`, `CHANGELOG.md`, `PROCESS_LOG.md`, `TEST_RESULTS.md`) adalah riwayat bertanggal; bila berbeda dengan `docs/`, ikuti `docs/` dan verifikasi dengan `python3 scripts/status_check.py`.

Pertahankan arsitektur HTML/CSS/JavaScript, Supabase, n8n, Google Sheet, dan Drive yang sudah berjalan. Lakukan perubahan minimum yang kompatibel dengan fitur lama. Bahasa komunikasi dengan pemilik proyek: Indonesia.

Repositori ini **publik**. Jangan menaruh password, token, service role key, webhook secret, credential OAuth, data klien, nomor HP, nama/email staf, atau ekspor workflow privat di Git. `config.js` hanya boleh berisi Supabase **publishable key**. `private/` dan `.env*` tetap diabaikan Git.

Client Active, PIC Visit, Monitoring & Tindaklanjut, dan progres kini **data produksi** di Supabase (bukan pratinjau lagi); status rinci tiap fitur ada di `docs/02-STATUS-PROGRES.md`. Sebelum push/deploy production, migrasi database, perubahan n8n aktif, DNS, atau tindakan destruktif, minta persetujuan eksplisit untuk tindakan tersebut. Uji dan verifikasi hasil pada sistem tujuan; laporkan batas pengujian secara jujur.
