# PROCESS_LOG

## 2026-10-04

1. Menemukan source portal lokal di `salad-setup/chat-ui`. Menu Marketing memuat `Surat & Penawaran` serta `Cari Target Market`.
2. Memeriksa backend target: `/api/target/generate`, `/api/target/status`, `/api/target/callback`, dan PDF. Status lama berada di memori proses Python; data target lama masuk Google Sheets.
3. Memverifikasi key `github_raykerja` mengarah ke repo publik `raykerja/Suportmarketing` (awal hanya README); key `suportmarket` mengarah ke proyek Supabase `ewicmiekwzmxkkokmpzf` (awal 0 tabel publik dan 0 user Auth).
4. Memeriksa workflow n8n live `RMP Target Market Research`, ID `7I5Iw7Y43Ik5FaQc`, aktif, versi `6ae8fb28-af3c-485f-af8c-701ba0fe9379`. Workflow ini juga memiliki jalur Telegram; karena itu disiapkan salinan khusus Raykerja dengan hanya 14 node yang diperlukan.
5. Memeriksa Sheet `Data hasil Marketing`: 38 kolom dan 57 baris data. Ekspor lokal privat disiapkan untuk impor idempoten berdasarkan `source_row`.
6. Memeriksa domain `raykerja.cloud`: saat ini menampilkan halaman parkir Hostinger. DNS `@` mengarah ke `2.57.91.91`, `www` ke `raykerja.cloud`; MX dan TXT Google Workspace terpasang.
7. Menyiapkan source, migration, Edge Function, dan draft workflow tanpa mengubah sistem produksi.
8. Memeriksa database RAY AI produksi secara read-only: 35 percakapan, 253 pesan, 0 lampiran; satu percakapan berjudul surat dengan satu jawaban assistant. Ekspor satu surat privat disiapkan untuk impor ke akun Yasir.
9. Memeriksa konfigurasi Supabase Auth: Site URL masih `http://localhost:3000`, signup publik aktif, dan belum ada redirect URL. Rencana migrasi mencakup penguncian signup dan tabel membership agar data tidak terbuka bagi akun baru yang tidak disetujui.

## Root cause / keputusan

- Status riset lama bersifat sementara di memori sehingga tidak cocok untuk halaman GitHub Pages. Solusi: persistensi di Supabase.
- Satu workflow lama juga menangani Telegram; perubahan langsung berisiko mengganggu alur itu. Solusi: duplikasi jalur RAY AI khusus Raykerja.
- Callback lama menunjuk server portal RAY AI. Solusi: callback salinan workflow menunjuk Edge Function dan menulis status/lead ke Supabase.
- Jika hasil AI kosong, Code node lama mengembalikan nol item sehingga callback tidak terjadi. Salinan workflow mengirim callback sukses dengan daftar kosong.

## Pekerjaan produksi berikutnya

Email akun Auth pertama telah ditentukan: `yasir@raykerja.cloud`. Butuh approval tindakan produksi sesuai kebijakan RMP: migration, impor 57 baris dan satu surat, secret dan Edge Function, workflow baru, push/Pages, dan perubahan DNS. Setelah itu lakukan uji end-to-end dari halaman sampai data Supabase.
