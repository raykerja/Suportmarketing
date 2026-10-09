VERSION: 0.8.1 (daftar harga seragam & peralatan)
DATE: 2026-10-09

ADDED: Sub menu Database di Target, Penawaran & Database kini berisi Database Target, Harga Seragam (70 item), Harga Peralatan (25 item); tabel marketing_price_items + view marketing_price_list (staf hanya harga jual) + RPC marketing_save_price_item; admin ubah/tambah/ekspor; 6 item ditandai perlu diverifikasi.
MIGRATIONS: 20261009_marketing_price_items.

VERSION: 0.8.0 (Client Active produksi, alat admin, panduan serah terima)
DATE: 2026-10-09

ADDED: Database Client Active (274 client, 551 relasi PIC) di Supabase dengan RLS per PIC; tabel Client Active dengan filter, tautan WhatsApp, kolom Google Maps, tanggal kontrak + sisa hari; admin: ubah/tambah/arsipkan client, centang PIC Korlap/Admin, pemetaan PIC→akun, riwayat perubahan, ekspor Excel, dasbor kunjungan per PIC Korlap; PIC Visit dan Monitoring & Tindaklanjut tersimpan ke database (menggantikan simulasi); Edge Function: set_member_active, reset_member_password; admin ganti nama staf; asisten AI membaca client aktif, PIC Visit, Monitoring; skrip scripts/status_check.py, apply_migration.py, deploy_function.py; folder docs/ + CLAUDE.md.
CHANGED: Role admin dipegang 4 akun (super admin). Edge Function marketing versi 21. Seluruh data contoh/pratinjau di clients-preview.js dan index.html dihapus.
MIGRATIONS: 20261009_marketing_clients_pic, _pic_visits, _client_admin, _member_name, _client_lifecycle, _client_offers (urutan diterapkan sesuai kronologi 9 Okt).
NOT TESTED: login admin/staf asli untuk menu 2, 3, tombol nonaktifkan/reset sandi; lihat docs/02-STATUS-PROGRES.md.

VERSION: 0.7.1 (upload Excel akun staf)
DATE: 2026-10-07

ADDED: Menu upload `.xlsx` pada Pengaturan admin, pratinjau baris tanpa kata sandi, validasi maksimal 50 akun dan 2 MB, serta laporan hasil per username.
CHANGED: Template Excel yang sudah tersedia kini dapat dipakai sebagai masukan; pembuatan akun tetap melalui aksi `create_staff` satu per satu.
FIXED: Ketiadaan langkah upload setelah admin mengunduh dan mengisi template.
REMOVED: Tidak ada fitur lama yang dihapus.
NOTES: Frontend commit `cea2994` dipush ke `main` dan GitHub Pages selesai sukses; enam aset fitur di domain produksi cocok dengan source. Tidak ada migration atau perubahan Edge Function. Pembaca Excel MIT versi 9.3.10 disimpan lokal bersama lisensinya. Proses berhenti pada kegagalan selain username yang sudah ada; akun yang berhasil dibuat sebelumnya tetap ada. Alur setelah login dan pembuatan akun nyata belum diuji.

VERSION: 0.7.0 (catatan operasional; tanpa perubahan kode aplikasi)
DATE: 2026-10-07

ADDED: `PROJECT_MEMORY.md` dan skill `rmp-marketing-portal` untuk kelanjutan proyek.
CHANGED: README, handoff, dan hasil uji disesuaikan dengan status Supabase terbaru.
FIXED: Keterangan lama yang menyebut secret AI belum terpasang.
REMOVED: Tidak ada.
NOTES: Secret `OPENAI_API_KEY` kini tercatat di Supabase; nilai key tidak disimpan di repository. Edge Function versi 12 aktif dan source produksi cocok dengan repository. Audit read-only menemukan tujuh tabel Marketing memakai RLS dan tidak memberi akses `anon`; bucket foto privat. Jawaban AI setelah login dan isolasi dua akun masih belum diuji. Tidak ada perubahan database, Edge Function, n8n, atau frontend dalam pembaruan dokumentasi ini.

