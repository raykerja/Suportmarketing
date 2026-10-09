# Mulai di sini — Portal Marketing RAY

Dokumen ini untuk **staf pengembang dan Claude yang melanjutkan proyek ini**. Baca berurutan; total sekitar 20 menit. Tanggal acuan dokumen: **9 Oktober 2026** (Waktu Indonesia Barat).

> **Repositori ini PUBLIK.** Jangan pernah menaruh kata sandi, token, service role key, nomor HP client, nama staf/PIC, email staf, ID folder Drive, atau ekspor data di Git. Daftar rahasia dan di mana tempatnya ada di [03](03-PENGATURAN-DAN-OPERASIONAL.md).

## Apa ini

Portal web internal PT Ray Mitra Perkasa di **https://marketing.raykerja.cloud** untuk tim marketing:
mengelola client aktif beserta PIC Korlap/Admin-nya, mencatat kunjungan (Sales Visit dan PIC Visit), memantau penawaran ulang, riset target pasar, membuat surat/RAB penawaran, dan bertanya ke asisten AI.

## Tautan penting

| Apa | Alamat |
| --- | --- |
| Situs produksi | https://marketing.raykerja.cloud (GitHub Pages dari branch `main`) |
| Repositori kode | https://github.com/raykerja/Suportmarketing (branch `main`, publik) |
| Proyek Supabase | ref `ewicmiekwzmxkkokmpzf`, wilayah ap-southeast-1 — dashboard: https://supabase.com/dashboard/project/ewicmiekwzmxkkokmpzf |
| URL API Supabase | https://ewicmiekwzmxkkokmpzf.supabase.co |
| Edge Function | `marketing` → https://ewicmiekwzmxkkokmpzf.supabase.co/functions/v1/marketing (JWT diverifikasi di dalam kode, `verify_jwt=false` di konfigurasi) |
| n8n, Google Sheet/Drive, Apps Script | lihat [01-ARSITEKTUR](01-ARSITEKTUR.md) dan [03](03-PENGATURAN-DAN-OPERASIONAL.md); akses diberikan pemilik terpisah |

Akses ke GitHub **tidak** otomatis memberi akses ke Supabase, n8n, atau Google. Pemilik harus memberi tiap akses secara terpisah (daftar kebutuhan akses ada di dokumen 03).

## Urutan baca

1. **00-MULAI-DI-SINI** (ini).
2. [02-STATUS-PROGRES](02-STATUS-PROGRES.md) — apa yang **sudah**, **belum diuji**, dan **belum dibangun**. Mulai dari sini kalau ingin tahu "sampai mana".
3. [01-ARSITEKTUR](01-ARSITEKTUR.md) — bagaimana sistem bekerja: komponen, tabel, aturan akses, alur data.
4. [03-PENGATURAN-DAN-OPERASIONAL](03-PENGATURAN-DAN-OPERASIONAL.md) — pengaturan, tugas admin sehari-hari, cara deploy, daftar rahasia.
5. [04-PENGUJIAN](04-PENGUJIAN.md) — cara menguji tanpa merusak produksi.
6. [05-BACKLOG-DAN-TINDAK-LANJUT](05-BACKLOG-DAN-TINDAK-LANJUT.md) — pekerjaan berikutnya berurutan prioritas dan risiko yang diketahui.
7. [06-KEPUTUSAN-PEMILIK](06-KEPUTUSAN-PEMILIK.md) — keputusan yang sudah diambil pemilik; jangan dibalik tanpa bertanya.

Dokumen lama (`PROJECT_HANDOFF.md`, `PROJECT_MEMORY.md`, `README.md`, `CHANGELOG.md`, `PROCESS_LOG.md`, `TEST_RESULTS.md`) tetap ada sebagai riwayat. **Bila bertentangan dengan folder `docs/`, folder `docs/` yang benar** (ditulis lebih baru).

## Cara cepat mengetahui keadaan sebenarnya

Jalankan dari akar repositori:

```bash
python3 scripts/status_check.py
```

Skrip itu hanya membaca: membandingkan Git dengan situs live, mengecek Edge Function, dan (bila token Supabase tersedia) memeriksa tabel, RLS, jumlah akun, dan hal yang belum beres. Hasilnya ditandai `OK`, `PERHATIAN`, atau `GAGAL`. **Jalankan ini sebelum mulai bekerja dan sesudah selesai.**

## Aturan kerja (ringkas)

1. Perubahan sekecil mungkin, kompatibel dengan fitur yang ada. Jangan menulis ulang dari nol.
2. Setiap tabel/fungsi baru: RLS **dan** grant dijelaskan eksplisit dalam migrasi, lalu diuji dengan akun staf pemilik, staf lain, admin, dan anonim ([04](04-PENGUJIAN.md)).
3. Sebelum push, migrasi produksi, deploy Edge Function, mengubah n8n aktif, atau tindakan destruktif: **minta persetujuan pemilik** untuk tindakan itu.
4. Jangan menyatakan "selesai" tanpa bukti di sistem tujuan (produksi). Laporkan batas pengujian apa adanya.
5. Setelah selesai, **perbarui [02-STATUS-PROGRES](02-STATUS-PROGRES.md)** dan tambah satu entri di `CHANGELOG.md`.
6. Bahasa komunikasi dengan pemilik: Indonesia. Pemilik menyukai perintah pendek dan bukti nyata.
