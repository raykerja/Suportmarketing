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
