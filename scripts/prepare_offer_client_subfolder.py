#!/usr/bin/env python3
"""Siapkan perubahan "folder klien per akun" untuk workflow penawaran.

Langkah (tidak mengubah workflow aktif):
1. Fetch workflow aktif (read-only) + backup mentah ke private/.
2. Buat (POST) workflow baru "Raykerja Marketing - Resolve Folder Client" di instance
   yang sama, pakai kredensial Google Drive yang sudah tersambung di node
   "Salin Template RAB" (disalin, bukan dibuat baru) -- workflow baru ini INACTIVE,
   tidak menyentuh workflow produksi mana pun.
3. Siapkan draft workflow penawaran yang sudah dipatch (node baru "Resolve Folder
   Client" + folderId di 2 node pindah) -- ditulis ke private/, BELUM di-PUT.

Tidak ada PUT ke workflow aktif `R7kXoTLBk8X0d4cy` di script ini.
"""
import copy
import json
import urllib.request
from pathlib import Path

root = Path(__file__).resolve().parents[1]
api_key = (Path.home() / '.n8n_raykerja_apikey_key').read_text().strip()
base_url = 'https://steelblue-stingray-633122.hostingersite.com'
headers = {'X-N8N-API-KEY': api_key, 'Content-Type': 'application/json'}
OFFER_WORKFLOW_ID = 'R7kXoTLBk8X0d4cy'

REQUIRED_NODES = {
    'Webhook Penawaran Web', 'Validasi Penawaran Web', 'Respons Penawaran Diterima',
    'Ambil Counter Nomor Surat', 'Siapkan Penawaran Web', 'Perbarui Counter Nomor Surat',
    'Salin Template RAB', 'Isi Data RAB', 'Pindahkan RAB ke Folder Akun', 'Salin Template Surat',
    'Isi Surat Pengantar', 'Pindahkan Surat ke Folder Akun', 'Callback Penawaran Supabase',
}

# 1. Fetch + backup workflow aktif (read-only)
request = urllib.request.Request(f'{base_url}/api/v1/workflows/{OFFER_WORKFLOW_ID}', headers=headers)
with urllib.request.urlopen(request, timeout=25) as response:
    current = json.load(response)

live_names = {n['name'] for n in current['nodes']}
missing = REQUIRED_NODES - live_names
assert not missing, f'Node yang dibutuhkan hilang dari live: {sorted(missing)}; hentikan.'
extra = live_names - REQUIRED_NODES
if extra:
    print(json.dumps({'info': 'Node tambahan di live (di luar 13 node inti, diasumsikan tidak terkait titik patch)',
                       'extra_nodes': sorted(extra)}, ensure_ascii=False))

backup_path = root / 'private' / 'backup-offer-live-before-client-subfolder.json'
backup_path.parent.mkdir(exist_ok=True)
backup_path.write_text(json.dumps(current, ensure_ascii=False, indent=2))
backup_path.chmod(0o600)

# 2. Ambil kredensial Google Drive yang sudah tersambung di node Salin Template RAB
rab_copy_node = next(n for n in current['nodes'] if n['name'] == 'Salin Template RAB')
drive_credentials = rab_copy_node.get('credentials')
assert drive_credentials, 'Node "Salin Template RAB" tidak punya credentials Google Drive; hentikan.'

sub_workflow = json.loads((root / 'n8n' / 'resolve-folder-client.template.json').read_text())
for node in sub_workflow['nodes']:
    if node['name'] in ('Cari Folder Client', 'Buat Folder Client'):
        node['credentials'] = copy.deepcopy(drive_credentials)

create_request = urllib.request.Request(
    f'{base_url}/api/v1/workflows',
    data=json.dumps({k: sub_workflow[k] for k in ('name', 'nodes', 'connections', 'settings')}).encode(),
    headers=headers, method='POST',
)
with urllib.request.urlopen(create_request, timeout=25) as response:
    created = json.load(response)
sub_workflow_id = created['id']

# 3. Siapkan draft workflow penawaran yang sudah dipatch (BELUM di-PUT)
patched = copy.deepcopy(current)
nodes_by_name = {n['name']: n for n in patched['nodes']}

resolve_node = {
    'id': 'b1a6c0b2-7e0a-4c1d-9b7a-7d7a6c0f2d1a',
    'name': 'Resolve Folder Client',
    'type': 'n8n-nodes-base.executeWorkflow',
    'typeVersion': 1.2,
    'position': [1320, 140],
    'onError': 'continueRegularOutput',
    'parameters': {
        'workflowId': {'__rl': True, 'mode': 'id', 'value': sub_workflow_id},
        'workflowInputs': {
            'mappingMode': 'defineBelow',
            'value': {
                'parentFolderId': "={{ $('Validasi Penawaran Web').first().json.drive_folder_id }}",
                'namaClient': "={{ $('Siapkan Penawaran Web').first().json.namaClient }}",
            },
        },
    },
}
patched['nodes'].append(resolve_node)

EXPECTED_FOLDER_EXPR = "={{ $('Validasi Penawaran Web').first().json.drive_folder_id }}"
for move_name in ('Pindahkan RAB ke Folder Akun', 'Pindahkan Surat ke Folder Akun'):
    node = nodes_by_name[move_name]
    old_value = node['parameters']['folderId']['value']
    if old_value != EXPECTED_FOLDER_EXPR:
        raise SystemExit(json.dumps({
            'error': f'folderId node {move_name} tidak sesuai ekspektasi; hentikan sebelum patch.',
            'expected': EXPECTED_FOLDER_EXPR, 'actual': old_value,
        }, ensure_ascii=False, indent=2))
    node['parameters']['folderId']['value'] = (
        "={{ $('Resolve Folder Client').first().json.clientFolderId"
        " || $('Validasi Penawaran Web').first().json.drive_folder_id }}"
    )

EXPECTED_CONN = [{'node': 'Salin Template RAB', 'type': 'main', 'index': 0}]
old_conn = patched['connections']['Perbarui Counter Nomor Surat']['main'][0]
if old_conn != EXPECTED_CONN:
    raise SystemExit(json.dumps({
        'error': 'Koneksi "Perbarui Counter Nomor Surat" tidak sesuai ekspektasi; hentikan sebelum patch.',
        'expected': EXPECTED_CONN, 'actual': old_conn,
    }, ensure_ascii=False, indent=2))
patched['connections']['Perbarui Counter Nomor Surat']['main'][0] = [
    {'node': 'Resolve Folder Client', 'type': 'main', 'index': 0}
]
patched['connections']['Resolve Folder Client'] = {
    'main': [[{'node': 'Salin Template RAB', 'type': 'main', 'index': 0}]]
}

draft_path = root / 'private' / 'raykerja-offer-n8n-update.json'
draft_payload = {k: patched[k] for k in ('name', 'nodes', 'connections', 'settings')}
draft_path.write_text(json.dumps(draft_payload, ensure_ascii=False, indent=2))
draft_path.chmod(0o600)

print(json.dumps({
    'offer_workflow_id': OFFER_WORKFLOW_ID,
    'sub_workflow_id': sub_workflow_id,
    'sub_workflow_active': created.get('active'),
    'backup': str(backup_path),
    'draft': str(draft_path),
    'next_step': 'Belum ada PUT ke workflow aktif. Uji dulu via test-webhook sub-workflow/draft, baru minta persetujuan sebelum PUT.',
}, ensure_ascii=False, indent=2))
