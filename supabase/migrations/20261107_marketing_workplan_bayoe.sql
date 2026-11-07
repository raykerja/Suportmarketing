-- Dashboard Workplan Marketing: tambah marketing baru "Bayoe" (area Kab. Semarang / Ungaran-Ambarawa),
-- sumber: "WhatsApp Image 2026-11-07 at 14.46.14 (BAYOE).jpeg" di folder AREA MARKETING. Hanya baris
-- yang sudah punya tanggal kunjungan yang dimasukkan -- 19 baris KUA Kecamatan (Kementerian Agama)
-- dan 1 baris "Cabang Dinas Pendidikan Wilayah I Jateng" belum ada tanggal di sumbernya, jadi belum
-- dimasukkan; tambahkan lewat migrasi baru kalau tanggalnya sudah ditentukan. Diurutkan per tanggal
-- (sumbernya masih acak urutannya).
insert into public.marketing_workplan (id, tanggal, lokasi, area, marketing) values
  (118, '2026-11-11', 'KANTOR KEMENTERIAN AGAMA KABUPATEN SEMARANG', 'Kab. Semarang', 'Bayoe'),
  (119, '2026-11-11', 'BPS KABUPATEN SEMARANG', 'Kab. Semarang', 'Bayoe'),
  (120, '2026-11-11', 'KANTOR PERTANAHAN KABUPATEN SEMARANG', 'Kab. Semarang', 'Bayoe'),
  (121, '2026-11-11', 'POLRES SEMARANG', 'Kab. Semarang', 'Bayoe'),
  (122, '2026-11-11', 'PENGADILAN NEGERI KABUPATEN SEMARANG', 'Kab. Semarang', 'Bayoe'),
  (123, '2026-11-12', 'UPPD/SAMSAT KABUPATEN SEMARANG', 'Kab. Semarang', 'Bayoe'),
  (124, '2026-11-12', 'KPU KABUPATEN SEMARANG', 'Kab. Semarang', 'Bayoe'),
  (125, '2026-11-12', 'BAWASLU KABUPATEN SEMARANG', 'Kab. Semarang', 'Bayoe'),
  (126, '2026-11-13', 'BALAI KESEHATAN MASYARAKAT WILAYAH AMBARAWA', 'Kab. Semarang', 'Bayoe'),
  (127, '2026-11-13', 'KEJAKSAAN NEGERI KABUPATEN SEMARANG', 'Kab. Semarang', 'Bayoe'),
  (128, '2026-11-13', 'PENGADILAN AGAMA AMBARAWA', 'Kab. Semarang', 'Bayoe'),
  (129, '2026-11-13', 'LAPAS KELAS IIA AMBARAWA', 'Kab. Semarang', 'Bayoe'),
  (130, '2026-11-16', 'MAL PELAYANAN PUBLIK KABUPATEN SEMARANG', 'Kab. Semarang', 'Bayoe'),
  (131, '2026-11-16', 'KANTOR LAYANAN BPJS KESEHATAN WILAYAH KABUPATEN SEMARANG', 'Kab. Semarang', 'Bayoe'),
  (132, '2026-11-16', 'KANTOR LAYANAN BPJS KETENAGAKERJAAN WILAYAH KABUPATEN SEMARANG', 'Kab. Semarang', 'Bayoe'),
  (133, '2026-11-16', 'BPBD KABUPATEN SEMARANG', 'Kab. Semarang', 'Bayoe');
