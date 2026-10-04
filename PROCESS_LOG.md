# PROCESS_LOG

## 2026-10-04

1. Menemukan source portal lokal di `salad-setup/chat-ui`. Menu Marketing memuat `Surat & Penawaran` serta `Cari Target Market`.
2. Memeriksa backend target: `/api/target/generate`, `/api/target/status`, `/api/target/callback`, dan PDF. Status lama berada di memori proses Python; data target lama masuk Google Sheets.
3. Memverifikasi key `github_raykerja` mengarah ke repo publik `raykerja/Suportmarketing` (awal hanya README); key `suportmarket` mengarah ke proyek Supabase `ewicmiekwzmxkkokmpzf` (awal 0 tabel publik dan 0 user Auth).
4. Memeriksa workflow n8n live `RMP Target Market Research`, ID `7I5Iw7Y43Ik5FaQc`, aktif, versi `6ae8fb28-af3c-485f-af8c-701ba0fe9379`. Workflow ini juga memiliki jalur Telegram; karena itu disiapkan salinan khusus Raykerja dengan 15 node riset dan workflow surat 5 node.
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

Email akun Auth pertama telah ditentukan: `yasir@raykerja.cloud`. Butuh persetujuan eksplisit tindakan produksi sesuai kebijakan RMP: migration, impor 57 baris dan satu surat, secret dan Edge Function, dua workflow baru, push/Pages, dan CNAME subdomain marketing. Setelah itu lakukan uji end-to-end dari halaman sampai data Supabase.

## Penyesuaian kebutuhan 2026-10-04

- Pengguna menegaskan domain `marketing.raykerja.cloud`; poin ke-3 bukan tiga metode pencarian. Form riset lama tetap satu, dengan pilihan swasta/pemerintah.
- Pengguna meminta akun staf dapat dibuat besok dari halaman dan masing-masing memiliki link folder Google Workspace. Skema `marketing_members`, UI Pengaturan, dan Edge Function disiapkan.
- Hasil riset ditampilkan di preview Supabase dan disalin ke folder per akun. Surat penawaran juga disalin ke folder per akun. Dua draft workflow dibuat terpisah agar jalur lama RAY AI/Telegram aman.
- Nilai email Google yang dimiliki credential Drive n8n belum tersedia; izin Editor folder harus diverifikasi saat uji produksi. Belum ada folder pengguna yang ditentukan, sehingga uji unggah aktual belum dapat dilakukan.
- GitHub push, migration/import database, undangan Auth, pembuatan/aktivasi workflow, dan DNS belum dijalankan karena kebijakan produksi RMP memerlukan persetujuan eksplisit.

## Eksekusi produksi 2026-10-04

1. Pengguna memberi persetujuan dengan “lanjutkan” setelah cakupan produksi dan kewajiban persetujuan dijelaskan. Kondisi awal Supabase: 0 tabel Marketing dan 0 akun Yasir; repo remote pada commit awal.
2. Migration SQL dijalankan. Empat tabel ditemukan dengan RLS aktif. Impor Sheet selesai dan terverifikasi 57 source row unik.
3. Tiga secret Edge Function dipasang dari penyimpanan lokal; function `marketing` dideploy dengan verifikasi JWT oleh kode function. Permintaan tanpa login dari origin subdomain menghasilkan HTTP 401 dan header CORS yang benar.
4. Dua workflow baru n8n dibuat dan diaktifkan: riset 15 node, surat 5 node. Workflow RAY AI lama tetap aktif pada versi yang sama.
5. Source aman di-push ke `raykerja/Suportmarketing` branch `main`; GitHub Pages dibuat dengan custom domain `marketing.raykerja.cloud`.
6. CNAME Hostinger `marketing` ke `raykerja.github.io` dibuat, TTL 300. Nameserver otoritatif dan dua resolver publik mengembalikan CNAME yang sama. Record apex tetap `2.57.91.91`.
7. Auth Site URL diset ke subdomain dan signup publik ditutup. Undangan Yasir dibuat; satu anggota admin dan satu surat historis terverifikasi. RLS sebagai admin mengembalikan 57 target historis, sedangkan identitas yang bukan anggota mengembalikan 0.
8. HTTPS GitHub Pages masih menunggu sertifikat saat pemeriksaan awal. Folder Drive Yasir belum ditetapkan, sehingga uji file Drive end-to-end belum dapat dinyatakan PASS.
9. Pengguna memberi URL folder Yasir. Folder ID ditetapkan pada `marketing_members` admin.
10. Uji surat historis melalui webhook surat menghasilkan callback `drive_status=done` dan file TXT ditemukan langsung di folder tujuan.
11. Uji satu riset swasta (hotel, Mijen, Kota Semarang, satu target) melalui webhook riset menghasilkan `status=done`, satu baris lead, dan file JSON ditemukan langsung di folder tujuan. Uji tombol dari browser belum dilakukan karena akun undangan belum diaktivasi pengguna.
12. GitHub Pages masih menunggu penerbitan sertifikat HTTPS; menurut dokumentasi GitHub proses ini dapat memerlukan hingga satu jam setelah domain dikonfigurasi.

