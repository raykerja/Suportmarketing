# Keputusan pemilik (jangan dibalik tanpa bertanya)

| Keputusan | Alasan / konteks |
| --- | --- |
| Pertahankan arsitektur **HTML/CSS/JS statis + Supabase + n8n + Google Sheet/Drive**. Jangan menulis ulang dari nol | Sudah berjalan dan dipahami tim |
| Cadangan ke Drive staf **tanpa n8n** (Apps Script Drive Gateway); tidak memakai kunci JSON service account | Pemilik menolak n8n/kunci JSON untuk cadangan |
| Tiap staf hanya melihat datanya sendiri; admin melihat semua | Privasi antarstaf, akuntabilitas |
| Client aktif bersifat **data tetap**: ditampilkan sebagai **tabel**; hanya super admin yang boleh mengubah/melengkapi | Permintaan 9 Okt 2026 |
| Super admin (4 orang) memegang perubahan PIC Korlap/Admin, data client, folder & nama staf | Permintaan 9 Okt 2026. Diwujudkan sebagai role `admin` yang sama |
| Client berhenti **diarsipkan**, tidak dihapus | Riwayat kunjungan/penawaran tetap utuh |
| Nomor HP PIC user tersambung ke WhatsApp (wa.me) | Mempercepat follow-up |
| Perubahan produksi (push, migrasi, deploy, n8n aktif, DNS, tindakan destruktif) **perlu persetujuan eksplisit** untuk tindakan itu | Kebijakan pemilik |
| Hasil harus dibuktikan di sistem tujuan; laporkan batas uji jujur | Pemilik menuntut bukti nyata |
| Biaya (AI, API) diukur, bukan ditebak; keputusan yang menyangkut uang milik pemilik | Pemilik peduli rupiah |
| Jangan menempel kunci/kata sandi di chat; tolak dan sarankan diganti bila terlanjur | Keamanan |
| Jalur Drive → Supabase (nanti) berupa versi terpisah dengan tombol Terapkan/Abaikan, bukan menimpa | Mencegah edit di Sheet merusak data asli |
| Bahasa komunikasi: Indonesia, ringkas | Preferensi pemilik |
