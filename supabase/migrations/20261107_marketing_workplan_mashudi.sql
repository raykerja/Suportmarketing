-- Dashboard Workplan Marketing: tambah marketing baru "Mashudi" (area Klaten-Solo-Karanganyar-
-- Wonogiri), sumber: "Workplan Marketing Klaten-Wonogiri-Karanganyar-Solo 9-13 Nov 2026 (MASHUDI).xlsx"
-- di folder AREA MARKETING, sheet "Workplan Harian". Tanggal dipakai PERSIS seperti tertulis di sheet
-- itu (23-27 Nov 2026) sesuai konfirmasi pemilik -- catatan: nama file & sheet "Detail Paket" di
-- berkas yang sama menyebut 9-13 Nov 2026 untuk lokasi/urutan yang identik (selisih 14 hari), tapi
-- pemilik memilih tetap pakai tanggal di "Workplan Harian". Sheet "Backup Lokasi" (opsi cadangan
-- tanpa tanggal pasti) tidak diikutkan.
insert into public.marketing_workplan (id, tanggal, lokasi, area, marketing) values
  (134, '2026-11-23', 'RSUD BAGAS WARAS', 'Kab. Klaten', 'Mashudi'),
  (135, '2026-11-23', 'DINAS LINGKUNGAN HIDUP', 'Kab. Klaten', 'Mashudi'),
  (136, '2026-11-23', 'BAGIAN UMUM', 'Kab. Klaten', 'Mashudi'),
  (137, '2026-11-23', 'BAGIAN KESEJAHTERAAN RAKYAT', 'Kab. Klaten', 'Mashudi'),
  (138, '2026-11-23', 'DINAS PERUMAHAN RAKYAT DAN KAWASAN PERMUKIMAN', 'Kab. Klaten', 'Mashudi'),
  (139, '2026-11-23', 'DINAS KESEHATAN', 'Kab. Klaten', 'Mashudi'),
  (140, '2026-11-24', 'PENGADILAN NEGERI SURAKARTA', 'Kota Surakarta', 'Mashudi'),
  (141, '2026-11-24', 'KANTOR PELAYANAN PAJAK MADYA SURAKARTA', 'Kota Surakarta', 'Mashudi'),
  (142, '2026-11-24', 'RRI SURAKARTA', 'Kota Surakarta', 'Mashudi'),
  (143, '2026-11-24', 'KANTOR TERMINAL TIPE A TIRTONADI', 'Kota Surakarta', 'Mashudi'),
  (144, '2026-11-25', 'KANTOR PERTANAHAN KOTA SURAKARTA', 'Kota Surakarta', 'Mashudi'),
  (145, '2026-11-25', 'KEJAKSAAN NEGERI SURAKARTA', 'Kota Surakarta', 'Mashudi'),
  (146, '2026-11-25', 'RUMAH SAKIT UMUM PUSAT SURAKARTA', 'Kota Surakarta', 'Mashudi'),
  (147, '2026-11-25', 'POLITEKNIK KESEHATAN SURAKARTA', 'Kota Surakarta', 'Mashudi'),
  (148, '2026-11-25', 'BALAI PENGAMANAN ALAT DAN FASILITAS KESEHATAN SURAKARTA', 'Kota Surakarta', 'Mashudi'),
  (149, '2026-11-25', 'BALAI TEKNIK SUNGAI', 'Kota Surakarta', 'Mashudi'),
  (150, '2026-11-26', 'SEKRETARIAT DAERAH', 'Kab. Karanganyar', 'Mashudi'),
  (151, '2026-11-26', 'DINAS PENDIDIKAN DAN KEBUDAYAAN', 'Kab. Karanganyar', 'Mashudi'),
  (152, '2026-11-26', 'DINAS KOPERASI, USAHA KECIL, TRANSMIGRASI, ENERGI DAN SUMBER DAYA MINERAL', 'Kab. Karanganyar', 'Mashudi'),
  (153, '2026-11-26', 'RSUD KARTINI KARANGANYAR', 'Kab. Karanganyar', 'Mashudi'),
  (154, '2026-11-26', 'BADAN KEUANGAN DAERAH', 'Kab. Karanganyar', 'Mashudi'),
  (155, '2026-11-26', 'SATUAN POLISI PAMONG PRAJA', 'Kab. Karanganyar', 'Mashudi'),
  (156, '2026-11-27', 'DINAS PENDIDIKAN DAN KEBUDAYAAN', 'Kab. Wonogiri', 'Mashudi'),
  (157, '2026-11-27', 'DINAS PENANAMAN MODAL DAN PELAYANAN TERPADU SATU PINTU', 'Kab. Wonogiri', 'Mashudi'),
  (158, '2026-11-27', 'RSUD SOEDIRAN MANGUN SUMARSO', 'Kab. Wonogiri', 'Mashudi'),
  (159, '2026-11-27', 'DINAS KESEHATAN', 'Kab. Wonogiri', 'Mashudi');
