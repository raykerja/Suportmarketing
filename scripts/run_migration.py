#!/usr/bin/env python3
"""Jalankan workflow migrasi folder klien (dry-run atau eksekusi nyata).

Pakai: python3 scripts/run_migration.py <migration_workflow_id> <dry_run|execute>
"""
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _supabase import sql

if len(sys.argv) != 3 or sys.argv[2] not in ('dry_run', 'execute'):
    raise SystemExit('Pakai: python3 scripts/run_migration.py <migration_workflow_id> <dry_run|execute>')
migration_workflow_id = sys.argv[1]
dry_run = sys.argv[2] == 'dry_run'

root = Path(__file__).resolve().parents[1]
api_key = (Path.home() / '.n8n_raykerja_apikey_key').read_text().strip()
base_url = 'https://steelblue-stingray-633122.hostingersite.com'
headers = {'X-N8N-API-KEY': api_key, 'Content-Type': 'application/json'}
migration_secret = (root / 'private' / 'migration-webhook-secret.txt').read_text().strip()


def call(method, url, body=None, extra_headers=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers={**headers, **(extra_headers or {})}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            payload = response.read()
            return json.loads(payload) if payload else {}
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors='replace')
        raise SystemExit(json.dumps({'error': f'HTTP {error.code} pada {method} {url}', 'detail': detail}, ensure_ascii=False, indent=2))


def set_active(active):
    path = 'activate' if active else 'deactivate'
    return call('POST', f'{base_url}/api/v1/workflows/{migration_workflow_id}/{path}', {})


accounts = sql(
    "select display_name, drive_folder_id from marketing_members "
    "where drive_folder_id is not null order by display_name"
)

print(f'{len(accounts)} akun. Mode: {"DRY-RUN (tidak memindahkan apa pun)" if dry_run else "EKSEKUSI NYATA (memindahkan file)"}')
print('Mengaktifkan workflow migrasi...')
set_active(True)
time.sleep(2)

try:
    result = call(
        'POST', f'{base_url}/webhook/raykerja-migrate-folder-klien',
        {'dry_run': dry_run, 'accounts': accounts},
        {'x-ray-migration-secret': migration_secret},
    )
finally:
    print('Menonaktifkan workflow migrasi...')
    set_active(False)

print(json.dumps(result, ensure_ascii=False, indent=2))

if dry_run:
    total_groups = sum(len(a.get('groups', [])) for a in result)
    total_unmatched = sum(len(a.get('unmatched', [])) for a in result)
    total_ambiguous = sum(sum(len(g.get('ambiguous', [])) for g in a.get('groups', [])) for a in result)
    print(json.dumps({
        'ringkasan': {
            'total_akun_dalam_laporan': len(result),
            'total_grup_klien_rab_surat': total_groups,
            'total_file_unmatched': total_unmatched,
            'total_file_ambiguous': total_ambiguous,
        }
    }, ensure_ascii=False, indent=2))
else:
    print(json.dumps({'ringkasan': {'total_file_dipindah_atau_error': len(result)}}, ensure_ascii=False, indent=2))
