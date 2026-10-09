# Status & progres — sampai mana

**Diperbarui: 9 Oktober 2026.** Perbarui dokumen ini setiap kali menyelesaikan sesuatu. Cek keadaan nyata dengan `python3 scripts/status_check.py`.

Arti penanda:
- ✅ **Terbukti** — sudah di produksi dan diuji di sistem tujuan (database/RLS atau server) *dan* alurnya jalan.
- 🟡 **Live, belum diuji login asli** — sudah di produksi; diuji di database dan di browser dengan respons dipalsukan, tetapi **belum dicoba manusia dengan akun staf/admin sungguhan**.
- ⬜ **Belum dibangun**.

## A. Fondasi

| Fitur | Status | Catatan |
| --- | --- | --- |
| Hosting GitHub Pages + domain marketing.raykerja.cloud | ✅ | Push ke `main` = rilis. Hash file live dicocokkan dengan repo |
| Login username/kata sandi, RLS per akun | ✅ | 28 akun aktif (4 admin, 24 staf) |
| Pembuatan akun staf (form + impor Excel) | 🟡 | Rilis 7 Okt; pembuatan akun nyata lewat UI belum dikonfirmasi ulang |
| Cadangan Sales Visit + progres ke Drive staf (Apps Script, tanpa n8n) | ✅ | 28/28 akun terbukti 7 Okt |
| Sinkron Sales Visit ke Google Sheet `DataMarketing` + foto Drive (n8n) | 🟡 | Jalan; uji penuh dari HP (foto → Sheet) belum dikonfirmasi ulang |
| Riset target, review hasil, surat/penawaran (n8n) | ✅ | Dokumen asli terbukti jadi (Docs + RAB di folder Drive). Tombol setelah login nyata belum dilihat manusia |
| Asisten AI (OpenAI) membaca data sesuai akses akun | 🟡 | v21 (9 Okt): kini membaca client aktif, PIC Visit, Monitoring. Teruji dengan akun admin & staf sementara (dihapus). Batas 30 pencarian/hari/akun |

## B. Client Active (dikerjakan 9 Oktober 2026)

| Fitur | Status | Catatan |
| --- | --- | --- |
| Impor 274 client dari sheet + 551 relasi PIC | ✅ | `scripts/import_clients.py` (sekali pakai, sudah dijalankan) |
| Pemetaan PIC → akun (24 alias) | ✅ / ⬜ | 20 terpetakan; **4 PIC belum punya akun** — dipetakan lewat menu "Pemetaan PIC → akun" saat akunnya dibuat |
| Aturan lihat: staf hanya client PIC-nya, admin semua | ✅ | Diuji 19 akun, jumlah cocok dengan hitungan independen |
| Menu 1 sebagai **tabel** (cari/filter cabang, kategori, PIC, kontrak, status, kunjungan) | 🟡 | Desktop & HP diuji dengan mock |
| Tautan WhatsApp (wa.me) dari nomor HP, nomor ganda dipisah | 🟡 | 212/212 nomor terbaca |
| Admin: ubah client, centang PIC Korlap/Admin, tambah client | 🟡 | Via RPC + kunci optimistik + jejak audit |
| Admin: arsip/aktifkan lagi client (alasan wajib) | 🟡 | Staf tidak lihat arsip, tak bisa catat visit ke arsip |
| Masa kontrak berupa tanggal + sisa hari berwarna + filter | 🟡 | **Baru 2 dari 274 client terisi tanggalnya** |
| Riwayat perubahan (audit) di web | 🟡 | Tabel masih kosong sampai ada perubahan nyata |
| Ekspor Excel (hanya admin) | 🟡 | SheetJS dimuat saat klik; file uji valid |
| Dasbor admin: kunjungan per PIC Korlap, "belum pernah dikunjungi" | 🟡 | Hanya menghitung PIC Visit yang dicatat di portal |
| Pemetaan PIC → akun, tambah PIC baru (admin) | 🟡 | |

## C. Akun & super admin

| Fitur | Status | Catatan |
| --- | --- | --- |
| 4 super admin (role `admin`) | ✅ | Dipilih pemilik; admin = super admin (satu tingkat) |
| Admin ganti nama dan folder Drive staf | 🟡 | Nama via RPC (baru); folder via aksi `set_folder` |
| Nonaktifkan/aktifkan akun (+ blokir login) | 🟡 | Perilaku server terbukti pada akun uji sementara; tombol di web belum dicoba pada akun staf sungguhan |
| Reset kata sandi staf (sandi acak tampil sekali) | 🟡 | Idem |

## D. Kunjungan & penawaran ulang

