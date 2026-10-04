#!/usr/bin/env python3
"""Siapkan revisi minimum workflow kunjungan aktif; tidak mengirim perubahan ke n8n."""
import copy
import json
import urllib.request
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = json.loads((root / 'private/raykerja-visit-n8n-draft.json').read_text())
config = json.loads((Path.home() / '.n8n_instances.json').read_text())['main']
api_key = Path(config['keys']['read'].replace('~', str(Path.home()))).read_text().strip()
workflow_id = 'm12aJ6zFGhfgCjqP'
request = urllib.request.Request(config['url'].rstrip('/') + '/api/v1/workflows/' + workflow_id,
                                 headers={'X-N8N-API-KEY': api_key})
current = json.load(urllib.request.urlopen(request, timeout=20))
backup = root / 'private/raykerja-visit-n8n-before-progress.json'
backup.write_text(json.dumps(current, ensure_ascii=False, indent=2))
backup.chmod(0o600)
draft_nodes = {node['name']: node for node in source['nodes']}
for node in current['nodes']:
    if node['name'] in ('Susun Baris Sheet', 'Sinkron DataMarketing'):
        assert node['name'] in draft_nodes
        node['parameters'] = copy.deepcopy(draft_nodes[node['name']]['parameters'])
payload = {key: current[key] for key in ('name', 'nodes', 'connections', 'settings')}
output = root / 'private/raykerja-progress-n8n-update.json'
output.write_text(json.dumps(payload, ensure_ascii=False, indent=2))
output.chmod(0o600)
print(json.dumps({'workflow_id': workflow_id, 'changed_nodes': ['Susun Baris Sheet', 'Sinkron DataMarketing'],
                  'draft': str(output), 'backup': str(backup)}, ensure_ascii=False))
