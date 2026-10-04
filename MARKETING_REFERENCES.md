# Referensi GitHub untuk Support Marketing RMP

Ditinjau 4 Oktober 2026. Referensi dipakai untuk pola kerja dan UI; tidak ada kode pihak ketiga yang disalin. Portal Marketing yang ada tetap dipertahankan.

| Referensi sumber | Temuan yang relevan | Penerapan untuk RMP |
| --- | --- | --- |
| [EspoCRM — Sales Management](https://github.com/espocrm/documentation/blob/master/docs/user-guide/sales-management.md) | Lead untuk calon pelanggan; Account untuk perusahaan yang sudah bekerja sama; peluang dan dokumen terhubung ke Account; beberapa pipeline dapat dipakai. | Pisahkan target baru dari klien aktif, tetapi hubungkan semua penawaran ke satu perusahaan. |
| [Frappe CRM](https://github.com/frappe/crm) | Detail lead/deal menggabungkan aktivitas, catatan, tugas, dan tahap; menyediakan Kanban serta filter. | Satu halaman detail klien berisi kebutuhan, penawaran, follow up, dan riwayat. |
| [Twenty — data model](https://github.com/twentyhq/twenty/blob/main/packages/twenty-docs/getting-started/core-concepts/data-model.mdx) | Companies, People, Opportunities, Tasks, dan Notes adalah objek terhubung. | Entitas perusahaan, PIC, penawaran, dan aktivitas sebaiknya dipisah saat backend dibuat. |
| [Twenty — views](https://github.com/twentyhq/twenty/blob/main/packages/twenty-docs/getting-started/core-concepts/layout.mdx) | Tabel, Kanban, kalender, filter, panel detail, dan tugas pada record. | Mulai dari daftar dan filter sederhana yang ramah HP; kalender/Kanban dapat ditambah jika dipakai staf. |
| [Twenty — fitur](https://github.com/twentyhq/twenty/blob/main/packages/twenty-docs/getting-started/key-features.mdx) | Dashboard, workflow, relasi objek, serta izin per record/role. | Ringkasan tenggat untuk direktur dan pembatasan staf per akun saat backend diaktifkan. |
| [Odoo — subscription renewals](https://github.com/odoo/documentation/blob/19.0/content/applications/sales/subscriptions/renewals.rst) | Quotation perpanjangan terkait kontrak berjalan dan riwayat penjualan; perluasan layanan juga dapat dicatat. | Bedakan perpanjangan kontrak, layanan tambahan, dan keduanya; simpan versi penawaran. |
| [ERPNext — customer dashboard](https://github.com/frappe/erpnext/blob/develop/erpnext/selling/doctype/customer/customer_dashboard.py) | Customer menjadi penghubung quotation, opportunity, subscription, dan dokumen transaksi. | Jangan membuat penawaran ulang yang terlepas dari kartu perusahaan. |
| [EspoCRM — roles](https://github.com/espocrm/documentation/blob/master/docs/administration/roles-management.md) | Akses dapat dibatasi menurut tim dan peran. | Admin memantau semua; staf melihat atau mengubah klien sesuai penugasan. |

## Rekomendasi utama

1. Pertahankan **Database Target/Progres** untuk calon klien baru. Buat **Klien Aktif & Penawaran Ulang** untuk perusahaan yang sudah memiliki kontrak.
2. Satu perusahaan memiliki satu kartu induk dengan nama, layanan berjalan, jumlah personel, akhir kontrak, PIC, penanggung jawab internal, dan folder Drive. Satu kartu dapat memiliki beberapa penawaran ulang dan banyak aktivitas.
3. Tahap penawaran ulang: **Perlu review → Menyiapkan penawaran → Penawaran terkirim → Negosiasi/follow up → Disetujui / Tidak lanjut**. Setiap tahap terbuka wajib punya jadwal follow up.
4. Tampilkan jumlah kontrak berakhir dalam 90 hari, follow up jatuh tempo, dan peluang layanan tambahan. Jangka 90 hari adalah **asumsi awal** untuk pratinjau; aturan bisnis final perlu ditentukan dari masa pemberitahuan kontrak RMP.
5. File penawaran sebaiknya ditautkan ke kartu klien dan disimpan ke folder Google Drive pemilik akun sesuai pola portal saat ini. Saat backend dibuat, verifikasi bahwa pengguna memiliki akses dan file ditempatkan di folder yang benar.

## Batas saat ini

Menu yang dibuat pada tahap ini menggunakan tiga perusahaan fiktif. Tidak ada daftar kontrak aktif tervalidasi dari portal Keuangan atau sumber lain yang tersedia di repo Marketing. Angka ringkasan bukan angka bisnis RMP. Tidak ada sinkronisasi Supabase, Google Sheet, atau Drive pada menu baru. Fitur ini perlu penilaian UI dan sumber data klien nyata sebelum perubahan backend production.
