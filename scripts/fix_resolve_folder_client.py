#!/usr/bin/env python3
"""Sinkronkan SEMUA node sub-workflow Resolve Folder Client dari
n8n/resolve-folder-client.template.json ke instance live (credentials & posisi
node yang sudah ada tetap dipertahankan, cuma `type`/`parameters`/`onError` yang
disalin dari template).

Pakai: python3 scripts/fix_resolve_folder_client.py <sub_workflow_id>
"""
import copy
import json
import sys
import urllib.request
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit('Pakai: python3 scripts/fix_resolve_folder_client.py <sub_workflow_id>')
sub_workflow_id = sys.argv[1]

root = Path(__file__).resolve().parents[1]
api_key = (Path.home() / '.n8n_raykerja_apikey_key').read_text().strip()
base_url = 'https://steelblue-stingray-633122.hostingersite.com'
headers = {'X-N8N-API-KEY': api_key, 'Content-Type': 'application/json'}

request = urllib.request.Request(f'{base_url}/api/v1/workflows/{sub_workflow_id}', headers=headers)
with urllib.request.urlopen(request, timeout=25) as response:
    current = json.load(response)

drive_credentials = next(
    (n.get('credentials') for n in current['nodes'] if n.get('credentials')), None
)
assert drive_credentials, 'Tidak ada credentials Google Drive yang bisa disalin; hentikan.'

template = json.loads((root / 'n8n' / 'resolve-folder-client.template.json').read_text())
template_by_name = {n['name']: n for n in template['nodes']}
current_by_name = {n['name']: n for n in current['nodes']}
assert set(template_by_name) == set(current_by_name), (
    f'Node template vs live tidak sama: template={sorted(template_by_name)} live={sorted(current_by_name)}'
)

new_nodes = []
for name, old_node in current_by_name.items():
    new_node = copy.deepcopy(template_by_name[name])
    new_node['id'] = old_node['id']
    new_node['position'] = old_node['position']
    if new_node['type'] in ('n8n-nodes-base.httpRequest', 'n8n-nodes-base.googleDrive'):
        new_node['credentials'] = copy.deepcopy(old_node.get('credentials') or drive_credentials)
    new_nodes.append(new_node)

payload = {'name': current['name'], 'nodes': new_nodes, 'connections': template['connections'],
           'settings': current.get('settings') or template.get('settings') or {}}
put_request = urllib.request.Request(
    f'{base_url}/api/v1/workflows/{sub_workflow_id}', data=json.dumps(payload).encode(),
    headers=headers, method='PUT',
)
with urllib.request.urlopen(put_request, timeout=25) as response:
    updated = json.load(response)

print(json.dumps({
    'sub_workflow_id': sub_workflow_id,
    'active': updated.get('active'),
    'node_count': len(new_nodes),
}, ensure_ascii=False, indent=2))
