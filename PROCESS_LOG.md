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
# Progres target dan pengingat — 2026-10-04

1. Membuka referensi Form Kunjungan Lapangan Apps Script. Form contoh memiliki tab Kunjungan Baru, Follow Up, Info Penting; Follow Up memilih target, mencatat perkembangan, foto opsional, dan respons baik/tetap follow up/batal. Referensi belum menunjukkan riwayat bertahap proposal/penawaran atau daftar pengingat.
2. Memeriksa source portal yang berjalan, 30 kolom `DataMarketing` ditambah ID/email pada AE/AF, fungsi Edge, RLS, dan workflow kunjungan aktif. Mempertahankan alur simpan kunjungan dan webhook yang sudah ada.
3. Menambah dua tabel progres dan fungsi transaksi agar tahap terbaru, riwayat, dan status sinkron Sheet berubah bersama. Aksi Edge memvalidasi JWT, kepemilikan kunjungan, tanggal, catatan, tahap, dan URL Drive.
4. Menambah menu progres mobile dengan ringkasan jatuh tempo, form aktivitas, dan timeline. Laporan lama tetap ditampilkan dengan tanggal follow up dari data kunjungan.
5. Menyiapkan perubahan dua node n8n sebagai draft privat; node lain, webhook, dan credential dipertahankan. Empat header baru disiapkan untuk AG–AJ, tanpa mengubah baris produksi.
6. Pemeriksaan lokal: syntax JS/Python, kesesuaian selector, pemetaan 36 kolom n8n, dan pratinjau 390/320 px tanpa scroll horizontal. Belum ada uji write end-to-end karena penerapan production memerlukan persetujuan khusus menurut kebijakan RMP.

Catatan keputusan: belum ada credential Gmail/SMTP di n8n saat pemeriksaan. Pengingat di halaman dapat berjalan tanpa kanal tambahan; email/WhatsApp memerlukan pilihan kanal dan konfigurasi terpisah. File link Drive dari staf belum dapat diverifikasi berada dalam folder akun tanpa izin Drive API tambahan.

## Arahan pratinjau halaman — 2026-10-04

Pengguna meminta halaman dulu untuk dinilai. Mode `progressEnabled: false` menampilkan data contoh yang dapat disimulasikan tanpa menulis ke backend. Uji browser dengan mock login: tahap Deal menutup pengingat; Follow up membuat jadwal baru; reload mengembalikan contoh awal. Form kunjungan dan menu lama tetap terpisah. Tahap ini hanya memerlukan publikasi GitHub Pages; migration dan n8n draft tidak dieksekusi.

GitHub Pages build commit `91811aa` selesai dan tiga aset pratinjau dapat dibaca lewat HTTPS. Browser live menampilkan login karena sesi pengguna tidak tersedia dalam browser uji; alur setelah login diuji memakai mock lokal. Supabase tetap tanpa tabel progres dan dua node workflow kunjungan aktif sama dengan backup. Validasi link simulasi dibatasi ke `https://drive.google.com/` sebelum publikasi final.

## Menu langkah form kunjungan — 2026-10-04

Atas permintaan pengguna, tiga bagian utama form kunjungan diganti menjadi tombol langkah huruf besar. Struktur fieldset dan field data lama dipertahankan. Satu panel aktif pada satu waktu; tombol lanjut tersedia dari langkah 1 dan 2. Form memakai validasi manual berbasis aturan HTML yang sudah ada agar klik Simpan membuka panel dengan kolom belum valid sebelum proses API. Pratinjau mock login di 320 px lulus navigasi, persistensi nilai saat pindah, validasi panel tersembunyi, dan pemeriksaan lebar halaman.
## 2026-10-04 — Tema bersama dan menu klien aktif (0.5.0)

1. Membaca source dan dokumentasi portal Marketing, lalu membandingkan UI login portal Keuangan dan RAY AI yang aktif. Domain AI aktif adalah `ai.ptraymitraperkasa.com`; `ai.pttraymitraperkasa.com` pada permintaan tidak terdaftar di DNS. Kedua portal aktif memakai logo RAY yang identik (SHA-256 `3b646c1afe4c94090d81a6935dbd3a57e1e247424afd5d37279e6a47a3326bdd`) dan warna dasar `#f3f6fb`, `#0e1b2e`, `#0a4fa6`.
2. Meneliti dokumentasi/repository GitHub EspoCRM, Frappe CRM/ERPNext, Twenty, dan Odoo. Pola yang dipilih: pisahkan prospek dari akun klien, kaitkan semua penawaran dengan perusahaan, dan tampilkan aktivitas serta tenggat pada detail akun. Daftar tautan dan keputusan ada di `MARKETING_REFERENCES.md`.
3. Menyalin aset logo publik yang sama, membuat `theme-ray.css` sebagai lapisan warna di atas CSS lama, serta menambahkan menu pratinjau `clients-preview.js`. Halaman lama dan API tidak diubah kecuali satu warna pesan status.
4. Menguji syntax, pencarian, filter, simulasi tahap, reload, dan lebar 390/320 px di browser lokal. Semua pemeriksaan yang dijalankan lulus; lihat `TEST_RESULTS.md`.
5. Kendala/keputusan: sumber perusahaan yang sudah bekerja sama belum ada di repo Marketing dan portal pembanding hanya dapat dilihat pada halaman login. Mengisi klien nyata dari tebakan berisiko salah, sehingga menu memakai data fiktif yang ditandai jelas. Penyimpanan/backend dan publikasi menunggu keputusan terpisah.