VERSION: 0.7.0 (pencarian Marketing dan akun staf tanpa kolom email)
DATE: 2026-10-06

ADDED: Pencarian data Marketing dengan ringkasan GPT-6 Luna melalui Edge Function, batas 30 permintaan AI per akun per hari, pembuatan akun staf dengan username/kata sandi/folder Drive, serta template Excel kosong untuk 50 staf.
CHANGED: Form login menerima username staf atau identitas akun lama; form admin tidak meminta email staf. API key dibaca hanya dari secret `OPENAI_API_KEY` di server.
FIXED: Tidak ada credential AI yang perlu disimpan di frontend atau repository.
REMOVED: Kolom email dan link aktivasi dari form pembuatan akun baru. Endpoint undangan lama tetap ada untuk kompatibilitas.
NOTES: Migration batas AI diterapkan dan diverifikasi; Edge Function `marketing` versi 11 aktif, serta frontend commit `04e46a2` terbit di GitHub Pages. Secret `OPENAI_API_KEY` belum terpasang sehingga pencarian sumber tersedia tetapi ringkasan AI belum aktif. Pencarian Drive terbatas pada tautan file yang sudah tercatat di Supabase; Progress/PIC Visit masih pratinjau. Uji Auth staf dan AI end-to-end belum dilakukan.

VERSION: 0.6.14 (monitoring New Client)
DATE: 2026-10-06

ADDED: Dashboard Sales Visit dan PIC Visit di bagian atas submenu New Client,Visit & Progress, memakai ringkasan kunjungan yang sama dengan dashboard klien aktif. Sales Visit ditampilkan lebih dulu pada panel New Client.
CHANGED: Submenu New Client `Progres & Pengingat` menjadi `Monitoring & Tindaklanjut`; judul panel dan keterangan pratinjau mengikuti nama dan sumber data yang benar.
FIXED: Status muat Sales Visit, perubahan PIC Visit, dan kondisi gagal muat kini diperbarui pada kedua dashboard dari satu fungsi render.
REMOVED: Tidak ada fungsi lama yang dihapus.
NOTES: Dirilis ke production pada commit `630a087`; build/deploy GitHub Pages sukses dan HTML/JS/CSS live cocok SHA-256 dengan source. Sales Visit tetap dibaca dari pemuatan Supabase yang sudah ada; PIC Visit dan progres target masih pratinjau. Tidak ada perubahan backend, n8n, Sheet, atau Drive. Interaksi setelah login nyata belum diuji.

VERSION: 0.6.13 (dashboard kunjungan pada Monitoring & Tindaklanjut)
DATE: 2026-10-06

ADDED: Dashboard di bagian atas submenu klien aktif yang merangkum dan menampilkan input PIC Visit simulasi serta maksimal 100 Sales Visit terbaru yang dapat diakses akun. Ada status perlu detail, tautan ke kedua menu sumber, dan tombol muat ulang Sales Visit.
CHANGED: Submenu klien aktif `Progress & Pengingat` menjadi `Monitoring & Tindaklanjut`; judul panel dan tombol menuju panel mengikuti nama baru.
FIXED: Ringkasan Sales Visit dikosongkan saat keluar akun dan respons muat lama diabaikan setelah akun berganti. Error pemuatan Sales Visit ditampilkan tanpa menampilkan data lama.
REMOVED: Tidak ada data atau alur simpan lama yang dihapus.
NOTES: Dirilis ke production pada commit `d29ab24`; GitHub Pages berhasil deploy dan HTML/JS/CSS live cocok SHA-256 dengan source. PIC Visit dan tindak lanjut klien aktif tetap simulasi yang hilang saat reload. Sales Visit dibaca dari pemuatan Supabase yang sudah berjalan, sesuai akses akun; dashboard hanya baca. Backend, n8n, Sheet, dan Drive tidak diubah. Alur setelah login nyata belum diuji.

