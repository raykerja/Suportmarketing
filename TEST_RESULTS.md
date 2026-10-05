## Draft kunjungan dua tahap — 2026-10-05

| TEST | EXPECTED RESULT | ACTUAL RESULT | STATUS | NOTES |
| --- | --- | --- | --- | --- |
| Syntax JS dan HTML | Tidak ada error | `node --check app.js` dan parser HTML lulus | PASS | Lokal |
| Workflow draft | JSON dan skrip pembangkit valid | `python3 -m json.tool` dan `python3 -m py_compile` lulus | PASS | Lokal |
| Diff | Tidak ada whitespace error | `git diff --check` lulus | PASS | Lokal |
| Header Sheet AG–AI | Tiga header tersedia | Ketiga header terbaca, kolom menjadi 35 | PASS | Production, tab DataMarketing |
| Workflow n8n | Dua node berubah, workflow tetap aktif | Readback cocok dengan payload; 9 node, 35 mapping | PASS | Production |
| Edge Function | Source baru aktif, tanpa login ditolak | Download ulang identik; HTTP 401 tanpa login | PASS | Production |
| Simpan tahap 1, foto, Sheet, tahap 2 | Record sama dan sinkron | Belum dijalankan dengan akun login | NOT TESTED | Hindari membuat data calon klien fiktif |
| UI HP 320/390 px | Kolom tidak overflow | Belum diuji di browser dengan akun login | NOT TESTED | Verifikasi setelah deployment |

# TEST_RESULTS

## Uji 0.6.7 — 2026-10-05

| TEST | EXPECTED RESULT | ACTUAL RESULT | STATUS | NOTES |
| --- | --- | --- | --- | --- |
| Akses umum kedua template | Tidak ada `anyone` | Metadata surat dan RAB hanya mencantumkan owner serta `yasiryasir1602@gmail.com` Editor | PASS | Setelah perubahan izin oleh pemilik |
| Akses credential n8n setelah pembatasan | Generator tetap dapat membaca/menyalin template | Workflow diagnostik sukses; Google Drive API memberi `canCopy=true`, `canEdit=true` untuk kedua file | PASS | Workflow diagnostik dinonaktifkan dan dihapus |
| Penyegaran favicon saat halaman tampil | Browser mengganti ikon lama dengan PNG RAY dari URL baru | Kode `pageshow` telah dipasang | PARTIAL | Tampilan tab browser pengguna belum dapat dilihat langsung |

## Uji 0.6.6 — 2026-10-05

| TEST | EXPECTED RESULT | ACTUAL RESULT | STATUS | NOTES |
| --- | --- | --- | --- | --- |
| Jalur standar favicon sebelum perbaikan | Browser menemukan `/favicon.ico` | HTTP 404 | FAIL | Penyebab ikon “R” bawaan pada tangkapan layar |
| Aset favicon baru | ICO berisi ukuran 16–256 px dan PNG persegi valid | Pemeriksaan format dan dimensi lokal lulus | PASS | Logo RAY asli digunakan |
| Produksi favicon | HTML live menunjuk ICO dan `/favicon.ico` HTTP 200 | HTML live menunjuk ICO; `/favicon.ico` HTTP 200 (`image/vnd.microsoft.icon`) dan PNG persegi HTTP 200 | PASS | Tampilan visual pada tab lama tetap dipengaruhi cache browser |

## Uji 0.6.5 — 2026-10-05

| TEST | EXPECTED RESULT | ACTUAL RESULT | STATUS | NOTES |
| --- | --- | --- | --- | --- |
| Callback kegagalan Edge | Penawaran `processing` menjadi `error` dan pesan tersimpan | HTTP 200; record internal `d78ee126-8b3f-4880-8cd7-cc5a173908f1` menjadi `error` dengan pesan yang benar | PASS | Panggilan callback langsung; cabang gagal n8n penuh belum diuji |
| Identitas OAuth n8n | Email credential Google Drive diketahui | Workflow diagnostik sementara membaca Drive `about`: `yasiryasir1602@gmail.com`; workflow dinonaktifkan dan dihapus | PASS | Tidak mengekspor token OAuth |
| Akses kedua template | Credential n8n dapat membaca dan menyalin Docs/RAB | Dua GET file Google Drive via credential sama sukses; `canCopy=true`, `canEdit=true` | PASS | Akses umum `anyone:writer` masih aktif |
| Favicon baru | HTML memakai URL baru untuk menghindari cache ikon lama | Link `icon`, `shortcut icon`, dan Apple menunjuk `/favicon-ray.png?v=20261005-5` | PARTIAL | Perlu verifikasi visual pada tab setelah deploy |

