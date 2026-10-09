#!/usr/bin/env python3
"""Deploy Edge Function `marketing` dari supabase/functions/marketing/index.ts (satu berkas) lewat Management API.
Pemakaian:  python3 scripts/deploy_function.py
Hanya jalankan setelah pemilik menyetujui deploy produksi. Setelah deploy, cek `python3 scripts/status_check.py`."""
import json, sys, uuid
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from _supabase import API, call, token

root = Path(__file__).resolve().parents[1]
tok = token()
if not tok:
    sys.exit('Token Supabase tidak ditemukan. Minta dari pemilik.')
source = (root / 'supabase/functions/marketing/index.ts').read_bytes()
boundary = uuid.uuid4().hex
meta = json.dumps({'name': 'marketing', 'entrypoint_path': 'index.ts', 'verify_jwt': False})
body = (f'--{boundary}\r\nContent-Disposition: form-data; name="metadata"\r\n\r\n{meta}\r\n'
        f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="index.ts"\r\n'
        'Content-Type: application/typescript\r\n\r\n').encode() + source + f'\r\n--{boundary}--\r\n'.encode()
status, result = call(API + '/functions/deploy?slug=marketing', {'Authorization': 'Bearer ' + tok, 'Content-Type': 'multipart/form-data; boundary=' + boundary}, body, 'POST', timeout=120)
if status >= 300:
    sys.exit(f'GAGAL ({status}): {str(result)[:400]}')
print('Versi sekarang:', result.get('version'), result.get('status'))