VERSION: 0.6.12 (judul workspace Marketing)
DATE: 2026-10-06

ADDED: Tidak ada.
CHANGED: Judul workspace menjadi "Aktivitas Marketing & Klien" dan keterangannya menjadi "Kelola target pasar, kunjungan, penawaran, follow-up, dan klien aktif dalam satu tempat". Keterangan ditampilkan juga pada layar HP.
FIXED: Keterangan workspace sebelumnya tersembunyi pada lebar layar hingga 760 px.
REMOVED: Tidak ada.
NOTES: Hanya teks HTML dan satu aturan CSS. Dirilis ke production pada commit `e35a150`; build dan deploy GitHub Pages sukses, serta HTML/CSS live cocok byte per byte dengan source. Tampilan setelah login nyata belum diuji.

VERSION: 0.6.11 (pratinjau alur klien aktif per PIC)
DATE: 2026-10-06

ADDED: Submenu Database Client Active dengan filter PIC RMP, PIC Visit dua tahap beserta kategori, kontak, tenaga kerja, catatan, dan lokasi HP opsional seperti Sales Visit, serta Progress & Pengingat penawaran ulang dengan respons dan riwayat simulasi.
CHANGED: Menu Active Client,Repitching & Progress dipindahkan ke paling kiri; navigasi menjadi menu induk dengan tiga submenu.
FIXED: Detail database mengikuti filter PIC dan tautan PIC Visit memilih klien yang dibuka.
REMOVED: Tidak ada fitur atau data production yang dihapus.
NOTES: Frontend dirilis ke production pada commit `334a350`; build GitHub Pages berstatus `built`, HTTPS 200, dan HTML/JS/CSS live cocok SHA-256 dengan source. Data klien/PIC fiktif hanya di memori browser; foto tidak diunggah. Backend Supabase, Sheet, Drive, n8n, dan mode progres target tidak diubah. Aktivasi data nyata memerlukan sumber klien/PIC tervalidasi dan persetujuan production terpisah. Interaksi setelah login production belum diuji.

VERSION: 0.6.10 (nama menu Marketing)
DATE: 2026-10-06

ADDED: Tidak ada.
CHANGED: Label menu utama Sales Visit & Progress menjadi New Client,Visit & Progress; label Klien Aktif & Penawaran Ulang menjadi Active Client,Repitching & Progress.
FIXED: Tidak ada.
REMOVED: Tidak ada.
NOTES: Hanya teks navigasi dan dokumentasi. Panel, submenu, mode pratinjau, serta backend tidak diubah. Rilis frontend `95eb039` terbit di production; build GitHub Pages selesai, HTTPS 200, dan HTML live cocok dengan source.

VERSION: 0.6.9 (pengelompokan menu Marketing)
DATE: 2026-10-06

ADDED: Submenu Sales Visit dan Progres & Pengingat di bawah Sales Visit & Progress; Database Target menjadi submenu keempat pada Target, Penawaran & Database.
CHANGED: Navigasi Kunjungan dan Progres & Pengingat menjadi satu kelompok; label menu kunjungan berubah menjadi Sales Visit; menu Target & Penawaran berubah menjadi Target, Penawaran & Database.
FIXED: Tidak ada.
REMOVED: Tombol menu utama Kunjungan, Progres & Pengingat, dan Database Target yang terpisah; panel dan data lama tetap dipertahankan.
NOTES: Publikasi frontend ke production disetujui pada 2026-10-06 dan dirilis pada commit `e5e036e`. GitHub Pages build selesai, HTTPS 200, dan HTML/JS/CSS live cocok dengan source. `progressEnabled` tetap `false`; progres masih pratinjau. Tidak ada perubahan backend, migration, atau n8n.