## Draft 0.6.4 — 2026-10-05

| TEST | EXPECTED RESULT | ACTUAL RESULT | STATUS | NOTES |
| --- | --- | --- | --- | --- |
| Form manual | Nama, alamat, penerima, tanggal, UMK, empat jumlah terkirim ke Edge | Simulasi DOM menghasilkan payload sesuai input; tombol membuka formulir; ID HTML unik | PASS | Lokal, tanpa login production |
| Validasi n8n | Tanggal tak sah dan jumlah kosong ditolak; mode target lama tetap bekerja | Uji JS menolak 31 Februari; mode manual dan target lulus | PASS | Belum dieksekusi dalam n8n |
| RAB jumlah personel | I9:L9 terisi 4 jumlah tanpa mengubah rumus | Ekspresi payload lokal mengisi 2,3,0,1; mode target lama tidak menulis I9:L9 | PASS | Harga tetap per orang/bulan, bukan total kontrak |
| Callback error | JSON valid saat node sebelumnya gagal | Ekspresi lokal menghasilkan JSON valid dengan pesan error | PARTIAL | Perlu uji gagal terkendali di n8n |
| Edge Function dan migration | Kode valid serta skema mendukung lead kosong | esbuild lulus; migration live menampilkan `lead_id` nullable dan `manual_input`; Edge Function versi 8 aktif | PASS | Aksi browser dengan login nyata belum diuji |
| End-to-end manual | Docs/RAB di folder akun; Supabase `done` | Webhook internal → n8n → Docs/RAB di folder Yasir → offer `done`; nama, penerima, tanggal, UMK, jumlah 2/3/0/1, dan rumus PPN cocok | PASS | Uji melalui webhook langsung; bukan klik form dengan login nyata |
| Favicon tab | Browser memuat lambang RAY | Link favicon PNG ada pada HTML live; logo PNG HTTP 200 dan hash cocok; build Pages sukses | PARTIAL | Ikon visual pada tab pengguna belum dilihat ulang; cache mungkin perlu refresh |

## Uji ulang 0.6.3 — 2026-10-05

| TEST | EXPECTED RESULT | ACTUAL RESULT | STATUS | NOTES |
| --- | --- | --- | --- | --- |
| Salin template rapi | n8n membaca dua template tanpa 404 | Eksekusi `1293` selesai sukses; dua file dibuat | PASS | Izin Drive diperbarui pemilik |
| Folder akun Yasir | Dua file berada di folder akun | Docs dan RAB terlihat dalam folder `1yPPnp-ZmM6xaRdAgQuS0mke404K1vjTJ` | PASS | Uji internal, bukan surat ke klien |
| Supabase | Penawaran menjadi `done` dengan dua ID file | Record `ffd9b918-b66d-475a-86ba-f71e291e8780` berstatus `done` | PASS | Nomor surat uji 12/202/RAYMP/X/2026 |
| Isi Docs dan RAB | Nama, tanggal, UMK, dan rumus terisi | Docs memuat target/nomor/tanggal; Sheet memuat UMK 3.701.709, tanggal `J36` rata kanan, rumus PPN dan total | PASS | Teks gambar `PT. RAY MITRA` telah diverifikasi pada template sumber; belum diekspor ulang dari hasil ini |
| Callback jalur error | Error tercatat tanpa status tertahan | Belum diuji ulang; eksekusi lama `1292` gagal parsing JSON | FAIL | Perbaikan terpisah diperlukan |

## Koreksi 0.6.2 — 2026-10-05

