# Raykerja Marketing

Portal Marketing PT Ray Mitra Perkasa untuk `marketing.raykerja.cloud`. Source halaman berada di GitHub Pages; data terstruktur dan pengaturan akun berada di Supabase. Hasil riset dan surat yang dibuat pengguna disalin ke folder Google Drive milik pengguna melalui n8n.

**Pindah ke platform coding lain:** mulai dari [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md). Repository ini memuat source, migration, Edge Function, template workflow n8n yang telah dibersihkan, dan riwayat pekerjaan. Credential serta data privat harus disambungkan terpisah.

## Struktur

| File | Fungsi |
| --- | --- |
| `index.html`, `style.css`, `app.js` | Login, formulir kunjungan HP, Cari Target Market, preview hasil, database target, surat, pengaturan akun/folder |
| `logo-ray.png`, `theme-ray.css` | Lambang RAY dan warna yang disamakan dengan portal Keuangan dan RAY AI |
| `clients-preview.js` | Pratinjau interaktif klien aktif dan penawaran ulang; hanya data contoh di memori browser |
| `MARKETING_REFERENCES.md` | Hasil kajian referensi CRM GitHub dan rancangan tahap berikutnya |
| `PROJECT_HANDOFF.md`, `AGENTS.md` | Peta integrasi dan petunjuk bagi platform/agen pengembang lain |
| `n8n/*.template.json` | Template tiga workflow n8n tanpa credential dan secret; baca `n8n/README.md` sebelum impor |
| `config.js` | URL dan publishable key Supabase untuk browser |
| `supabase/migrations/20261004_marketing.sql` | Tabel, indeks, status Drive, RLS per akun |
| `supabase/migrations/20261004_marketing_visits.sql` | Tabel kunjungan, RLS, bucket foto privat |
| `supabase/migrations/20261004_marketing_progress.sql` | Tahap dan riwayat progres, pengingat, RLS, fungsi transaksi |
| `supabase/migrations/20261004_marketing_offers.sql` | Review target dan riwayat dokumen penawaran per akun (draft) |
| `supabase/migrations/20261005_manual_offers.sql` | Dukungan penawaran manual tanpa lead riset; diterapkan 5 Oktober 2026 |
| `supabase/functions/marketing/index.ts` | Undangan akun, pengaturan folder, pemicu dua webhook, callback |
| `scripts/prepare_n8n.py`, `scripts/prepare_letter_n8n.py` | Draft privat dua workflow n8n |
| `scripts/prepare_visit_n8n.py` | Draft privat webhook foto Drive dan sinkronisasi Google Sheet |
| `scripts/prepare_progress_update.py` | Draft perubahan dua node workflow Sheet yang sudah aktif |
| `scripts/configure_auth.py`, `scripts/invite_admin.py`, `scripts/add_member.py` | Konfigurasi Auth dan admin pertama |
| `scripts/import_sheet.py`, `scripts/import_legacy_letter.py` | Impor data historis |

`private/` dan `.env` diabaikan Git. Jangan memasukkan credential, service role key, secret webhook, ekspor data target, atau JSON workflow privat ke repo publik.

## Alur dan akses