## Versi 0.6.8 — 2026-10-05

ADDED: Form kunjungan dua tahap, pemilihan kunjungan tersimpan, beberapa bagian kerja dengan jumlah, waktu kunjungan dari server, status marketing.
CHANGED: Arsip surat teks lama disembunyikan; field telemarketing dan catatan follow up keluar dari form kunjungan.
FIXED: Tahap pertama dapat disimpan tanpa respons/catatan tahap kedua; data historis dipertahankan saat melengkapi detail.
REMOVED: Tidak ada data atau tabel yang dihapus.
NOTES: Persetujuan produksi diterima. Header Sheet AG–AI, dua node n8n aktif, Edge Function, dan frontend GitHub Pages diperbarui dalam rilis ini. Workflow memetakan kolom AG–AI untuk tahap, waktu, dan status; ringkasan bagian kerja memakai kolom yang ada.

# CHANGELOG

VERSION: 0.6.7 (pemutakhiran ikon tab dan izin template)
DATE: 2026-10-05

ADDED: Pembaruan favicon pada event `pageshow` dengan URL ikon baru agar Chrome memuat ulang ikon pada navigasi halaman.
CHANGED: Kedua template Google Drive telah diubah pemilik menjadi akses umum `Dibatasi`.
FIXED: Credential Google Drive n8n terverifikasi masih dapat membaca, menyalin, dan mengedit kedua template setelah pembatasan izin.
REMOVED: Izin umum `anyone with link: writer` dari kedua template.
NOTES: Workflow diagnostik izin sementara telah dihapus. Tampilan ikon pada profil browser pengguna belum dapat diamati langsung; endpoint ikon dan HTML production diuji setelah deploy.

VERSION: 0.6.6 (favicon standar browser)
DATE: 2026-10-05

ADDED: `favicon.ico` multiukuran dan PNG persegi dari logo RAY yang sama.
CHANGED: HTML memakai `/favicon.ico` untuk tab browser dan PNG persegi untuk Apple Touch.
FIXED: Jalur standar `/favicon.ico` sebelumnya HTTP 404, sehingga browser masih menampilkan ikon huruf “R”.
REMOVED: Tidak ada.
NOTES: Logo sumber tetap `logo-ray.png`; ukuran ikon dibuat 16–256 piksel agar terbaca pada tab browser.

VERSION: 0.6.5 (favicon dan audit akses generator)
DATE: 2026-10-05

ADDED: URL favicon khusus dengan nama file baru untuk memaksa browser mengambil ulang lambang RAY.
CHANGED: Relasi favicon memakai path absolut dan `shortcut icon`; ikon Apple memakai aset yang sama.
FIXED: Callback kegagalan diuji pada Edge Function production: penawaran uji berubah dari `processing` menjadi `error` dengan pesan tersimpan.
REMOVED: Tidak ada.
NOTES: OAuth Google Drive n8n terverifikasi sebagai `yasiryasir1602@gmail.com`; akun itu punya izin `writer` eksplisit dan akses baca/salin/edit ke kedua template. Izin umum `anyone with link: writer` masih ada karena konektor yang tersedia tidak mendukung pencabutannya dan permintaan perubahan izin sebelumnya ditolak oleh peninjauan otomatis. Cabang error penuh dalam n8n belum dipicu secara terkendali.

VERSION: 0.6.4 (penawaran manual production)
DATE: 2026-10-05