| TEST | EXPECTED RESULT | ACTUAL RESULT | STATUS | NOTES |
| --- | --- | --- | --- | --- |
| Navigasi menu | Target & Penawaran membuka Cari Target, Review, Buat Penawaran; Back kembali ke panel sebelumnya | Simulasi DOM lokal lulus untuk semua langkah; kombinasi HTML baru dan JS lama berhasil mereproduksi kegagalan semula | PASS | Login pada browser production belum dapat diuji |
| Ukuran isian | Select dan input di semua menu penuh dan sama tinggi | Enam kontrol lintas menu dalam DOM lokal: lebar 100%, tinggi 54 px, font 16 px | PASS | Render visual HP masih belum terverifikasi |
| Salinan surat panjang | Penerima rapi | PDF salinan QA terisi dan halaman pertama diperiksa visual, tanpa tabrakan | PASS | Belum aktif di generator |
| Salinan RAB | Nama PT, tanggal, rumus utuh | Ekspor XLSX salinan QA terisi membuktikan teks `PT. RAY MITRA`, tanggal dan rumus PPN | PARTIAL | Visual native Sheet belum dilihat; belum aktif di generator |
| Uji generator dengan template rapi | Dua file masuk folder akun | Eksekusi n8n 1292: kedua copy Google Drive 404; callback error gagal parsing JSON | FAIL | Workflow dipulihkan ke template asli, record uji ditandai error |
| Akses template rapi | n8n dapat membaca dua salinan | Permintaan berbagi Drive ditolak peninjauan otomatis | BLOCKED | Tidak dilanjutkan melalui jalur lain |

## Draft 0.6.1 — 2026-10-05

| TEST | EXPECTED RESULT | ACTUAL RESULT | STATUS | NOTES |
| --- | --- | --- | --- | --- |
| Syntax dan struktur halaman | JS valid, ID unik, semua panel punya tombol menu | `node --check app.js`, `git diff --check`, parser HTML lulus; 119 ID unik | PASS | Belum diuji di browser karena browser otomatis tidak tersedia |
| Surat QA | Penerima panjang tetap sejajar, tidak menabrak isi | PDF hasil ekspor: halaman pertama rapi; placeholder tetap ada; total empat halaman | PASS | Salinan QA, bukan template aktif |
| RAB QA | Nama badan usaha lengkap, tanggal di atas tanda tangan, rumus utuh | Drawing XML setelah impor ulang mengandung `PT. RAY MITRA`; `J36` berisi placeholder tanggal dan rata kanan; rumus PPN 12% I34:L34 serta total I35:L35 tetap | PARTIAL | Visual Google Sheets native belum dapat dilihat melalui browser; salinan QA belum diuji lewat n8n |
| Alur Back dan HP | Back menuju panel sebelumnya; select selebar input | Implementasi lokal dan CSS diperiksa secara statis | PARTIAL | Uji interaksi 320/390 px serta login nyata masih diperlukan |
| Generator production: konfigurasi | Dua template QA ditunjuk oleh n8n tanpa mengubah alur lain | Readback workflow aktif: 13 node; hanya dua ID template berubah; koneksi dan pengaturan sama dengan backup | PASS | Persetujuan mengganti template diterima 2026-10-05 |
| Generator production: hasil file | Google Docs dan RAB baru selesai di folder akun | Belum ada eksekusi generator baru | NOT TESTED | Perlu satu uji terkontrol yang menambah file Drive dan record penawaran |
| GitHub Pages production | Commit halaman terbit di domain marketing | Build commit `e4e9168` sukses; HTML, JavaScript, dan CSS HTTP 200 dengan hash sama seperti source | PASS | Pemeriksaan aset publik; alur sesudah login belum diuji |

| TEST | EXPECTED RESULT | ACTUAL RESULT | STATUS | NOTES |
| --- | --- | --- | --- | --- |
| Syntax JavaScript browser | Tidak ada syntax error | `node --check app.js` exit 0 | PASS | Belum uji browser login |
| Syntax Python skrip | Tidak ada syntax error | `py_compile` exit 0 | PASS | |
| Pratinjau halaman login | Respons HTTP dan rendering benar | HTTP 200, tampilan desktop benar, console error kosong | PASS | Akun Auth belum tersedia |
| Ekspor Sheet | 57 baris, 38 kolom | 57 baris, 38 kolom | PASS | File privat diabaikan Git |
| Dry run impor | Tidak mengubah database | 57 baris valid, tidak ada write | PASS | |
| Dry run anggota | Tidak mengubah database | Email admin terverifikasi dalam skrip, tidak ada write | PASS | Akun Auth belum dibuat |
| Dry run Auth dan undangan | Tidak mengubah Auth atau mengirim email | Script validasi konfigurasi dan alamat admin | PASS | Jalankan setelah DNS siap |
| Draft surat historis | Ditemukan dan dapat diekspor privat | 1 percakapan surat, 1 jawaban assistant, 0 lampiran | PASS | Belum diimpor ke Supabase |
| Draft workflow | Hanya jalur Raykerja, tanpa Telegram/Sheets | 15 node riset, 5 node surat, 0 referensi node hilang, callback Supabase | PASS | Belum dibuat/aktif di n8n |
| Supabase migration | Empat tabel dan RLS aktif | Belum dijalankan | NOT TESTED | Menunggu approval produksi |
| GitHub Pages | Situs aktif di `marketing.raykerja.cloud` | Subdomain belum dipublikasikan | NOT TESTED | Menunggu push, Pages, DNS |
| End-to-end riset | Webhook → callback → data Supabase → UI | Belum dijalankan | NOT TESTED | Butuh akun Auth dan deployment |

