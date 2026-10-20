#!/usr/bin/env python3
"""Jalankan workflow migrasi folder klien per-batch kecil (hindari timeout gateway
pada request tunggal besar). Workflow diaktifkan sekali, dipanggil berkali-kali per
batch akun, lalu dinonaktifkan di akhir (atau saat error, via try/finally).

Pakai: python3 scripts/run_migration_batched.py <migration_workflow_id> <dry_run|execute> [batch_size]
"""
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _supabase import sql

if len(sys.argv) < 3 or sys.argv[2] not in ('dry_run', 'execute'):
    raise SystemExit('Pakai: python3 scripts/run_migration_batched.py <migration_workflow_id> <dry_run|execute> [batch_size]')
migration_workflow_id = sys.argv[1]
dry_run = sys.argv[2] == 'dry_run'
batch_size = int(sys.argv[3]) if len(sys.argv) > 3 else 5

root = Path(__file__).resolve().parents[1]
api_key = (Path.home() / '.n8n_raykerja_apikey_key').read_text().strip()
base_url = 'https://steelblue-stingray-633122.hostingersite.com'
headers = {'X-N8N-API-KEY': api_key, 'Content-Type': 'application/json'}
migration_secret = (root / 'private' / 'migration-webhook-secret.txt').read_text().strip()


def call(method, url, body=None, extra_headers=None, timeout=150):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers={**headers, **(extra_headers or {})}, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        payload = response.read()
        return json.loads(payload) if payload else {}


def set_active(active):
    path = 'activate' if active else 'deactivate'
    return call('POST', f'{base_url}/api/v1/workflows/{migration_workflow_id}/{path}', {}, timeout=30)


accounts = sql(
    "select display_name, drive_folder_id from marketing_members "
    "where drive_folder_id is not null order by display_name"
)
batches = [accounts[i:i + batch_size] for i in range(0, len(accounts), batch_size)]
print(f'{len(accounts)} akun dibagi {len(batches)} batch (ukuran {batch_size}). Mode: {"DRY-RUN" if dry_run else "EKSEKUSI NYATA"}')

print('Mengaktifkan workflow migrasi...')
set_active(True)
time.sleep(2)

all_results = []
try:
    for i, batch in enumerate(batches):
        names = ', '.join(a['display_name'] for a in batch)
        print(f'Batch {i + 1}/{len(batches)}: {names}')
        try:
            result = call(
                'POST', f'{base_url}/webhook/raykerja-migrate-folder-klien',
                {'dry_run': dry_run, 'accounts': batch},
                {'x-ray-migration-secret': migration_secret},
            )
            all_results.append({'batch': names, 'result': result})
            print(f'  OK ({len(result)} item hasil)')
        except urllib.error.HTTPError as error:
            detail = error.read().decode(errors='replace')
            print(f'  GAGAL HTTP {error.code}: {detail[:300]}')
            all_results.append({'batch': names, 'error': f'HTTP {error.code}', 'detail': detail[:300]})
finally:
    print('Menonaktifkan workflow migrasi...')
    set_active(False)

output_path = root / 'private' / ('migration-dry-run-report.json' if dry_run else 'migration-execute-report.json')
output_path.write_text(json.dumps(all_results, ensure_ascii=False, indent=2))
output_path.chmod(0o600)

if dry_run:
    total_groups = sum(len(a.get('groups', [])) for b in all_results for a in b.get('result', []))
    total_unmatched = sum(len(a.get('unmatched', [])) for b in all_results for a in b.get('result', []))
    total_ambiguous = sum(sum(len(g.get('ambiguous', [])) for g in a.get('groups', [])) for b in all_results for a in b.get('result', []))
    print(json.dumps({'ringkasan': {
        'total_grup_klien_rab_surat': total_groups,
        'total_file_unmatched': total_unmatched,
        'total_file_ambiguous': total_ambiguous,
        'batch_gagal': [b['batch'] for b in all_results if 'error' in b],
    }}, ensure_ascii=False, indent=2))
else:
    total_moved = sum(len(b.get('result', [])) for b in all_results)
    print(json.dumps({'ringkasan': {
        'total_item_dipindah_atau_error': total_moved,
        'batch_gagal': [b['batch'] for b in all_results if 'error' in b],
    }}, ensure_ascii=False, indent=2))

print(f'Laporan lengkap: {output_path}')
