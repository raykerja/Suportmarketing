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