ADDED: Form penawaran manual dengan tanggal, penerima, nama/alamat instansi, wilayah, UMK, dan jumlah Security, Cleaning Service, Pramubakti, Driver; migration `20261005_manual_offers.sql` untuk menyimpan isian tanpa lead riset; jalur n8n yang mengisi Google Docs dan baris jumlah personel RAB; favicon RAY pada tab browser.
CHANGED: Draft surat teks lama tetap bisa dibuka di bawah form manual; workflow penawaran standar dari target review tetap memakai alur sebelumnya.
FIXED: Draft callback penawaran menyerialisasi body JSON saat cabang error agar status tidak tertahan di `processing`.
REMOVED: Tidak ada.
NOTES: Setelah persetujuan pemilik, migration diterapkan, empat node workflow n8n aktif diperbarui, Edge Function `marketing` versi 8 dideploy, dan frontend dipush. Uji internal penawaran manual menghasilkan Docs/RAB di folder Yasir dan Supabase `done`. Jumlah personel masuk baris 9 RAB; harga template tetap per orang per bulan dan tidak otomatis menjadi total kontrak. Callback jalur gagal belum diuji end-to-end.

VERSION: 0.6.3 (template penawaran aktif dan teruji)
DATE: 2026-10-05

ADDED: Uji penawaran internal dengan Google Docs, Google Sheets RAB, folder Drive Yasir, dan status Supabase.
CHANGED: Dua ID template rapi dipasang kembali ke workflow n8n penawaran setelah akses Google diperbarui pemilik.
FIXED: Gagal menyalin template akibat 404; eksekusi internal `1293` selesai dengan dua file dan callback `done`.
REMOVED: Tidak ada.
NOTES: Backup workflow sebelum perubahan tersimpan lokal di `private/`. Callback pada jalur error belum diperbaiki. Dua template saat ini berbagi akses umum `anyone with link: writer`; perlu diganti ke izin akun n8n tertentu setelah email credential diketahui.

VERSION: 0.6.2 (koreksi cache dan formulir)
DATE: 2026-10-05

ADDED: Versi URL aset CSS dan JavaScript agar rilis halaman memuat pasangan file yang sama.
CHANGED: Ukuran select dan input di semua menu disamakan menjadi tinggi 54 px, lebar penuh, dan teks 16 px, termasuk aturan layar kecil.
FIXED: Navigasi Target & Penawaran yang gagal saat HTML terbaru memakai JavaScript lama dari cache.
REMOVED: Tidak ada.
NOTES: Uji generator dengan template rapi gagal pada salinan Google Drive karena credential n8n menerima 404. Workflow dikembalikan ke dua ID template asli; permintaan berbagi salinan ditolak oleh peninjauan persetujuan otomatis. Dokumen rapi belum aktif pada generator production. Satu record uji internal ditandai error, tanpa file baru di Drive.

VERSION: 0.6.1 (draft tata letak penawaran dan navigasi HP)
DATE: 2026-10-05

ADDED: Submenu Target & Penawaran untuk Cari Target, Review Hasil, dan Buat Penawaran; riwayat menu untuk tombol Back browser.
CHANGED: Pilihan formulir disamakan dengan lebar input lain; draft surat teks lama dilipat di bawah generator Google Docs/RAB. Salinan template Docs dan RAB dibuat untuk pemeriksaan tata letak.
FIXED: Pada salinan Docs, blok penerima tidak lagi memakai tab/spasi panjang. Pada salinan RAB, objek gambar bertuliskan `T. RAY MITRA` diperbaiki menjadi `PT. RAY MITRA`, dan tanggal di `J36:L36` disejajarkan ke kanan. Rumus PPN 12% tetap.
REMOVED: Tidak ada fungsi lama yang dihapus.
NOTES: Dua salinan template QA sempat ditunjuk oleh workflow penawaran n8n, lalu dikembalikan ke template asli setelah uji akses gagal. Halaman dipublikasikan lewat commit `e4e9168` di GitHub Pages; build sukses. Hasil uji berikutnya dicatat pada versi 0.6.2.

VERSION: 0.1.0 (persiapan migrasi)
DATE: 2026-10-04

ADDED: Halaman Marketing mandiri, konfigurasi publishable Supabase, skema RLS berbasis anggota, Edge Function, skrip persiapan workflow n8n dan impor data historis.

