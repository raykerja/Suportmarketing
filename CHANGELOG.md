# CHANGELOG

VERSION: 0.6.1 (draft tata letak penawaran dan navigasi HP)
DATE: 2026-10-05

ADDED: Submenu Target & Penawaran untuk Cari Target, Review Hasil, dan Buat Penawaran; riwayat menu untuk tombol Back browser.
CHANGED: Pilihan formulir disamakan dengan lebar input lain; draft surat teks lama dilipat di bawah generator Google Docs/RAB. Salinan template Docs dan RAB dibuat untuk pemeriksaan tata letak.
FIXED: Pada salinan Docs, blok penerima tidak lagi memakai tab/spasi panjang. Pada salinan RAB, objek gambar bertuliskan `T. RAY MITRA` diperbaiki menjadi `PT. RAY MITRA`, dan tanggal di `J36:L36` disejajarkan ke kanan. Rumus PPN 12% tetap.
REMOVED: Tidak ada fungsi lama yang dihapus.
NOTES: Pada persetujuan lanjutan 2026-10-05, dua salinan template QA ditunjuk oleh workflow penawaran n8n aktif; hanya dua ID template berubah dan status workflow tetap aktif. Halaman dipublikasikan lewat commit `e4e9168` di GitHub Pages; build sukses dan tiga aset live cocok dengan source. Uji menghasilkan dokumen baru belum dijalankan.

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