- Cari Target Market tetap **satu formulir** dengan pilihan swasta/pemerintah. Browser → Edge Function → webhook `raykerja-target` → riset n8n → file JSON di Drive akun → callback → preview dan target di Supabase. Bila Drive gagal, hasil tetap tampil dengan status `partial` dan pesan kesalahan.
- Riset pemerintah memakai pencarian paket SiRUP langsung untuk **tahun anggaran sebelumnya**, halaman detail paket, lalu dokumen RUP resmi instansi sebagai cadangan. Review Hasil menampilkan paket, pagu, satker, kebutuhan, jumlah personel, status verifikasi, dan tautan bukti. Pagu tahun lalu adalah dasar pendekatan, bukan jaminan anggaran tahun berjalan. Jumlah personel hanya terverifikasi bila dokumen KAK/RKS/paket menyebutnya secara eksplisit. Permintaan SiRUP harus membawa parameter tabel lengkap serta header permintaan AJAX; tahun anggaran dihitung dinamis. Riset langsung telah dipasang di workflow aktif.
- Draft generator penawaran web: target hasil riset disetujui pada **Review Hasil**, kemudian dipilih di **Surat & Penawaran** dan diisi UMK. Edge Function mengirim ke webhook `raykerja-offer`; n8n menyalin Google Docs surat pengantar dan Google Sheets RAB ke folder Drive akun. Status dan tautan dokumen dicatat di `marketing_offers`. Arsip draft surat teks lama tetap tersimpan, tetapi menu arsip disembunyikan dari halaman. Workflow, migration, dan Edge Function sudah diterapkan; halaman GitHub Pages menunggu publikasi akhir setelah uji.
- Surat/penawaran: draft disimpan di `marketing_letters`, lalu Edge Function memicu webhook `raykerja-letter` untuk membuat salinan `.txt` di Drive akun. Status dan link file diperbarui lewat callback. Jika Drive gagal, draft Supabase tetap tersedia.
- Staf hanya melihat riset, target, dan surat miliknya. Admin dapat melihat semua riset dan target serta membuat akun staf dan mengatur folder mereka. Karena proyek belum memiliki SMTP khusus, halaman admin menampilkan link aktivasi satu kali untuk disalin dan dikirim secara privat kepada staf. Staf dapat mengubah link foldernya sendiri di menu **Pengaturan**. Folder riset dibekukan pada saat permintaan dibuat sehingga pergantian folder kemudian tidak mengalihkan hasil riset yang sedang berjalan.
- Tombol **Pengaturan** berada di kanan atas header; tombol **Keluar dari akun** berada di dalam halaman Pengaturan. Pengaturan tidak lagi menjadi tab pada deretan menu utama.
- Kunjungan: staf memilih target hasil riset atau mengetik target baru, mengisi data inti di HP, lalu menyimpan. Supabase menjadi database utama `marketing_visits`; n8n melakukan **append or update** ke tab `DataMarketing` pada Sheet `MARKETING RAYMP 2026` dengan `ID LAPORAN` sebagai kunci. Kolom AE/AF berisi ID dan email akun. Perubahan laporan memperbarui baris yang sama. Jika sinkronisasi gagal, laporan tetap di Supabase dan staf dapat menekan **Coba sinkron lagi**. Admin melihat laporan dan status semua staf, sedangkan hanya pemilik dapat mengubahnya.
- Form kunjungan memakai dua tahap: **CATAT DI LOKASI** (nama target, kategori, PIC, foto, koordinat, tanggal dan jam dari server) dan **LENGKAPI DETAIL** (pilih kunjungan tersimpan, alamat, kontak, respons, tenaga kerja, beberapa bagian kerja dan jumlahnya, catatan, status marketing, jadwal follow up). Tahap 1 dapat disimpan saat di lokasi dan tahap 2 dilengkapi kemudian pada record yang sama. Kolom telemarketing dan catatan follow up lama tetap berada di database, tetapi dihapus dari form kunjungan untuk disiapkan pada menu terpisah.
- Foto kunjungan opsional diambil dari kamera/galeri HP, diunggah ke bucket Supabase privat (`marketing-visit-photos`), lalu disalin oleh n8n ke folder Drive akun. Tautan Drive masuk kolom `FOTO KUNJUNGAN`. Tombol **Ambil lokasi HP** memerlukan izin lokasi dari perangkat dan koneksi HTTPS; koordinat dapat diisi manual.
- Progres target dimulai dari laporan kunjungan yang sudah ada. Setiap aktivitas dicatat sebagai `kunjungan`, `proposal`, `penawaran`, `follow_up`, `deal`, atau `gagal`. Riwayat lengkap berada di `marketing_progress_events`, tahap dan jadwal terbaru di `marketing_progress`. Tahap terbuka wajib punya tanggal follow up berikutnya. Tahap `deal` dan `gagal` menutup pengingat. Admin dapat memantau semua target, staf hanya mengubah miliknya.
- Menu **Progres & Pengingat** menampilkan jumlah terlambat, jatuh tempo hari ini, akan datang, dan belum dijadwalkan. Laporan lama dengan `TANGGAL FOLLOW UP` juga muncul tanpa migrasi data ulang. Pengingat ini muncul saat halaman dibuka atau tombol **Muat ulang** ditekan; pengiriman email/WhatsApp belum dikonfigurasi.
- Saat `config.js` berisi `progressEnabled: false`, menu tersebut berjalan sebagai **pratinjau interaktif** dengan satu target dan riwayat contoh. Setiap langkah yang dicoba hanya mengubah memori browser dan hilang saat reload. Tidak ada pembacaan tabel progres baru atau penulisan ke database/Sheet/Drive. Form kunjungan dan menu lama tetap memakai backend yang berjalan. Set `progressEnabled: true` hanya setelah semua komponen progres produksi diterapkan dan diuji.
- Menu **Klien Aktif & Penawaran Ulang** saat ini merupakan **pratinjau interaktif** dengan tiga perusahaan fiktif. Pengguna dapat mencari, menyaring status/tenggat, membuka detail kontrak dan PIC, mencoba mengubah tahap, dan melihat riwayat. Seluruhnya hilang saat reload. Menu ini belum membaca daftar klien nyata maupun menulis ke Supabase, Sheet, dan Drive. Sebelum mengaktifkan penyimpanan, diperlukan sumber daftar klien aktif yang tervalidasi, hubungan penawaran dengan perusahaan, aturan akses staf/admin, serta uji integrasi.
- Setelah backend progres diaktifkan, progres disimpan melalui Edge Function lalu pembaruan Sheet memakai webhook kunjungan yang ada. Tab `DataMarketing` membutuhkan empat kolom baru AJ–AM: `TAHAP TERKINI`, `TANGGAL AKTIVITAS TERAKHIR`, `CATATAN PROGRES TERAKHIR`, `LINK FILE PROGRES`. Kolom O `TANGGAL FOLLOW UP`, S `TANGGAL FOLLOW UP AKTUAL`, T `CATATAN HASIL FOLLOW UP`, dan N `RESPON` tetap dipakai. Riwayat setiap aktivitas disimpan di Supabase; Sheet berisi keadaan terbaru per target.
- File proposal/penawaran dapat dipilih dari surat yang dibuat portal dan disalin ke folder Drive akun, atau ditautkan memakai URL Google Drive. Pencatatan link belum memverifikasi kepemilikan file maupun apakah file berada di folder akun; staf harus memilih file dari folder akunnya.
- Link folder harus berbentuk `https://drive.google.com/drive/folders/ID`. Folder harus memberikan akses **Editor** ke akun Google yang terhubung dengan credential Google Drive n8n. Aplikasi belum memeriksa izin folder secara langsung; kegagalan akan terlihat pada status Drive.
- Sumber historis: Google Sheet `Data hasil Marketing`, 57 baris/38 kolom per 4 Oktober 2026, dan satu percakapan surat pada RAY AI. Ekspor lokal hanya di `private/`.