## Verifikasi penyesuaian 0.2.0

| TEST | EXPECTED RESULT | ACTUAL RESULT | STATUS | NOTES |
| --- | --- | --- | --- | --- |
| Syntax frontend dan Python | Tidak ada syntax error | `node --check app.js` dan `py_compile` exit 0 | PASS | |
| Struktur dua draft n8n | Semua referensi node valid | 15 node riset dan 5 node surat; referensi putus 0 | PASS | Hanya file privat lokal |
| Isolasi data per akun | Staf hanya melihat miliknya | RLS disiapkan, belum diterapkan ke Supabase | NOT TESTED | Memerlukan migration dan dua akun uji |
| Riset → preview → Drive | Hasil dan file di folder akun | Belum dijalankan | NOT TESTED | Folder dan deployment belum tersedia |
| Surat → Supabase → Drive | Draft dan file di folder akun | Belum dijalankan | NOT TESTED | Folder dan deployment belum tersedia |
| GitHub Pages subdomain | HTTPS marketing.raykerja.cloud | Belum dipublikasikan | NOT TESTED | Apex tidak akan diubah |
| Syntax Edge Function TypeScript | Dapat diparse dan dibundle | `esbuild --bundle` exit 0 | PASS | Belum memverifikasi koneksi Supabase/n8n |
| Dry run Auth/admin | Tidak ada mutation | Site URL rencana subdomain, undangan dan keanggotaan dry run | PASS | Belum ada email terkirim |

## Verifikasi produksi 2026-10-04

| TEST | EXPECTED RESULT | ACTUAL RESULT | STATUS | NOTES |
| --- | --- | --- | --- | --- |
| Migration Supabase | Empat tabel dan RLS aktif | 4 tabel, seluruh RLS aktif | PASS | Query sistem katalog |
| Impor data target | 57 baris unik | 57 baris dan 57 `source_row` unik | PASS | Database tujuan |
| Auth admin dan surat historis | Satu akun admin, satu surat | 1 user diundang, 1 membership admin, 1 surat | PASS | Pengguna belum aktivasi login |
| Isolasi RLS | Anggota melihat data, nonanggota ditolak | Admin 57 lead, identitas luar 0 lead | PASS | Belum uji staf kedua |
| Edge Function tanpa login | HTTP 401 dan CORS subdomain | HTTP 401, origin sesuai | PASS | Tidak menguji riset dengan JWT |
| Workflow baru | Keduanya aktif tanpa mengubah workflow lama | Dua workflow aktif; source lama tetap aktif | PASS | Eksekusi Google Drive belum diuji |
| DNS subdomain | CNAME ke GitHub Pages, apex tetap | CNAME dari dua nameserver otoritatif; apex 2.57.91.91 | PASS | HTTPS masih menunggu |
| HTTPS GitHub Pages | Sertifikat valid dan enforced | Sertifikat belum terbit pada pemeriksaan awal | PARTIAL | Perlu pemeriksaan ulang |
| Riset dan surat ke folder Drive | File tersimpan ke folder tiap akun | Belum ada folder akun pertama | NOT TESTED | Pengaturan dan izin folder diperlukan |
| Webhook surat → callback → Drive | File surat di folder akun dan status done | File TXT ditemukan di folder yang diberikan; `drive_status=done` | PASS | Dipicu langsung melalui webhook, bukan tombol UI |
| Webhook riset → callback → Supabase → Drive | Status done, lead dan file tersimpan | 1 target, 1 lead, file JSON ditemukan di folder yang diberikan | PASS | Dipicu langsung melalui webhook, bukan tombol UI |
| Tombol halaman setelah login | Riset dan surat dari browser | Akun undangan belum diaktivasi pengguna | NOT TESTED | Memerlukan login pertama |
| Pembuatan link aktivasi staf tanpa SMTP | Admin menerima link dan akun staf tercatat | Kode disiapkan, belum diuji dengan akun staf sesungguhnya | NOT TESTED | Uji saat akun pertama staf dibuat; link jangan dicatat di log |

