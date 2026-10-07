#!/usr/bin/env python3
"""Tambahkan riwayat progres ke file backup Drive staf (workflow kunjungan).
Membaca workflow aktif dari n8n (GET saja), menulis private/visit-progress-draft.json dan template."""
import json, re, copy
from pathlib import Path
root = Path(__file__).resolve().parents[1]
live = json.loads((root / 'private/live-visit.json').read_text())
wf = {k: copy.deepcopy(live[k]) for k in ('name', 'nodes', 'connections', 'settings')}
by = {n['name']: n for n in wf['nodes']}
v = by['Validasi Kunjungan']['parameters']
assert 'progress_events' not in v['jsCode']
v['jsCode'] = v['jsCode'].replace("backup_drive_file_id:b.backup_drive_file_id || null}",
    "backup_drive_file_id:b.backup_drive_file_id || null,\n  progress_events:Array.isArray(b.progress_events) ? b.progress_events.slice(0, 500) : []}")
b = by['Susun Backup JSON']['parameters']
assert 'riwayat_progres' not in b['jsCode']
b['jsCode'] = b['jsCode'].replace("data_kunjungan: base.visit};", "data_kunjungan: base.visit, riwayat_progres: base.progress_events || []};")
assert 'progress_events:Array' in v['jsCode'] and 'riwayat_progres' in b['jsCode']
(root / 'private/visit-progress-draft.json').write_text(json.dumps(wf, ensure_ascii=False, indent=2))
secrets = set(); tpl = copy.deepcopy(wf)
for n in tpl['nodes']:
    n.pop('credentials', None); n.pop('webhookId', None)
    for h in n['parameters'].get('headerParameters', {}).get('parameters', []):
        if h['name'].lower() == 'x-ray-secret': secrets.add(h['value'])
    m = re.search(r'secret\s*!==\s*"([^"]+)"', n['parameters'].get('jsCode', ''))
    if m: secrets.add(m.group(1))
    if n['type'] == 'n8n-nodes-base.googleSheets':
        n['parameters']['documentId'] = {'__rl': True, 'value': 'SET_SPREADSHEET_ID', 'mode': 'id'}
assert len(secrets) == 1
(root / 'n8n/visit-to-sheet.template.json').write_text(json.dumps(tpl, ensure_ascii=False, indent=2).replace(secrets.pop(), 'SET_MARKETING_WEBHOOK_SECRET') + '\n')
print('ok')