CHANGED: Riset baru dirancang menyimpan status dan hasil di Supabase serta memakai webhook baru `raykerja-target`.

FIXED: Salinan workflow baru menangani hasil riset kosong dan research ID unik dari Edge Function.

REMOVED: Tidak ada fungsi lama yang dihapus.

NOTES: Perubahan produksi belum diterapkan. Workflow RAY AI lama tetap aktif. Implementasi surat berbasis template dan perlu tinjauan manual. Auth baru membatasi data dengan tabel anggota dan menutup signup publik saat deployment.

VERSION: 0.2.0 (penyesuaian subdomain dan multiakun)
DATE: 2026-10-04

ADDED: Pengaturan folder Drive per akun, undangan staf oleh admin, dua webhook riset/surat, callback status file Drive, RLS riset dan target per pemilik.
CHANGED: Domain menjadi `marketing.raykerja.cloud`; DNS apex tetap. Salinan riset memakai JSON dan surat memakai TXT dalam folder tiap akun.
FIXED: Hasil riset tanpa target tetap masuk callback; status `partial` jika data Supabase berhasil tetapi Drive gagal.
REMOVED: Tidak ada.
NOTES: Semua perubahan masih lokal dan belum diuji end-to-end di produksi.

VERSION: 0.2.1 (aktivasi akun tanpa SMTP)
DATE: 2026-10-04

CHANGED: Admin membuat link aktivasi staf di halaman dan membagikannya secara privat. Supabase default SMTP tidak dipakai untuk undangan staf berikutnya.
NOTES: SMTP khusus belum dikonfigurasi; pengiriman link masih dilakukan oleh admin.

VERSION: 0.3.0 (kunjungan lapangan dari HP)
DATE: 2026-10-04

ADDED: Form kunjungan ramah HP berdasarkan 30 kolom tab `DataMarketing`, lokasi opsional, unggah foto privat ke Supabase Storage, salinan foto ke Drive akun, status dan pengulangan sinkronisasi Sheet, daftar laporan untuk pemantauan admin.
CHANGED: Navigasi menempatkan Kunjungan sebagai menu pertama. Google Sheet mendapat kolom AE `ID LAPORAN` dan AF `EMAIL MARKETING`; header dibekukan. Edge Function dan n8n mendukung append/update berdasarkan ID laporan.
FIXED: Koreksi mapping ekspresi n8n dan callback ketika Google Sheets tidak mengembalikan nomor baris. Izin INSERT/UPDATE bawaan `authenticated` pada tabel kunjungan dicabut; penulisan hanya melalui Edge Function.
REMOVED: Tidak ada fitur lama yang dihapus.
NOTES: Dua jalur webhook diuji dengan laporan sementara, termasuk foto ke folder Drive Yasir; data Sheet dan Supabase uji dibersihkan. HTTPS GitHub Pages sudah aktif; uji tombol dari browser masih memerlukan sesi login pengguna.

VERSION: 0.4.0 (draft progres dan pengingat)
DATE: 2026-10-04

ADDED: Menu progres per target dengan tahap proposal, penawaran, follow up berulang, deal/gagal; timeline aktivitas; daftar follow up jatuh tempo; pilihan surat yang sudah tersimpan di Drive; dua tabel Supabase dan fungsi transaksi.
CHANGED: Draft workflow kunjungan menambah empat kolom ringkasan progres di Sheet tanpa mengubah kolom A–AF. Edge Function menambah aksi `record_progress` dan memakai webhook kunjungan untuk menyinkronkan keadaan terbaru.
FIXED: Status sinkronisasi gagal pada formulir progres ditampilkan sebagai pesan error, walau riwayat sudah tersimpan.
REMOVED: Tidak ada.
NOTES: Perubahan masih lokal. Migration, header Sheet, n8n, Edge Function, dan GitHub production belum diubah. Pengingat saat ini berada di halaman; kanal kirim otomatis belum dipilih/diotorisasi.

