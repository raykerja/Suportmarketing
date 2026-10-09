# Pengujian — cara menguji tanpa merusak produksi

Pemilik menuntut **bukti nyata di sistem tujuan**. "JavaScript valid" atau "build lulus" bukan bukti. Laporkan jujur apa yang diuji dan **apa yang belum**.

## Tingkat bukti (sebut tingkatnya saat melapor)

1. **Sintaks**: `node --check app.js`, `node --check clients-preview.js`; Edge Function: `npx -y esbuild supabase/functions/marketing/index.ts --outfile=/dev/null`.
2. **Database/RLS** pada produksi dengan transaksi yang dibatalkan (bagian A).
3. **Server**: Edge Function dengan akun uji sementara (bagian B).
4. **Browser** dengan respons dipalsukan (bagian C) — membuktikan tampilan dan permintaan yang dikirim, **bukan** data asli.
5. **Manusia dengan akun asli** — satu-satunya bukti penuh. Daftar yang masih menunggu ada di [02 bagian G](02-STATUS-PROGRES.md).

## A. Menguji RLS dan RPC langsung di database (transaksi dibatalkan)

Memakai Management API (`scripts/_supabase.py`: `sql(query)`). Pola menirukan satu pengguna: pindah peran, setel klaim JWT, jalankan, lalu `rollback`.

```python
import sys; sys.path.insert(0, 'scripts')
from _supabase import sql
uid = lambda name: sql(f"select user_id from marketing_members where display_name='{name}'")[0]['user_id']
staf, admin = uid('NAMA STAF'), uid('NAMA ADMIN')
as_user = lambda u: f"set local role authenticated; select set_config('request.jwt.claims','{{\"sub\":\"{u}\",\"role\":\"authenticated\"}}',true);"

# staf hanya melihat client PIC-nya (jumlah harus cocok dengan hitungan independen dari data sumber)
sql(f"begin; {as_user(staf)} select count(*) c from marketing_clients; rollback;")
# percobaan yang HARUS ditolak → akan melempar RuntimeError (42501 / 'new row violates row-level security')
sql(f"begin; {as_user(staf)} select marketing_save_client('{{\"nama_client\":\"X\"}}'::jsonb); rollback;")
```

Aturan emas:
- Satu pernyataan `select` tidak melihat efek fungsi di pernyataan yang sama (snapshot). Gunakan `select` terpisah.
- **Resolusi `user_id` dilakukan sebelum `set local role authenticated`** (staf tidak boleh membaca `marketing_members`).
- Untuk tabel/fungsi baru uji minimal: pemilik **berhasil**, staf lain **ditolak**, admin sesuai harapan, anonim (`set local role anon`) **ditolak**, dan percobaan mengubah kolom terlarang **ditolak**. Cek juga `grant` (bukan hanya policy).
- Selalu akhiri dengan `rollback` dan konfirmasi hitungan baris produksi tidak berubah.

## B. Menguji Edge Function dengan akun sementara

Aksi yang butuh login (mis. `ai_search`, `set_member_active`) diuji dengan **akun uji sementara**:

1. Dapatkan service role key lewat `GET {API}/api-keys` (Management API) — **jangan dicetak**.
2. Buat pengguna: `POST {SUPABASE_URL}/auth/v1/admin/users` (`email_confirm: true`), tambahkan baris `marketing_members` (peran sesuai uji) dan, bila perlu, data uji (mis. client + alias sementara).
3. Login: `POST /auth/v1/token?grant_type=password` dengan publishable key, panggil fungsi dengan `Authorization: Bearer <access_token>` dan `Origin: https://marketing.raykerja.cloud`.
4. **Bersihkan di blok `finally`**: hapus data uji, baris `marketing_ai_daily_usage`, `marketing_members`, lalu pengguna Auth (`DELETE /auth/v1/admin/users/{id}`). Konfirmasi jumlah client/anggota kembali ke angka semula.

Jangan menguji pada akun staf sungguhan. Jangan menonaktifkan/reset sandi akun nyata sebagai "uji".

## C. Menguji tampilan dengan Playwright (respons dipalsukan)

```bash
python3 -m venv /tmp/v && /tmp/v/bin/pip -q install playwright && /tmp/v/bin/python -m playwright install chromium
python3 -m http.server 8000      # dari akar repositori, di terminal lain
```

Skrip menyuntikkan sesi palsu ke `localStorage` kunci `sb-ewicmiekwzmxkkokmpzf-auth-token` (JWT berformat benar, `exp` jauh di depan) lalu memalsukan semua panggilan `**/*supabase.co/**` dengan `page.route`: `/auth/v1/user`, `/rest/v1/<tabel>`, `/rpc/<fungsi>`, `/functions/v1/marketing`. Rekam isi permintaan POST/PATCH/RPC untuk membuktikan payload benar. Periksa: tidak ada `pageerror`/konsol error, `document.documentElement.scrollWidth > innerWidth` bernilai `False` pada 1440 px **dan** 390 px, dan ambil tangkapan layar.

Batasan: mock membuktikan UI dan payload; **bukan** data/izin asli.

## D. Memastikan rilis benar-benar terbit

`python3 scripts/status_check.py` — semua berkas `live sama dengan repo`. Setelah push tunggu 1–2 menit (Pages).

## E. Skenario uji manusia (checklist untuk staf asli)

**Staf (mis. korlap dengan client):**
1. Login → Active Client → tabel hanya berisi client miliknya; jumlah sesuai harapan pemilik.
2. Klik nomor HP → WhatsApp terbuka ke nomor yang benar.
3. **Catat Visit** pada satu client → tahap 1 → tahap 2 dengan status penawaran → muncul di daftar PIC Visit.
4. Menu 3 → client itu tampil dengan tahap/jadwal; "Catat progress" → riwayat bertambah.
5. Tidak melihat tombol Ubah/Tambah/Arsipkan.

**Admin:**
1. Tabel menampilkan semua client; filter dan Ekspor Excel jalan; file terbuka di Excel.
2. Ubah satu client (mis. isi tanggal kontrak, ganti PIC) → muncul di Riwayat perubahan. Kembalikan datanya bila hanya uji.
3. Arsipkan client uji → hilang dari tampilan staf pemiliknya; Aktifkan lagi.
4. Akun uji: Nonaktifkan → login gagal; Aktifkan → login berhasil; Reset kata sandi → sandi baru berfungsi, lama gagal.
5. Pemetaan PIC → akun: hubungkan satu PIC uji; staf itu langsung melihat client-nya.

Catat hasil nyata di `TEST_RESULTS.md` (tanggal, penguji, hasil, temuan).
