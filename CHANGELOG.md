# CHANGELOG

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
NOTES: Dua jalur webhook diuji dengan laporan sementara, termasuk foto ke folder Drive Yasir; data Sheet dan Supabase uji dibersihkan. HTTPS GitHub Pages sudah aktif; uji tombol setelah login masih memerlukan aktivasi akun Yasir.
