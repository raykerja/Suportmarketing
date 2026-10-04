#!/usr/bin/env python3
"""Siapkan salinan workflow Marketing di private/ tanpa mengubah n8n."""
import copy
import json
import re
import urllib.request
from pathlib import Path

HOME = Path.home()
SOURCE_ID = '7I5Iw7Y43Ik5FaQc'
PROJECT_REF = 'ewicmiekwzmxkkokmpzf'
INSTANCE = json.loads((HOME / '.n8n_instances.json').read_text())['main']['url'].rstrip('/')
KEY = (HOME / '.n8n_key').read_text().strip()
request = urllib.request.Request(
    f'{INSTANCE}/api/v1/workflows/{SOURCE_ID}',
    headers={'X-N8N-API-KEY': KEY},
)
with urllib.request.urlopen(request, timeout=25) as result:
    source = json.load(result)

required = {
    'Webhook RAY AI Target', 'Siapkan Data Target (RAY AI)', 'If Target (RAY AI)',
    'Respond Error Target ke RAY AI', 'AI Research + Verify + Score (RAY AI)',
    'OpenAI Model', 'Target Parser', 'google_search', 'sirup_search',
    'Respond Timeout Target ke RAY AI', 'Susun Baris Target (RAY AI)',
    'Susun Hasil untuk RAY AI', 'Respond Target ke RAY AI',
    'Respond Diterima ke RAY AI',
}
nodes = [copy.deepcopy(n) for n in source['nodes'] if n['name'] in required]
assert {n['name'] for n in nodes} == required, 'Node sumber berubah; hentikan migrasi.'
callback_url = f'https://{PROJECT_REF}.supabase.co/functions/v1/marketing'
for node in nodes:
    params = node['parameters']
    if node['name'] == 'Webhook RAY AI Target':
        params['path'] = 'raykerja-target'
    if node['name'] == 'Siapkan Data Target (RAY AI)':
        old_code = params['jsCode']
        new_code, count = re.subn(
            r"const research_id = 'SEARCH-' \+ ymd \+ '-' \+ rnd3;",
            "const research_id = /^RK-[0-9a-f-]{36}$/i.test(String(b.research_id || '')) ? String(b.research_id) : 'SEARCH-' + ymd + '-' + rnd3;",
            old_code,
        )
        assert count == 1, 'Kontrak research_id berubah; hentikan migrasi.'
        params['jsCode'] = new_code
    if node['name'] == 'Susun Baris Target (RAY AI)':
        old_code = params['jsCode']
        assert 'if (!targets.length) { return []; }' in old_code, 'Jalur kosong berubah; hentikan migrasi.'
        params['jsCode'] = old_code.replace('if (!targets.length) { return []; }',
                                            'if (!targets.length) { return [{json:{_no_target:true}}]; }')
    if node['name'] == 'Susun Hasil untuk RAY AI':
        old_code = params['jsCode']
        assert 'const rows = $input.all().map(i => i.json);' in old_code, 'Susun Hasil berubah; hentikan migrasi.'
        params['jsCode'] = old_code.replace('const rows = $input.all().map(i => i.json);',
                                            'const rows = $input.all().map(i => i.json).filter(r => !r._no_target);')
    if node['name'] in {'Respond Target ke RAY AI', 'Respond Timeout Target ke RAY AI'}:
        params['url'] = callback_url

connections = {}
for name, spec in source['connections'].items():
    if name not in required:
        continue
    filtered = {}
    for kind, groups in spec.items():
        clean_groups = [[item for item in group if item['node'] in required] for group in groups]
        if any(clean_groups):
            filtered[kind] = clean_groups
    if filtered:
        connections[name] = filtered

workflow = {
    'name': 'Raykerja Marketing - Target Research (Supabase)',
    'nodes': nodes,
    'connections': connections,
    'settings': source.get('settings') or {},
}
private = Path(__file__).resolve().parents[1] / 'private'
private.mkdir(exist_ok=True)
output = private / 'raykerja-n8n-draft.json'
output.write_text(json.dumps(workflow, ensure_ascii=False, indent=2))
output.chmod(0o600)
print(json.dumps({
    'source_id': SOURCE_ID,
    'source_version': source.get('versionId'),
    'source_active': source.get('active'),
    'nodes': len(nodes),
    'webhook_path': 'raykerja-target',
    'removed': len(source['nodes']) - len(nodes),
    'draft': str(output),
    'contains_credentials': True,
}, indent=2))
