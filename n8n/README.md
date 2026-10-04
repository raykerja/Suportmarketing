# Template workflow n8n

Tiga file `*.template.json` adalah salinan portabel dari alur riset target, surat ke Drive, dan kunjungan ke Sheet. Seluruh **credential binding**, `webhookId`, dan nilai `X-RAY-Secret` asli telah dihapus/diganti placeholder. ID spreadsheet pada template kunjungan juga diganti `SET_SPREADSHEET_ID`.

Untuk lingkungan baru: impor template sebagai workflow **nonaktif**, pilih ulang credential OpenAI/Google Search/Google Drive/Google Sheets pada node yang memerlukannya, isi ID Sheet dan secret webhook yang sama dengan Edge Function, periksa semua URL callback dan path webhook, lalu uji end-to-end sebelum aktivasi. Jangan aktifkan template mentah; placeholder belum terkonfigurasi.

Workflow production saat ini sudah aktif dengan ID pada `PROJECT_HANDOFF.md`. Template ini merupakan bahan pemulihan/migrasi, bukan backup credential atau export execution history. Script `scripts/export_portable_workflows.py` dapat membuat ulang template dari draft privat bila draft tersebut tersedia secara lokal.
