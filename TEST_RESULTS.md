# TEST_RESULTS

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
