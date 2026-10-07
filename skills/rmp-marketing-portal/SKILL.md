---
name: rmp-marketing-portal
description: Lanjutkan atau audit portal marketing.raykerja.cloud dari raykerja/Suportmarketing, termasuk Supabase Marketing, AI pencarian, Sales Visit, klien aktif, dan integrasi n8n/Drive. Gunakan hanya untuk proyek portal Marketing RAY ini.
---

# Portal Marketing RAY

Gunakan repository `raykerja/Suportmarketing` branch `main` sebagai source resmi. Temukan checkout yang aktif, lalu baca `AGENTS.md`, `PROJECT_MEMORY.md`, dan `PROJECT_HANDOFF.md`; lanjutkan ke README, changelog, log proses, dan hasil uji sesuai tugas. Catatan memori memiliki tanggal: verifikasi kondisi aktual, jangan menganggapnya status permanen.

Pertahankan HTML/CSS/JavaScript statis di GitHub Pages, Supabase sebagai database utama, dan alur n8n → Google Sheet/Drive yang sudah berjalan. Periksa `git status`, remote, source, schema/policy, Edge Function, serta workflow yang relevan sebelum revisi. Ubah sesedikit mungkin dan cek hasil pada sistem tujuan.

Bedakan data aktif dari pratinjau. Sales Visit, target, riset, surat, dan penawaran sudah memakai Supabase. Progres/tindak lanjut aktif sejak 7 Oktober 2026 (`progressEnabled: true`, tabel `marketing_progress*` dengan RLS, tulis hanya lewat Edge Function). Client Active dan PIC Visit masih pratinjau sampai tabelnya dibuat; jangan mengklaim data pratinjau tersimpan hanya karena UI sudah ada.

Backup kunjungan + progres ke folder Drive staf berjalan tanpa n8n: Edge Function `backupOwnerToDrive` memanggil Apps Script `apps-script/drive-gateway/` (secret `DRIVE_GATEWAY_URL`/`DRIVE_GATEWAY_SECRET`, ulang 3x). Uji dengan `curl -L -d ...` tanpa `-X POST`; perubahan skrip butuh Deployment versi baru. Surat, riset, dan penawaran masih lewat n8n.

Untuk keamanan, periksa RLS **dan** grant pada setiap tabel baru, akses anonim, isolasi pemilik/staf lain/admin, bucket Storage, serta jalur Edge Function yang memakai service key. Pencarian AI memakai secret server `OPENAI_API_KEY`; periksa keberadaannya tanpa mencetak nilainya. Status secret dan source yang benar belum sama dengan uji jawaban AI setelah login.

Jangan simpan credential atau data klien di Git. Ikuti kebijakan `rmp-master` dan `AGENTS.md`: backup bila relevan, uji sebelum deploy, dan minta persetujuan eksplisit untuk setiap push, migration, perubahan produksi, atau tindakan destruktif yang belum diinstruksikan pengguna. Catat hasil serta batas pengujian di dokumen proyek.