## Verifikasi kunjungan 0.3.0 — 2026-10-04

| TEST | EXPECTED RESULT | ACTUAL RESULT | STATUS | NOTES |
| --- | --- | --- | --- | --- |
| Struktur Sheet | Header 30 kolom terbaca; ID dan email tersedia | Tab `DataMarketing` gid 1003463896; AE/AF ditambahkan dan diverifikasi | PASS | Baris historis tetap |
| Database & foto | RLS aktif dan bucket privat | `marketing_visits` RLS aktif; bucket `marketing-visit-photos` tidak publik | PASS | 0 laporan uji tersisa |
| Izin tabel kunjungan | Browser hanya boleh membaca tabel; tulis melalui Edge Function | `authenticated`: SELECT true, INSERT false, UPDATE false; `anon` SELECT false | PASS | Izin tulis bawaan Supabase dicabut setelah audit |
| Tanpa login | Simpan/sinkron ditolak | Kedua aksi HTTP 401 | PASS | JWT pengguna nyata belum diuji |
| Kunjungan tanpa foto | Webhook → Sheet → callback | 1 baris berisi data & ID; status Supabase `synced`; retry memperbarui baris yang sama | PASS | Data uji dibersihkan |
| Kunjungan dengan foto | Foto Supabase → Drive akun → Sheet → callback | Foto PNG berada di folder Yasir, URL sama di Sheet dan Supabase; status `synced` | PASS | Jalur webhook; foto uji Drive perlu diperiksa lagi saat cleanup |
| Tampilan HP | Tanpa scroll mendatar, input dan tombol nyaman disentuh | Chrome 390×844 dan 320×640; lebar dokumen 320 pada viewport 320; tombol simpan terlihat | PASS | Pratinjau lokal tanpa login |
| Tombol simpan dari akun Yasir | Supabase + Sheet + foto Drive dari browser | Belum diuji | NOT TESTED | Auth mencatat email terkonfirmasi dan login sebelumnya; browser pengujian tidak memiliki sesi login |
| HTTPS domain | Login & lokasi browser melalui HTTPS | Sertifikat GitHub Pages approved, HTTPS enforced, GET 200; HTTP mengarah ke HTTPS | PASS | Custom domain dipasang ulang sesuai panduan GitHub |

## Verifikasi draft progres 0.4.0 — 2026-10-04

| TEST | EXPECTED RESULT | ACTUAL RESULT | STATUS | NOTES |
| --- | --- | --- | --- | --- |
| Contoh Apps Script | Alur lapangan dipahami | Kunjungan Baru, Follow Up, Info Penting; field dan respons diperiksa di browser | PASS | Tidak mengirim formulir contoh |
| Syntax frontend/Python | Tidak ada error parse | `node --check app.js`, `py_compile` exit 0 | PASS | Uji lokal |
| Selector form | Semua ID statis tersedia | 75 selector; satu ID `print-research` dibuat dinamis oleh fungsi lama | PASS | Tidak ada ID statis hilang |
| Draft workflow | Empat kolom baru, kunci baris sama | 36 mapping kolom; `ID LAPORAN` tetap matching column; 9 node | PASS | Draft privat belum diaktifkan |
| Tampilan HP | Tidak ada lebar halaman melebihi viewport | Pratinjau 390/320 px: lebar dokumen 390/320 px | PASS | Data contoh statis, belum login nyata |
| RLS & fungsi transaksi | Staf hanya menulis progres target sendiri | Skema dan Edge diperiksa secara statis | PARTIAL | Belum diterapkan/diuji dengan dua akun |
| Progres → Supabase → Sheet | Riwayat dan baris Sheet terbaru sama | Belum dijalankan | NOT TESTED | Memerlukan izin migration, n8n, Edge, Sheet, dan push |
| Pengingat otomatis email/WhatsApp | Pesan terkirim sesuai jadwal | Belum disiapkan | NOT TESTED | Kanal belum dipilih; n8n tidak memiliki Gmail/SMTP credential |

