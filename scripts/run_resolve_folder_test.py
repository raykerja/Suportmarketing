#!/usr/bin/env python3
"""Jalankan test 2x untuk workflow TEST - Resolve Folder Client (aktifkan, panggil, nonaktifkan).

Pakai: python3 scripts/run_resolve_folder_test.py <test_workflow_id> <sub_workflow_id>

n8n instance ini menolak aktivasi workflow kalau sub-workflow yang dipanggil via
Execute Workflow belum published -- jadi sub-workflow "Resolve Folder Client"
diaktifkan dulu, baru workflow test-nya.
"""
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit('Pakai: python3 scripts/run_resolve_folder_test.py <test_workflow_id> <sub_workflow_id>')
test_workflow_id = sys.argv[1]
sub_workflow_id = sys.argv[2]

root = Path(__file__).resolve().parents[1]
api_key = (Path.home() / '.n8n_raykerja_apikey_key').read_text().strip()
base_url = 'https://steelblue-stingray-633122.hostingersite.com'
headers = {'X-N8N-API-KEY': api_key, 'Content-Type': 'application/json'}
test_secret = (root / 'private' / 'test-resolve-folder-secret.txt').read_text().strip()


def call(method, url, body=None, extra_headers=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers={**headers, **(extra_headers or {})}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            payload = response.read()
            return json.loads(payload) if payload else {}
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors='replace')
        raise SystemExit(json.dumps({'error': f'HTTP {error.code} pada {method} {url}', 'detail': detail}, ensure_ascii=False, indent=2))


def set_active(workflow_id, active):
    path = 'activate' if active else 'deactivate'
    return call('POST', f'{base_url}/api/v1/workflows/{workflow_id}/{path}', {})


print('Mengaktifkan sub-workflow Resolve Folder Client...')
set_active(sub_workflow_id, True)
print('Mengaktifkan workflow test...')
set_active(test_workflow_id, True)
time.sleep(2)

webhook_url = f'{base_url}/webhook/raykerja-test-resolve-folder'
test_client = 'UJI INTERNAL - Resolve Folder Client'
test_headers = {'x-ray-test-secret': test_secret}

print('Run 1 (tanpa parent_folder_id, harus bikin folder scratch + 1 folder klien baru)...')
run1 = call('POST', webhook_url, {'nama_client': test_client}, test_headers)
print(json.dumps(run1, ensure_ascii=False, indent=2))

parent_folder_id = run1.get('parentFolderId') or run1.get('parent_folder_id')
client_folder_id_1 = run1.get('clientFolderId')

print('Run 2 (parent_folder_id SAMA, nama_client SAMA, harus REUSE folder klien, bukan bikin baru)...')
run2 = call('POST', webhook_url, {'nama_client': test_client, 'parent_folder_id': parent_folder_id}, test_headers)
print(json.dumps(run2, ensure_ascii=False, indent=2))
client_folder_id_2 = run2.get('clientFolderId')

print('Menonaktifkan workflow test (sub-workflow Resolve Folder Client DIBIARKAN aktif -- dibutuhkan permanen oleh workflow penawaran setelah PUT nanti)...')
set_active(test_workflow_id, False)

result = {
    'parent_folder_id_scratch': parent_folder_id,
    'client_folder_id_run1': client_folder_id_1,
    'client_folder_id_run2': client_folder_id_2,
    'idempoten_reuse_ok': bool(client_folder_id_1) and client_folder_id_1 == client_folder_id_2,
}
print(json.dumps(result, ensure_ascii=False, indent=2))
if not result['idempoten_reuse_ok']:
    print('GAGAL: clientFolderId run-1 dan run-2 berbeda (atau kosong) -- JANGAN lanjut PUT ke workflow live.')
else:
    print('OK: folder klien di-reuse pada run kedua, tidak ada duplikat.')
