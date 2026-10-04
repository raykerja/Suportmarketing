#!/usr/bin/env python3
"""Ekspor draft n8n ke template GitHub tanpa secret atau credential binding."""
import copy
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = {
    'raykerja-n8n-draft.json': 'target-research.template.json',
    'raykerja-letter-n8n-draft.json': 'letter-to-drive.template.json',
    'raykerja-visit-n8n-before-progress.json': 'visit-to-sheet.template.json',
}
OUTPUT = ROOT / 'n8n'
OUTPUT.mkdir(exist_ok=True)

for source_name, output_name in SOURCE.items():
    source = json.loads((ROOT / 'private' / source_name).read_text())
    workflow = {key: copy.deepcopy(source[key]) for key in ('name', 'nodes', 'connections', 'settings')}
    secret_values = set()
    for node in workflow['nodes']:
        original = next(item for item in source['nodes'] if item['id'] == node['id'])
        node.pop('credentials', None)
        node.pop('webhookId', None)
        for header in original['parameters'].get('headerParameters', {}).get('parameters', []):
            if header.get('name', '').lower() == 'x-ray-secret':
                secret_values.add(header['value'])
        code = original['parameters'].get('jsCode', '')
        match = re.search(r'secret\s*!==\s*"([^"]+)"', code)
        if match:
            secret_values.add(match.group(1))
        if node['type'] == 'n8n-nodes-base.googleSheets':
            node['parameters']['documentId'] = {
                '__rl': True, 'value': 'SET_SPREADSHEET_ID', 'mode': 'id'
            }
    assert len(secret_values) == 1, f'Secret tidak tunggal pada {source_name}; periksa manual.'
    old_secret = secret_values.pop()
    text = json.dumps(workflow, ensure_ascii=False, indent=2)
    assert text.count(old_secret) >= 1, f'Secret tidak ditemukan pada {source_name}'
    text = text.replace(old_secret, 'SET_MARKETING_WEBHOOK_SECRET')
    assert '"credentials"' not in text and old_secret not in text
    output = OUTPUT / output_name
    output.write_text(text + '\n')
    print(f'{output.relative_to(ROOT)}: {len(workflow["nodes"])} nodes; secret dan credential binding dibersihkan')