## Pratinjau halaman 0.4.1 — 2026-10-04

| TEST | EXPECTED RESULT | ACTUAL RESULT | STATUS | NOTES |
| --- | --- | --- | --- | --- |
| Mode pratinjau tanpa tabel progres | Halaman tidak meminta tabel yang belum ada | Mock browser membuka menu dan menampilkan target contoh tanpa error tabel | PASS | `progressEnabled: false` |
| Simulasi Deal | Pengingat target ditutup | Jumlah jatuh tempo menjadi 0, timeline mendapat Deal | PASS | Hanya memori browser |
| Simulasi Follow up | Jadwal baru terlihat | Follow up 2026-10-05 muncul, jumlah akan datang menjadi 1 | PASS | Hanya memori browser |
| Reload | Data simulasi hilang | Timeline kembali ke Penawaran contoh dan jatuh tempo hari ini | PASS | Tidak ada write backend |
| Tampilan HP | Tidak melebar | Viewport dan dokumen sama sama 390 px | PASS | Browser mock login |
| Publikasi GitHub Pages | Pratinjau dapat diakses pada domain marketing | Build `91811aa` selesai; index, JS, dan config baru HTTP 200 di `marketing.raykerja.cloud` | PASS | Browser live berhenti di login; simulasi diuji dengan mock login lokal |
| Isolasi backend produksi | Tabel progres belum dibuat dan workflow lama tetap sama | Dua tabel progres masih tidak ada; dua node n8n kunjungan sama dengan backup | PASS | Tidak ada write Supabase, Sheet, atau n8n pada tahap ini |

## Menu langkah kunjungan 0.4.2 — 2026-10-04

| TEST | EXPECTED RESULT | ACTUAL RESULT | STATUS | NOTES |
| --- | --- | --- | --- | --- |
| Navigasi langkah | Satu bagian terbuka pada satu waktu | Tombol 1 dan 2 berpindah panel; panel lain tertutup | PASS | Browser mock login |
| Isian saat pindah | Nilai tidak hilang | Nama `PT Uji` tetap ada setelah langkah 2 dan kembali ke langkah 1 | PASS | Tidak ada write backend |
| Validasi kolom wajib | Bagian tersembunyi dibuka saat Simpan | Respons target kosong membuat langkah 3 terbuka dan field fokus | PASS | Browser mock login |
| Tampilan HP kecil | Tidak ada scroll horizontal | Viewport 320 px; lebar dokumen 320 px | PASS | Tombol langkah dan Simpan terlihat |
| Syntax frontend | Tidak ada parse error | `node --check app.js` exit 0 | PASS | Lokal |
| Live setelah login | Perubahan tampil dan simpan lama berjalan | Belum diuji | NOT TESTED | Verifikasi aset setelah GitHub Pages build; sesi Yasir tidak tersedia di browser uji |
## Tema RAY dan klien aktif 0.5.0 — 2026-10-04

| TEST | EXPECTED RESULT | ACTUAL RESULT | STATUS | NOTES |
| --- | --- | --- | --- | --- |
| Logo dan warna | Lambang RAY asli, biru/emas sesuai portal pembanding | Hash logo Keuangan dan RAY AI sama; aset lokal terverifikasi; pratinjau menampilkan biru/navy/emas | PASS | Browser lokal |
| Syntax frontend | JavaScript dapat diparse | `node --check app.js` dan `node --check clients-preview.js` exit 0 | PASS | Lokal |
| Pencarian dan filter | Klien contoh terpilah | Cari “Hotel” menghasilkan 1 kartu; filter jatuh tempo menghasilkan 2 kartu | PASS | Browser lokal |
| Detail dan simulasi | Tahap/riwayat dan ringkasan diperbarui | Status contoh diubah menjadi Disetujui; riwayat bertambah dan jatuh tempo turun 2→1 | PASS | Memori browser |
| Reload | Data contoh kembali ke awal | Riwayat kembali 1 catatan dan jatuh tempo 2 | PASS | Tidak ada penyimpanan |
| Responsif HP | Tidak ada scroll horizontal halaman | Pada viewport 390 px dan 320 px, lebar dokumen sama dengan viewport | PASS | Browser lokal |
| Integrasi klien nyata | Daftar klien/penawaran tersimpan dan terhubung | Belum diterapkan | NOT TESTED | Menunggu data klien tervalidasi dan persetujuan backend |
| Publikasi Pages | Source dan aset baru tersedia di `marketing.raykerja.cloud` | GitHub Pages build commit `c8f75d5` sukses; HTML, CSS, JS, logo HTTP 200 dan marker konten cocok | PASS | Push disetujui pengguna |
| Login production | Logo dan warna benar, tanpa error browser | Logo 520 px termuat; latar `rgb(243,246,251)`, tombol `rgb(10,79,166)`; console error kosong | PASS | Browser live |
| Menu setelah login nyata | Klien dapat membuka menu baru | Belum diuji dengan sesi akun Yasir | NOT TESTED | Pratinjau lokal dan aset live telah diuji |
## Paket portabilitas 0.5.1 — 2026-10-04

