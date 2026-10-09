# Backlog & tindak lanjut

Urut prioritas yang disarankan. Tiap item: tujuan → pendekatan → hal yang harus diwaspadai. Tanyakan pemilik sebelum memulai item bertanda 🔶 (keputusan produk/uang/akses).

## P0 — Validasi apa yang sudah dibangun

1. **Uji manusia** (checklist di [04 bagian E](04-PENGUJIAN.md)) oleh satu staf dan satu admin asli. Tanpa ini menu 2, 3, dan tombol akun baru berstatus 🟡.
2. **Empat PIC tanpa akun**: bila pemilik membuat akunnya, petakan lewat web (tanpa kode).
3. **Isi tanggal kontrak 272 client** — tanpa ini daftar pengingat Monitoring hampir kosong. Opsi: (a) admin mengisi satu per satu; (b) 🔶 minta pemilik file Excel berisi NO + tanggal mulai + tanggal akhir, lalu buat skrip impor seperti `scripts/import_clients.py` (cocokkan lewat `source_no`, tampilkan dry-run, tulis lewat SQL ber-audit ke `marketing_client_changes`).

## P1 — Melengkapi alur kunjungan

4. **Cadangan Drive untuk PIC Visit dan penawaran ulang** — samakan dengan Sales Visit: perluas `backupOwnerToDrive` di Edge Function dan Apps Script `apps-script/drive-gateway/` agar menulis PIC Visit/Monitoring ke Sheet "Riwayat Kunjungan - <nama>" (tab terpisah) + JSON. Tambah kolom status cadangan di `marketing_pic_visits` seperti `backup_status` di `marketing_visits` (lihat migrasi `20261007_visit_backup.sql`). Perubahan Apps Script ⇒ Deployment versi baru.
5. **Foto pada PIC Visit** — saat ini disembunyikan. Pakai pola `attach_visit_photo` Sales Visit (bucket privat `marketing-visit-photos`, policy Storage per pemilik).
6. **Retry otomatis terjadwal** untuk cadangan yang gagal (Gateway Google kadang error sesaat). `pg_cron` atau Scheduled Edge Function; batasi percobaan.
7. **Pengingat otomatis** 🔶 (Telegram/WhatsApp/email) untuk follow-up jatuh tempo dan kontrak ≤90 hari. Data sudah ada (`marketing_client_offers.next_follow_up`, `kontrak_akhir`); butuh keputusan kanal dan penjadwal.

## P2 — Pengelolaan dan keamanan

8. **Tingkat super admin** 🔶 — saat ini `admin` = semua kuasa. Bila perlu pemisahan: tambahkan peran `super_admin` (check constraint `marketing_members.role`), pindahkan hak menonaktifkan akun/reset sandi/buat akun ke sana, dan perbarui `marketing_is_admin()`/Edge Function. Pastikan minimal satu super admin aktif selalu ada.
9. **Menjadikan repositori privat** 🔶 — saat ini publik. Tidak ada rahasia di dalamnya (sudah diperiksa), tetapi arsitektur dan skema terbaca umum. GitHub Pages pada repo privat butuh paket berbayar; pertimbangkan.
10. **Rotasi** token Management API/GitHub yang pernah dipakai di mesin pemilik bila ada staf yang keluar.
11. **Hapus permanen client** — sengaja tidak ada (hanya arsip) agar riwayat aman. Jika dibutuhkan, rancang RPC khusus ber-audit dan konfirmasi ganda.

## P3 — Peningkatan

12. **AI menyebut daftar nama** client menurut kriteria (mis. "client tanpa tanggal kontrak"): beri `ai_search` kemampuan daftar terbatas (maks 30 nama) untuk kueri agregat tertentu. Waspadai ukuran prompt/biaya; jawaban berasal dari sumber yang sudah difilter akses.
13. **Jalur Drive → Supabase** 🔶 (keputusan pemilik sudah ada, desain disetujui sebagian): edit di Sheet Drive staf disimpan sebagai **versi terpisah** (asli tidak ditimpa), pemilik menekan Terapkan/Abaikan di web; deteksi `modifiedTime` + hash; hanya kolom whitelist (catatan, tanggal follow up, catatan hasil follow up, status marketing); Apps Script `onEdit` per Sheet (±28 klik izin) atau pemeriksa 1 menit.
14. **Dasbor admin lanjutan**: tren kunjungan mingguan, konversi tahap penawaran, client tanpa kunjungan >90 hari. Hitung dari `marketing_pic_visits` + `marketing_client_offer_events`.
15. **Pindah surat/riset/penawaran dari n8n** hanya bila diminta pemilik.
16. **Pembersihan nama berkas**: `clients-preview.js` berisi kode produksi; ganti nama menjadi `client-activity.js` (ubah tag `<script>` di `index.html` dan dokumen ini).

## Risiko dan utang teknis yang diketahui

- **Logika akses ganda**: aturan "staf melihat client PIC-nya" ada di policy RLS **dan** `visibleClients()` (Edge Function). Ubah keduanya bersamaan, uji ulang keduanya.
- **Dasbor kunjungan baru akurat ke depan**: kunjungan sebelum portal tidak ikut; hampir semua client tampil "belum pernah dikunjungi" sampai staf mulai mencatat.
- **Uji penuh end-to-end belum ada** untuk menu 2, 3, tombol akun, dan impor akun via UI (lihat 🟡 di [02](02-STATUS-PROGRES.md)).
- **Tidak ada pelacakan migrasi otomatis** (diterapkan manual lewat API). Catat setiap penerapan di `docs/02` dan `CHANGELOG.md`.
- **Satu berkas Edge Function besar** (>700 baris). Pertimbangkan memecah bila bertambah, dengan memperhatikan cara deploy satu-berkas saat ini (`scripts/deploy_function.py`).
- **Cache browser**: lupa menaikkan `?v=` di `index.html` membuat staf melihat versi lama.
- Sisa data uji `[UJI SISTEM]` di Sheet `DataMarketing` (±56 baris) belum dibersihkan.
