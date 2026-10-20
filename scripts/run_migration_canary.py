#!/usr/bin/env python3
"""Jalankan migrasi eksekusi nyata untuk 1 akun saja (canary test sebelum full run).

Pakai: python3 scripts/run_migration_canary.py <migration_workflow_id> <display_name> <drive_folder_id>
"""
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

migration_workflow_id, display_name, drive_folder_id = sys.argv[1], sys.argv[2], sys.argv[3]

root = Path(__file__).resolve().parents[1]
api_key = (Path.home() / '.n8n_raykerja_apikey_key').read_text().strip()
base_url = 'https://steelblue-stingray-633122.hostingersite.com'
headers = {'X-N8N-API-KEY': api_key, 'Content-Type': 'application/json'}
migration_secret = (root / 'private' / 'migration-webhook-secret.txt').read_text().strip()


def call(method, url, body=None, extra_headers=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers={**headers, **(extra_headers or {})}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            payload = response.read()
            return json.loads(payload) if payload else {}
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors='replace')
        raise SystemExit(json.dumps({'error': f'HTTP {error.code} pada {method} {url}', 'detail': detail}, ensure_ascii=False, indent=2))


def set_active(active):
    path = 'activate' if active else 'deactivate'
    return call('POST', f'{base_url}/api/v1/workflows/{migration_workflow_id}/{path}', {})


print(f'Canary: 1 akun ({display_name}), mode EKSEKUSI NYATA')
set_active(True)
time.sleep(2)
try:
    result = call(
        'POST', f'{base_url}/webhook/raykerja-migrate-folder-klien',
        {'dry_run': False, 'accounts': [{'display_name': display_name, 'drive_folder_id': drive_folder_id}]},
        {'x-ray-migration-secret': migration_secret},
    )
finally:
    set_active(False)

print(json.dumps(result, ensure_ascii=False, indent=2))
