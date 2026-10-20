#!/usr/bin/env python3
"""Re-export n8n/offer-documents.template.json dan n8n/resolve-folder-client.template.json
dari workflow live, setelah perubahan folder klien per akun -- strip credentials/webhookId
dan ganti secret asli dengan placeholder yang sudah ada di template (tidak membuat
placeholder baru), mengikuti konvensi scripts/export_portable_workflows.py.
"""
import copy
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
api_key = (Path.home() / '.n8n_raykerja_apikey_key').read_text().strip()
base_url = 'https://steelblue-stingray-633122.hostingersite.com'
headers = {'X-N8N-API-KEY': api_key}


def fetch(workflow_id):
    request = urllib.request.Request(f'{base_url}/api/v1/workflows/{workflow_id}', headers=headers)
    with urllib.request.urlopen(request, timeout=25) as response:
        return json.load(response)


def strip_credentials(workflow):
    cleaned = {key: copy.deepcopy(workflow[key]) for key in ('name', 'nodes', 'connections', 'settings')}
    for node in cleaned['nodes']:
        node.pop('credentials', None)
        node.pop('webhookId', None)
    return cleaned


# 1. Offer workflow (R7kXoTLBk8X0d4cy) -- ganti secret asli dengan placeholder yang sudah ada
offer = fetch('R7kXoTLBk8X0d4cy')
offer_clean = strip_credentials(offer)
validasi = next(n for n in offer_clean['nodes'] if n['name'] == 'Validasi Penawaran Web')
match = re.search(r"secret\s*!==\s*'([^']+)'", validasi['parameters']['jsCode'])
assert match, 'Pola secret tidak ditemukan di Validasi Penawaran Web; periksa manual.'
real_secret = match.group(1)
resolve_node = next(n for n in offer_clean['nodes'] if n['name'] == 'Resolve Folder Client')
real_sub_workflow_id = resolve_node['parameters']['workflowId']['value']

text = json.dumps(offer_clean, ensure_ascii=False, indent=2)
text = text.replace(real_secret, 'SET_MARKETING_WEBHOOK_SECRET')
text = text.replace(real_sub_workflow_id, 'SET_RESOLVE_FOLDER_CLIENT_WORKFLOW_ID')
assert real_secret not in text and real_sub_workflow_id not in text and '"credentials"' not in text
(ROOT / 'n8n' / 'offer-documents.template.json').write_text(text + '\n')
print(f'n8n/offer-documents.template.json: {len(offer_clean["nodes"])} node, secret+id disamarkan')

# 2. Sub-workflow Resolve Folder Client -- tidak ada secret, cuma strip credentials
sub = fetch(real_sub_workflow_id)
sub_clean = strip_credentials(sub)
text2 = json.dumps(sub_clean, ensure_ascii=False, indent=2)
assert '"credentials"' not in text2
(ROOT / 'n8n' / 'resolve-folder-client.template.json').write_text(text2 + '\n')
print(f'n8n/resolve-folder-client.template.json: {len(sub_clean["nodes"])} node, credentials dibersihkan')