| TEST | EXPECTED RESULT | ACTUAL RESULT | STATUS | NOTES |
| --- | --- | --- | --- | --- |
| Source GitHub | Source lokal dan `main` remote sama sebelum perubahan | Kedua HEAD `9b456be` | PASS | Sebelum paket handoff |
| Template n8n | JSON valid, node/koneksi ada | Riset 15 node, surat 5, kunjungan 9; semua valid JSON | PASS | Belum diimpor ulang |
| Kesesuaian dengan n8n aktif | Template mewakili tiga workflow production | Nama/tipe node dan koneksi identik; parameter kunjungan disesuaikan dengan backup production | PASS | Verifikasi read-only; secret/credential sengaja berbeda |
| Pemisahan credential | Tidak ada credential binding/secret asli pada template | Diperiksa terhadap draft privat dan placeholder | PASS | Pemeriksaan statis |
| Koneksi platform baru | Dapat langsung memakai akun/integrasi | Dokumen dan template siap; otorisasi layanan belum dipindah | PARTIAL | Setiap platform butuh izin GitHub/Supabase/n8n/Google sendiri |
| Workflow n8n production | Tidak berubah akibat pembuatan template | Hanya dibaca, tidak ada API write | PASS | Tiga workflow aktif |
## Navigasi Pengaturan 0.5.2 — 2026-10-04

| TEST | EXPECTED RESULT | ACTUAL RESULT | STATUS | NOTES |
| --- | --- | --- | --- | --- |
| Header → Pengaturan | Halaman Pengaturan terbuka | Panel Pengaturan tampil; panel Kunjungan tertutup; tab Pengaturan lama tidak ada | PASS | Browser mock login |
| Kembali ke Kunjungan | Tab lain tetap berfungsi | Kunjungan tampil dan Pengaturan tertutup | PASS | Browser mock login |
| Keluar dari akun | Sesi berakhir dan login tampil | Login tampil, workspace dan tombol header tersembunyi | PASS | Mock Auth; Supabase signOut asli belum diuji ulang |
| Isolasi akun setelah keluar | Detail akun sebelumnya tidak tertinggal | Info akun kosong, panel admin tertutup, Kunjungan menjadi tab awal | PASS | Browser mock login |
| HP 320 px | Tidak overlap/scroll horizontal | Lebar dokumen 320 px; tombol header dan tombol keluar terlihat | PASS | Browser lokal |
| JavaScript | Tidak ada syntax/console error | `node --check app.js` lulus; console error kosong | PASS | Lokal |
| Production | Perubahan terlihat di domain live | Belum dipublikasikan | NOT TESTED | Push/deploy membutuhkan persetujuan eksplisit |

## Draft penawaran web dan RUP pemerintah 0.6.0 — 2026-10-04