## Deployment dan konfigurasi

Produksi awal (GitHub Pages, DNS, Supabase, n8n riset/surat) sudah diterapkan pada 4 Oktober 2026. Fitur kunjungan menambah migration `marketing_visits`, workflow n8n `m12aJ6zFGhfgCjqP`, dan Edge Function `marketing` versi 5. Tab `DataMarketing` memiliki header `ID LAPORAN` dan `EMAIL MARKETING` pada kolom AE/AF; baris historis tidak diubah. Alur berikut menjadi runbook untuk pemasangan ulang/pemulihan.

Tema RAY dan menu pratinjau **Klien Aktif & Penawaran Ulang** dipublikasikan pada 4 Oktober 2026 (commit `c8f75d5`). Publikasi ini hanya mengubah halaman GitHub Pages; data klien aktif nyata dan backend penawaran ulang belum diaktifkan.

1. Backup kondisi Supabase dan n8n. Jalankan migration SQL; verifikasi tabel, RLS, dan status kolom Drive.
2. Set tiga Edge Function secrets: `MARKETING_WEBHOOK_SECRET` dari penyimpanan key lokal, `MARKETING_N8N_WEBHOOK` ke `/webhook/raykerja-target`, `MARKETING_N8N_LETTER_WEBHOOK` ke `/webhook/raykerja-letter`. URL kunjungan diturunkan dari URL target ke `/webhook/raykerja-visit`. Deploy `marketing` dengan `verify_jwt = false`; fungsi sendiri memverifikasi JWT pengguna dan secret callback.
3. Jalankan `python3 scripts/prepare_n8n.py`, `python3 scripts/prepare_letter_n8n.py`, dan `python3 scripts/prepare_visit_n8n.py`. Review draft di `private/`, buat tiga workflow Raykerja di n8n, lalu aktifkan. Workflow RAY AI/Telegram lama tetap berjalan. Draft kunjungan menggunakan credential Google Sheets dan Drive yang sudah ada di n8n.
4. Jalankan impor Sheet secara dry run, kemudian `--apply`. Verifikasi 57 baris historis. Lakukan impor surat historis setelah admin pertama terdaftar.
5. Push source yang aman ke `raykerja/Suportmarketing`, aktifkan GitHub Pages branch `main` root, set custom domain **`marketing.raykerja.cloud`**. Pada DNS Hostinger, buat CNAME `marketing` → `raykerja.github.io`. **Jangan ubah record apex `@`, `www`, MX, SPF, atau DKIM.** Verifikasi resolusi DNS dan HTTPS.
6. Jalankan `scripts/configure_auth.py --apply`, undang `yasir@raykerja.cloud` dengan `scripts/invite_admin.py --apply`, lalu `scripts/add_member.py --apply`. Akun pertama menjadi admin. Masuk lewat link undangan dan buat kata sandi.
7. Dari menu Pengaturan, tetapkan folder Drive Yasir. Uji satu riset, satu surat, dan satu kunjungan. Verifikasi hasil di preview, Supabase, tab `DataMarketing`, dan file foto di folder Drive. Baru setelah itu undang staf tambahan dari halaman dan tetapkan folder masing-masing.

