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
