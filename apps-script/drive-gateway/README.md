# Drive Gateway (Apps Script)

Pintu penulis ke Google Drive staf, dipanggil Edge Function `marketing`. Tanpa n8n dan tanpa kunci JSON Google.

Pasang (sekali, oleh pemilik akun Drive):
1. script.google.com → Proyek baru → tempel isi `Code.gs` (versi dengan secret asli ada di `private/Code.gs`, jangan di-commit).
2. Deploy → Deployment baru → Aplikasi web → Jalankan sebagai: **Saya**, Akses: **Siapa saja**.
3. Setujui izin Drive/Sheets. Salin URL `/exec`, lalu simpan sebagai secret `DRIVE_GATEWAY_URL` di Supabase.

Secret `DRIVE_GATEWAY_SECRET` di Supabase harus sama dengan konstanta `SECRET`. Perubahan kode memerlukan Deployment baru (versi baru).
