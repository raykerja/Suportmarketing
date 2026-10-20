#!/usr/bin/env python3
"""Terapkan draft private/raykerja-offer-n8n-update.json ke workflow penawaran
R7kXoTLBk8X0d4cy (pemilik sudah menyetujui), lalu readback + diff terhadap backup
untuk membuktikan hanya perubahan yang dimaksud yang diterapkan.
"""
import json
import urllib.request
from pathlib import Path

root = Path(__file__).resolve().parents[1]
api_key = (Path.home() / '.n8n_raykerja_apikey_key').read_text().strip()
base_url = 'https://steelblue-stingray-633122.hostingersite.com'
headers = {'X-N8N-API-KEY': api_key, 'Content-Type': 'application/json'}
OFFER_WORKFLOW_ID = 'R7kXoTLBk8X0d4cy'

draft = json.loads((root / 'private' / 'raykerja-offer-n8n-update.json').read_text())
backup = json.loads((root / 'private' / 'backup-offer-live-before-client-subfolder.json').read_text())

put_request = urllib.request.Request(
    f'{base_url}/api/v1/workflows/{OFFER_WORKFLOW_ID}', data=json.dumps(draft).encode(),
    headers=headers, method='PUT',
)
with urllib.request.urlopen(put_request, timeout=25) as response:
    json.load(response)

get_request = urllib.request.Request(f'{base_url}/api/v1/workflows/{OFFER_WORKFLOW_ID}', headers=headers)
with urllib.request.urlopen(get_request, timeout=25) as response:
    live_after = json.load(response)

backup_by_name = {n['name']: n for n in backup['nodes']}
live_by_name = {n['name']: n for n in live_after['nodes']}

added = sorted(set(live_by_name) - set(backup_by_name))
removed = sorted(set(backup_by_name) - set(live_by_name))
changed = []
for name in sorted(set(backup_by_name) & set(live_by_name)):
    if backup_by_name[name].get('parameters') != live_by_name[name].get('parameters'):
        changed.append(name)

conn_backup = backup['connections']
conn_live = live_after['connections']
conn_changed = [k for k in set(conn_backup) | set(conn_live) if conn_backup.get(k) != conn_live.get(k)]

print(json.dumps({
    'active': live_after.get('active'),
    'versionId_before': backup.get('versionId'),
    'versionId_after': live_after.get('versionId'),
    'node_count_before': len(backup['nodes']),
    'node_count_after': len(live_after['nodes']),
    'nodes_added': added,
    'nodes_removed': removed,
    'nodes_with_changed_parameters': changed,
    'connections_changed': conn_changed,
    'expected': {
        'nodes_added': ['Resolve Folder Client'],
        'nodes_removed': [],
        'nodes_with_changed_parameters': ['Pindahkan RAB ke Folder Akun', 'Pindahkan Surat ke Folder Akun'],
        'connections_changed': ['Perbarui Counter Nomor Surat', 'Resolve Folder Client'],
    },
}, ensure_ascii=False, indent=2))