| Fitur | Status | Catatan |
| --- | --- | --- |
| Menu 2 **PIC Visit** tersimpan ke database (dua tahap) | 🟡 | Foto **disembunyikan** (belum didukung). Tabel produksi masih 0 baris |
| Menu 3 **Monitoring & Tindaklanjut** (progres penawaran ulang, pengingat, riwayat) | 🟡 | Daftar "kontrak segera berakhir tanpa penawaran" butuh tanggal kontrak terisi. Tabel produksi masih 0 baris |
| PIC Visit yang mengisi status penawaran otomatis tercatat ke Monitoring | 🟡 | |
| Cadangan PIC Visit & penawaran ke Sheet/Drive per staf | ⬜ | Hanya di Supabase |

## D2. Daftar harga (dikerjakan 9 Oktober 2026)

| Fitur | Status | Catatan |
| --- | --- | --- |
| Impor 70 item seragam + 25 item peralatan dari dua berkas Excel pemilik | ✅ | Sumber: "DAFTRAR HARGA SERAGAM.xlsx", "DAFTAR HARGA PERALATAN.xlsx". Data mentah ada di `private/` (tidak di Git) |
| Tampilan di menu Target, Penawaran & Database → 4. Database → Harga Seragam / Harga Peralatan | 🟡 | Admin: harga beli, jual, margin, kenaikan; staf: hanya harga jual |
| Admin ubah/tambah item, ekspor Excel, verifikasi harga | 🟡 | Via RPC `marketing_save_price_item` + jejak audit |
| **6 item seragam ditandai "perlu diverifikasi"** (harga jual disembunyikan dari staf) | ⬜ butuh pemilik | Item no. 20, 22, 24, 25, 26, 27: harga jual di Excel tidak konsisten (mis. jual lebih rendah dari beli, atau angka manual tidak sama dengan lama + kenaikan). Admin memeriksa lalu mencentang "Perlu diverifikasi" dimatikan |
| Harga dipakai otomatis di pembuatan penawaran/RAB | ⬜ | Belum tersambung; daftar hanya referensi |

## E. Belum dibangun (ringkas; rinci di [05](05-BACKLOG-DAN-TINDAK-LANJUT.md))

⬜ Impor massal tanggal kontrak · ⬜ Cadangan Drive untuk PIC Visit/penawaran · ⬜ Foto di PIC Visit · ⬜ Jalur Drive → Supabase (edit di Sheet staf sebagai versi terpisah) · ⬜ Retry otomatis terjadwal untuk cadangan yang gagal · ⬜ Tingkat super admin berbeda dari admin · ⬜ Pengingat otomatis (Telegram/WhatsApp) untuk follow-up dan kontrak · ⬜ AI bisa menyebut daftar nama client menurut kriteria · ⬜ Pemindahan surat/riset/penawaran dari n8n (hanya bila diminta pemilik).

## F. Cara membaca keluaran `scripts/status_check.py`

| Temuan | Artinya | Tindak lanjut |
| --- | --- | --- |
| `berkas berubah/belum dilacak` | Ada pekerjaan lokal belum di-commit | `git status`; commit/push atau buang dengan sadar |
| `live BERBEDA dari repo` | Belum dipush / Pages belum selesai / cache | Tunggu 1–2 menit lalu ulangi; bila tetap, cek tab Actions di GitHub |
| `tabel hilang` / `fungsi hilang` | Migrasi belum diterapkan | `scripts/apply_migration.py` (dengan izin pemilik) |
| `RLS MATI` | **Serius** — data terbuka | Aktifkan RLS dan buat policy segera |
| `N PIC belum punya akun` | Ada nama PIC tanpa akun | Buat akun, lalu menu Pemetaan PIC → akun |
| `client belum punya tanggal kontrak` | Pengingat kontrak belum jalan | Isi tanggal (form Ubah) atau bangun impor massal |
| `belum ada PIC Visit / penawaran` | Menu 2/3 belum dipakai/diuji | Minta satu staf asli mencoba alur penuh ([04](04-PENGUJIAN.md)) |

## G. Yang harus dilakukan manusia (tidak bisa diselesaikan lewat kode)

1. Satu staf asli mencoba: login → Client Active hanya menampilkan client-nya → Catat PIC Visit (tahap 1 dan 2) → lihat di Monitoring.
2. Satu admin asli mencoba: ubah satu client, ekspor Excel, buka riwayat. Kembalikan data setelah uji.
3. Uji **Nonaktifkan** dan **Reset kata sandi** pada **satu akun uji** (bukan staf sungguhan).
4. Buat akun untuk empat PIC yang belum punya akun, lalu petakan.
5. Isi tanggal kontrak (manual atau minta impor massal dari Excel).
6. Sisa ±56 baris `[UJI SISTEM]` di Sheet `DataMarketing` masih perlu dihapus manual (tidak bisa dari kode).