VERSION: 0.4.1 (pratinjau halaman)
DATE: 2026-10-04

ADDED: Mode simulasi progres dengan target dan timeline contoh di halaman Marketing; label pratinjau menjelaskan bahwa data tidak tersimpan.
CHANGED: `config.js` menetapkan `progressEnabled: false`, sehingga halaman tidak memanggil tabel progres yang belum diterapkan. Form progres dapat dicoba di browser dan kembali ke contoh awal setelah reload.
FIXED: Menu pratinjau dapat dinilai tanpa perubahan Supabase, Sheet, workflow n8n, atau Edge Function produksi.
REMOVED: Tidak ada.
NOTES: Sesuai arahan terbaru, hanya halaman GitHub Pages yang dipublikasikan pada tahap ini; backend progres tetap menunggu penilaian.

VERSION: 0.4.2 (menu langkah kunjungan)
DATE: 2026-10-04

ADDED: Tiga tombol langkah berjudul huruf besar dan tombol lanjut pada langkah 1–2.
CHANGED: Form kunjungan menampilkan satu bagian aktif, sehingga halaman HP lebih ringkas. Nilai isian tetap ada saat pindah langkah.
FIXED: Validasi saat Simpan membuka bagian tersembunyi yang berisi kolom belum valid.
REMOVED: Tidak ada field atau alur simpan yang dihapus.
NOTES: Perubahan hanya HTML, CSS, dan JavaScript halaman; Supabase, Sheet, Edge Function, dan n8n tidak diubah.
VERSION: 0.5.0 (tema RAY dan pratinjau klien aktif)
DATE: 2026-10-04

ADDED: Logo RAY asli, stylesheet tema biru/emas, menu pratinjau Klien Aktif & Penawaran Ulang, filter/tenggat, detail kontrak, dan simulasi riwayat; dokumentasi referensi CRM GitHub.
CHANGED: Judul workspace mencakup klien aktif; warna status frontend mengikuti biru RAY.
FIXED: Logo huruf R sementara diganti aset yang sama dengan portal Keuangan dan RAY AI.
REMOVED: Tidak ada fungsi lama yang dihapus.
NOTES: Disetujui untuk production dan dipublikasikan ke GitHub Pages pada 2026-10-04. Menu baru memakai tiga perusahaan fiktif di memori browser. Backend klien aktif tidak diubah.
VERSION: 0.5.1 (paket serah terima GitHub)
DATE: 2026-10-04

ADDED: `PROJECT_HANDOFF.md`, `AGENTS.md`, tiga template workflow n8n tanpa credential/secret, dan script ekspor template.
CHANGED: README menunjuk panduan pindah platform.
FIXED: Repository sekarang memuat definisi alur n8n yang aman untuk dibagikan, sehingga platform lain tidak bergantung pada draft privat di komputer asal.
REMOVED: Tidak ada fitur production yang dihapus.
NOTES: Template n8n belum siap diaktifkan sebelum credential, Sheet ID, dan secret dikonfigurasi di lingkungan tujuan. Tidak ada perubahan pada workflow n8n production, Supabase, atau data.
VERSION: 0.5.2 (navigasi Pengaturan)
DATE: 2026-10-04

ADDED: Tombol Pengaturan di header dan tombol Keluar dari akun di dalam halaman Pengaturan.
CHANGED: Pengaturan dikeluarkan dari tab menu utama; tombol Keluar tidak lagi berada di header.
FIXED: Header HP 320 px tetap muat; data akun dan panel admin dibersihkan saat keluar, dan kegagalan sign out ditampilkan.
REMOVED: Tidak ada fungsi Auth atau Pengaturan yang dihapus.
NOTES: Perubahan lokal pada HTML, CSS, dan visibilitas tombol; Supabase, n8n, serta data tidak diubah.

