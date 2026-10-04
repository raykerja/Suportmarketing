# Petunjuk agen untuk proyek Support Marketing RMP

Mulai dari `PROJECT_HANDOFF.md` dan `README.md`; lanjutkan dengan `CHANGELOG.md`, `PROCESS_LOG.md`, dan `TEST_RESULTS.md` sesuai pekerjaan. Pertahankan arsitektur HTML/CSS/JavaScript, Supabase, n8n, Google Sheet, dan Drive yang sudah berjalan. Lakukan perubahan minimum yang kompatibel dengan fitur lama. Bahasa komunikasi dengan pemilik proyek: Indonesia.

Jangan menaruh password, token, service role key, webhook secret, credential OAuth, data klien, atau ekspor workflow privat di Git. `config.js` hanya boleh berisi Supabase **publishable key**. `private/` dan `.env*` tetap diabaikan Git.

Menu Progres dan Klien Aktif masih pratinjau; jangan menyatakan datanya tersimpan atau mengaktifkan backend tanpa memeriksa status sistem dan persetujuan. Sebelum push/deploy production, migrasi database, perubahan n8n aktif, DNS, atau tindakan destruktif, minta persetujuan eksplisit untuk tindakan tersebut. Uji dan verifikasi hasil pada sistem tujuan; laporkan batas pengujian secara jujur.
