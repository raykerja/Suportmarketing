#!/usr/bin/env python3
"""Terapkan SATU berkas migrasi ke database produksi dalam satu transaksi (begin ... commit).
Pemakaian:  python3 scripts/apply_migration.py supabase/migrations/NAMA.sql
Hanya jalankan setelah pemilik menyetujui migrasi produksi. Berhenti dan membatalkan seluruhnya bila ada error."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from _supabase import sql, token

if len(sys.argv) != 2:
    sys.exit(__doc__)
path = Path(sys.argv[1])
if not path.exists():
    sys.exit('Berkas tidak ada: ' + str(path))
if not token():
    sys.exit('Token Supabase tidak ditemukan (SUPABASE_ACCESS_TOKEN atau ~/.supabase_suportmarket_apikey_key). Minta dari pemilik.')
print(f'Menerapkan {path.name} ({len(path.read_text())} karakter) ...')
sql('begin;' + path.read_text() + '\ncommit;')
print('Selesai. Verifikasi hasilnya (tabel/policy/fungsi) dan uji RLS sebelum menyatakan beres; lihat docs/04-PENGUJIAN.md.')