VERSION: 0.6.0 (webhook penawaran web dan perbaikan parsial RUP)
DATE: 2026-10-04

ADDED: Menu Review Hasil; generator Google Docs surat pengantar dan Google Sheets RAB dari target yang disetujui; tabel `marketing_offers`; workflow n8n web portabel; informasi paket RUP, pagu, kebutuhan, dan bukti jumlah personel pada review pemerintah.
CHANGED: Workflow riset memakai SiRUP langsung dengan parameter dan header lengkap, tahun anggaran sebelumnya, pembacaan halaman detail paket, dan pencarian dokumen resmi sebagai cadangan. Generator RAB web memakai tahun dinamis dan payload JSON aman untuk nama target bertanda kutip.
FIXED: Perpindahan dari Review Hasil ke penawaran menunggu opsi target selesai dimuat.
REMOVED: Tidak ada fitur production yang dihapus.
NOTES: Migration, workflow n8n, secret, dan Edge Function sudah diterapkan. Penawaran web lulus uji webhook sampai file Drive. Pembacaan SiRUP di server n8n masih HTTP 403 sehingga riset anggaran pemerintah belum lulus. GitHub Pages telah diperbarui dan diverifikasi. Tombol setelah login belum diuji.

## 0.7.1 — 2026-10-07 (source saja, belum diterapkan ke produksi)
- Jalur cadangan data Sales Visit ke folder Drive masing-masing staf: file `Backup_Kunjungan_<id>.json` dibuat sekali, lalu diperbarui di tempat pada sinkron berikutnya.
- Migration `20261007_visit_backup.sql` (kolom `backup_*`), Edge Function menyimpan hasil cadangan dari callback n8n, daftar kunjungan menampilkan tautan cadangan.
- Template `n8n/visit-to-sheet.template.json` ditambah 6 node (dibuat oleh `scripts/prepare_visit_backup_n8n.py` dari workflow aktif). Logika node kode diuji lokal; belum ada eksekusi n8n/Drive nyata.

## 0.8.0 — 2026-10-07 (Tahap 2: progres aktif)
- Migration `20261004_marketing_progress.sql` dipasang di produksi (RLS aktif, browser hanya SELECT, tulis lewat Edge Function). `progressEnabled: true`.
- Uji isolasi di database (transaksi dibatalkan): staf hanya melihat progres miliknya, tidak bisa menulis ke kunjungan staf lain atau insert langsung, anon ditolak, admin melihat semua.
- Edge Function versi 14 mengirim riwayat progres ke n8n; file backup Drive staf memuat `riwayat_progres`.
- Kolom Sheet baru untuk progres (AJ–AM pada draf lama) sengaja tidak dipakai; follow up/respons memakai kolom yang sudah ada.

## 0.8.1 — 2026-10-07 (backup Drive tanpa n8n)
- Backup kunjungan + progres ke Drive staf kini lewat **Apps Script "Drive Gateway"** (`apps-script/drive-gateway/`), dipanggil Edge Function `marketing` (versi 18) dengan secret `DRIVE_GATEWAY_SECRET`/`DRIVE_GATEWAY_URL`. Tanpa n8n dan tanpa kunci JSON Google.
- Hasil: Google Sheet "Riwayat Kunjungan - <nama>" (tab Kunjungan, Riwayat Progres, Petunjuk; salinan baca) di folder staf, ditambah JSON mesin di subfolder `_backup_mesin`. Diperbarui di tempat, tidak membuat file baru.
- Edge Function mengulang panggilan sampai 3 kali bila Apps Script membalas error sementara.
- Workflow n8n kunjungan kembali ke 9 node asli (Sheet DataMarketing + foto). Template n8n dikembalikan.
- Uji: 28 akun aktif x (kunjungan + progres fiktif) lewat `sync_visit` dengan sesi tiap akun: 28/28 `done`; folder induk setiap Sheet diverifikasi di Drive. Data uji dibersihkan.