| TEST | EXPECTED RESULT | ACTUAL RESULT | STATUS | NOTES |
| --- | --- | --- | --- | --- |
| Endpoint SiRUP lama | Paket TA 2025 tersedia untuk pencarian | GET dengan TA 2025 mengembalikan HTTP 200, `content-length: 0`; halaman indeks HTML tersedia | FAIL | Akar masalah terkuat: endpoint tidak memberi data ke klien HTTP; workflow aktif juga mengunci TA 2026 |
| Dokumen RUP resmi | Ekspor RUP/SiRUP instansi dapat ditemukan | PDF resmi PPID Komdigi memuat contoh paket, pagu, ID, satker, dan lokasi | PASS | Sumber pembanding, bukan uji eksekusi n8n |
| Validasi tahun RUP | TA sebelumnya diterima; TA berbeda tidak dipakai sebagai pagu | Fixture TA 2025 dipertahankan pada riset 2026; fixture TA 2026 dikosongkan | PASS | Kode node n8n dijalankan lokal |
| Jumlah personel | Tidak mengklaim jumlah tanpa bukti | Fixture tahun salah menghasilkan `Belum terverifikasi`; prompt mewajibkan bukti KAK/RKS | PARTIAL | Verifikasi isi dokumen oleh manusia tetap perlu |
| Syntax/struktur | Frontend, Edge, JSON n8n, ID HTML valid | `node --check`, esbuild, JSON parse, parser kode n8n, dan ID HTML lulus | PASS | Lokal |
| RAB tahun berjalan | Label UMK mengikuti tahun permintaan | Ekspresi RAB memakai `tahun` dinamis, tidak mengunci 2026 | PASS | Belum dieksekusi di n8n |
| UI HP Review/Penawaran | Form dan kartu tidak meluber pada 320/390 px | Belum ada uji visual dengan sesi login/mock untuk perubahan ini | NOT TESTED | CSS mobile disiapkan, perlu pratinjau browser |
| End-to-end riset pemerintah | Dokumen resmi → n8n → Supabase → Review → Drive | Belum dijalankan | NOT TESTED | Workflow aktif belum diubah dan perlu persetujuan production |
| End-to-end penawaran | Review → webhook → Docs/RAB → folder akun → Supabase | Belum dijalankan | NOT TESTED | Migration, Edge, workflow web, dan frontend belum diterapkan |

## Uji produksi penawaran web dan SiRUP — 2026-10-04

| TEST | EXPECTED RESULT | ACTUAL RESULT | STATUS | NOTES |
| --- | --- | --- | --- | --- |
| Migration penawaran | Tabel/RLS ada dan data lama utuh | `marketing_offers` ada; 58 lead lama tetap; browser SELECT boleh, INSERT/UPDATE ditolak | PASS | Supabase production |
| Penawaran web internal | Record `done`, Docs/RAB masuk folder Yasir | Kedua file ditemukan dalam folder `1yPPnp-ZmM6xaRdAgQuS0mke404K1vjTJ`; status `done` | PASS | Webhook n8n dipanggil langsung; tombol browser login belum diuji |
| Konten dokumen | UMK, nomor, nama target, rumus, PPN benar | UMK Rp3.701.709; nomor surat terisi; 21 rumus; PPN 12% di baris 34 | PASS | Data uji internal, belum dikirim ke klien |
| SiRUP lokal | Paket TA 2025 terbaca | Paket 53701725, pagu Rp231.504.000, `4 Orang x 12 Bulan` dari detail resmi | PASS | Hanya koneksi komputer lokal |
| SiRUP server n8n | Tool memberi JSON paket | Tiga panggilan `sirup_search` pada eksekusi 1268 HTTP 403 | FAIL | Perlu jalur jaringan resmi yang diizinkan |
| Proxy Supabase | SiRUP dapat dibaca dari Edge | Upstream juga HTTP 403; fungsi percobaan dihapus | FAIL | Tidak dipakai production |
| Riset pemerintah ke Review/Drive | Profil dan bukti RUP tersimpan | Status riset `done`, lead dan file Drive tersimpan; pagu/personel `Belum ditemukan` | PARTIAL | Tidak boleh dianggap verifikasi anggaran |
| Form HP Review/Penawaran | Tidak ada scroll horizontal | Pratinjau lokal 320/390 px sesuai viewport | PASS | Mock statis, belum sesi Auth nyata |
| GitHub Pages live | Versi repository tampil di domain | Build `975e8a7` sukses; HTML/JS/CSS/config cocok byte per byte | PASS | HTTPS `marketing.raykerja.cloud` |
| Tombol penawaran pada situs live | Aksi dari sesi Yasir hingga file | Belum diuji dengan sesi login Yasir | NOT TESTED | Backend webhook/Drive lulus |