DNS subdomain mengikuti [panduan GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site). Propagasi DNS dapat membutuhkan waktu.

## Keterbatasan dan pemulihan

- Surat saat ini berbasis template yang dapat diedit, belum penulisan AI generatif dari chat RAY AI. Salinan Drive berupa teks `.txt`; cetak PDF tersedia dari browser. Tinjau isi surat sebelum dikirim.
- Link aktivasi adalah kredensial sementara. Jangan kirim di grup atau tempat publik; berikan hanya kepada pemilik alamat email. Jika link kedaluwarsa, admin perlu membuat link baru. SMTP khusus dapat ditambahkan kelak untuk pengiriman undangan otomatis.
- Form kunjungan dipisah menjadi dua tahap; tanggal, jam, `TANGGAL INPUT`, dan `NAMA MARKETING` ditetapkan sistem. Data telemarketing dan follow up historis tetap tersimpan, sementara menu tersendiri dapat dibuat berikutnya. Foto maksimal 10 MB dengan format JPEG, PNG, WebP, HEIC, atau HEIF. Formulir memerlukan jaringan saat menyimpan; belum ada mode offline.
- Akun Drive n8n harus diberi izin Editor pada setiap folder pengguna. Jika file gagal dibuat, cek permission folder, masa berlaku OAuth, dan eksekusi n8n. Untuk riset, cek status `partial`; untuk surat, cek `drive_status=error`.
- Pencarian dokumen RUP resmi melalui mesin pencari bergantung pada PDF/halaman yang diterbitkan dan terindeks. Jika dokumen tidak memuat jumlah personel, tampilkan **Belum terverifikasi**. Jangan mengonversi pagu menjadi jumlah tenaga tanpa KAK/RKS dan periode layanan.
- Jika webhook gagal, cek eksekusi workflow, secret, callback HTTP, dan log Edge Function. Respons webhook awal hanya tanda proses diterima.
- Rollback: nonaktifkan dua workflow Raykerja, kembalikan CNAME `marketing` jika ada nilai sebelumnya, dan rollback source GitHub. Data Supabase tidak dihapus otomatis. Portal RAY AI lama tetap independen.

## Penerapan backend progres (tahap berikutnya, belum disetujui)

1. Backup skema dan workflow `m12aJ6zFGhfgCjqP`; catat versi Edge Function dan commit GitHub saat ini.
2. Jalankan migration `20261004_marketing_progress.sql`. Periksa kedua tabel, fungsi, RLS, dan izin tulis hanya untuk service role.
3. Tambahkan header AJ–AM di baris 1 tab `DataMarketing` secara berurutan sesuai daftar di atas. Kolom A–AF dan baris data lama tidak perlu diubah.
4. Jalankan `python3 scripts/prepare_visit_n8n.py` lalu `python3 scripts/prepare_progress_update.py`. Tinjau draft privat, kemudian perbarui hanya node `Susun Baris Sheet` dan `Sinkron DataMarketing` pada workflow aktif; pertahankan ID, webhook, credential, dan node lainnya.
5. Bundle lalu deploy Edge Function `marketing`; cek aksi `record_progress` menolak tanpa JWT. Push source GitHub untuk memperbarui Pages. Periksa HTTPS.
6. Uji menggunakan satu kunjungan uji milik Yasir: proposal → penawaran → dua follow up → deal atau gagal. Verifikasi timeline Supabase, baris Sheet yang sama, file Drive, dan ringkasan pengingat. Bersihkan hanya data uji yang disetujui.

Rollback aplikasi: kembalikan commit GitHub, versi Edge Function, dan dua node n8n dari backup. Biarkan tabel progres dan kolom Sheet tambahan sebagai data historis; jangan hapus otomatis. Jika sinkronisasi Sheet gagal, progres tetap tersimpan di Supabase dan status kunjungan dapat dicoba ulang.

### Kolom tambahan untuk form kunjungan dua tahap (draft)

Pada tab `DataMarketing` saat ini, tambahkan AG `TAHAP PENGISIAN`, AH `WAKTU REALISASI`, AI `STATUS MARKETING` pada baris header tab `DataMarketing`. Workflow aktif dan template `n8n/visit-to-sheet.template.json` memetakan ketiganya. Jumlah/bagian kerja tetap memakai kolom `BAGIAN KERJA OUTSOURCING` dan `JUMLAH CALON TENAGA KERJA` yang ada.