## Penyesuaian aktivasi akun 2026-10-04

- Pemeriksaan Auth menunjukkan `smtp_host` kosong. Dokumentasi resmi Supabase membatasi email bawaan ke anggota tim proyek dan dua email per jam; ini akan menghambat pembuatan beberapa akun staf.
- Edge Function diubah memakai `auth.admin.generateLink(type=invite)` dan menampilkan link aktivasi satu kali kepada admin, tanpa menyimpan token di database. Admin mengirim link secara privat kepada pemilik akun. Email otomatis membutuhkan SMTP khusus di masa berikutnya.
# Lanjutan 2026-10-04 — formulir kunjungan DataMarketing

- Membaca metadata Sheet `MARKETING RAYMP 2026`: gid `1003463896` adalah tab `DataMarketing`, 30 header aktif dan satu baris historis. Tab lain menggunakan sebagian kolom yang sama. Tidak ada validasi pilihan pada empat baris pertama. Menambahkan header AE `ID LAPORAN` dan AF `EMAIL MARKETING` untuk sinkronisasi tanpa duplikasi, serta membekukan baris header.
- Menambah form kunjungan dengan data inti di depan dan detail tambahan di bagian lipat. Tampilan diuji 390×844 dan 320×640; setelah penyesuaian header, label wajib, dan tombol simpan sticky, tidak ada scroll mendatar pada 320 px.
- Menambah migration `marketing_visits`, RLS anggota aktif, dan bucket foto privat 10 MB. Menambah tiga aksi Edge Function: `save_visit`, `attach_visit_photo`, `sync_visit`; callback `kind=visit`. Menggunakan JWT pengguna yang sudah ada dan secret webhook yang sama, tanpa key di browser.
- Menambah workflow n8n `m12aJ6zFGhfgCjqP` untuk validasi webhook, foto dari URL tertandatangani Supabase, unggah Drive per akun, append/update Google Sheet berdasarkan ID, lalu callback.
- Percobaan pertama gagal secara fungsional: n8n menulis teks ekspresi mentah karena brace pada Python f-string terpotong; callback mengharapkan `row_number` yang tidak diberikan node Google Sheets. Perbaikan: ekspresi mapping eksplisit dan verifikasi ID laporan dari output node; retry pada ID yang sama memperbarui baris uji.
- Percobaan foto pertama gagal karena URL uji manual tidak menyertakan `/storage/v1`. Ini kesalahan pembentukan URL fixture uji, bukan `createSignedUrl` dalam Edge Function. Setelah URL diperbaiki, foto berhasil diunggah ke Drive Yasir dan tautannya cocok di Sheet/Supabase.
- Kedua baris Sheet uji dan kedua record Supabase uji telah dihapus. Object foto uji Supabase telah dihapus. Cleanup Drive melalui connector dan workflow sementara mengembalikan 404; metadata/listing connector masih menampilkan PNG uji 68 byte di folder Yasir. Perlu pemeriksaan/cleanup terpisah dengan akun Drive yang memiliki izin penghapusan.
- Batas verifikasi saat pengujian awal: tombol dari browser belum dapat diuji karena tidak ada sesi login di browser pengujian; sertifikat HTTPS GitHub Pages saat itu belum valid. Jalur webhook, Sheet, callback, dan foto Drive sudah diuji langsung.
- Setelah push commit `8904fd3`, GitHub Pages berhasil membangun UI baru. DNS health valid, tetapi sertifikat belum tersedia. Custom domain yang sama dilepas dan dipasang ulang melalui GitHub Pages API sesuai panduan resmi; GitHub membuat commit CNAME baru. Sertifikat berubah menjadi `approved`, `https_enforced=true`, dan GET HTTPS `marketing.raykerja.cloud` mengembalikan 200. Auth Yasir tercatat telah mengonfirmasi email dan pernah login, tetapi browser pengujian tetap tidak memiliki sesi login.
- Audit privilege menemukan role `authenticated` mewarisi SELECT/INSERT/UPDATE pada tabel baru, walaupun RLS tanpa policy tulis sudah menolak perubahan. Migration dan produksi diperketat menjadi SELECT saja; privilege INSERT/UPDATE diverifikasi `false`.
