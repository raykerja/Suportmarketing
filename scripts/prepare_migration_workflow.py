#!/usr/bin/env python3
"""Buat workflow SEMENTARA untuk migrasi file RAB/Surat lama ke folder per klien.

Pakai: python3 scripts/prepare_migration_workflow.py <sub_workflow_id>
  <sub_workflow_id> = id workflow "Raykerja Marketing - Resolve Folder Client"
  (dicetak oleh scripts/prepare_offer_client_subfolder.py).

Workflow yang dibuat di sini INACTIVE sampai Anda aktifkan sendiri untuk
menjalankan migrasi nyata, dan harus DIHAPUS + secret di-rotate setelah selesai
(lihat plan Bagian B.4).
"""
import copy
import json
import secrets
import sys
import urllib.request
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit('Pakai: python3 scripts/prepare_migration_workflow.py <sub_workflow_id>')
sub_workflow_id = sys.argv[1]

root = Path(__file__).resolve().parents[1]
api_key = (Path.home() / '.n8n_raykerja_apikey_key').read_text().strip()
base_url = 'https://steelblue-stingray-633122.hostingersite.com'
headers = {'X-N8N-API-KEY': api_key, 'Content-Type': 'application/json'}

migration_secret = secrets.token_urlsafe(24)

# Kredensial Google Drive: disalin dari node "Salin Template RAB" workflow penawaran aktif.
offer_request = urllib.request.Request(f'{base_url}/api/v1/workflows/R7kXoTLBk8X0d4cy', headers=headers)
with urllib.request.urlopen(offer_request, timeout=25) as response:
    offer_workflow = json.load(response)
rab_copy_node = next(n for n in offer_workflow['nodes'] if n['name'] == 'Salin Template RAB')
drive_credentials = rab_copy_node.get('credentials')
assert drive_credentials, 'Node "Salin Template RAB" tidak punya credentials Google Drive; hentikan.'

nodes = [
    {
        'id': '1a2b3c4d-0001-4a1a-9a1a-000000000001', 'name': 'Terima Migrasi Folder',
        'type': 'n8n-nodes-base.webhook', 'typeVersion': 2, 'position': [0, 0],
        'parameters': {'httpMethod': 'POST', 'path': 'raykerja-migrate-folder-klien',
                       'responseMode': 'responseNode', 'options': {}},
    },
    {
        'id': '1a2b3c4d-0001-4a1a-9a1a-000000000002', 'name': 'Validasi & Uraikan Akun',
        'type': 'n8n-nodes-base.code', 'typeVersion': 2, 'position': [220, 0],
        'parameters': {'jsCode': (
            "const input = $input.first().json;\n"
            "const secret = (input.headers || {})['x-ray-migration-secret'];\n"
            f"if (secret !== '{migration_secret}') throw new Error('Unauthorized');\n"
            "const body = input.body || {};\n"
            "const dryRun = body.dry_run !== false;\n"
            "const accounts = Array.isArray(body.accounts) ? body.accounts : [];\n"
            "return accounts\n"
            "  .filter(a => a && typeof a.drive_folder_id === 'string' && a.drive_folder_id)\n"
            "  .map(a => ({json: {display_name: String(a.display_name || ''), drive_folder_id: a.drive_folder_id, dryRun}}));"
        )},
    },
    {
        'id': '1a2b3c4d-0001-4a1a-9a1a-000000000003', 'name': 'List File di Folder Akun',
        'type': 'n8n-nodes-base.httpRequest', 'typeVersion': 4.5, 'position': [440, 0],
        'parameters': {
            'method': 'GET', 'url': 'https://www.googleapis.com/drive/v3/files',
            'authentication': 'predefinedCredentialType', 'nodeCredentialType': 'googleDriveOAuth2Api',
            'sendQuery': True,
            'queryParameters': {'parameters': [
                {'name': 'q', 'value': "={{ `'${$json.drive_folder_id}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'` }}"},
                {'name': 'fields', 'value': 'files(id,name)'},
                {'name': 'pageSize', 'value': '1000'},
                {'name': 'supportsAllDrives', 'value': 'true'},
                {'name': 'includeItemsFromAllDrives', 'value': 'true'},
                {'name': 'corpora', 'value': 'allDrives'},
            ]},
            'options': {},
        },
        'credentials': copy.deepcopy(drive_credentials),
    },
    {
        'id': '1a2b3c4d-0001-4a1a-9a1a-000000000004', 'name': 'Gabung Info Akun',
        'type': 'n8n-nodes-base.code', 'typeVersion': 2, 'position': [660, 0],
        'parameters': {
            'mode': 'runOnceForEachItem',
            'jsCode': (
                "const resp = $json;\n"
                "const acct = $('Validasi & Uraikan Akun').item.json;\n"
                "return {json: {...acct, files: resp.files || []}};"
            ),
        },
    },
    {
        'id': '1a2b3c4d-0001-4a1a-9a1a-000000000005', 'name': 'Kelompokkan per Client',
        'type': 'n8n-nodes-base.code', 'typeVersion': 2, 'position': [880, 0],
        'parameters': {
            'mode': 'runOnceForEachItem',
            'jsCode': (
                "const acct = $json;\n"
                "const groups = {};\n"
                "const unmatched = [];\n"
                "for (const f of (acct.files || [])) {\n"
                "  const mRab = /^RAB - (.+)$/.exec(f.name);\n"
                "  const mSurat = /^Surat Pengantar - (.+)$/.exec(f.name);\n"
                "  if (mRab && mRab[1].trim()) {\n"
                "    const c = mRab[1];\n"
                "    groups[c] = groups[c] || {rab: null, surat: null, ambiguous: []};\n"
                "    if (groups[c].rab) groups[c].ambiguous.push(f); else groups[c].rab = f;\n"
                "  } else if (mSurat && mSurat[1].trim()) {\n"
                "    const c = mSurat[1];\n"
                "    groups[c] = groups[c] || {rab: null, surat: null, ambiguous: []};\n"
                "    if (groups[c].surat) groups[c].ambiguous.push(f); else groups[c].surat = f;\n"
                "  } else {\n"
                "    unmatched.push(f);\n"
                "  }\n"
                "}\n"
                "return {json: {\n"
                "  display_name: acct.display_name,\n"
                "  drive_folder_id: acct.drive_folder_id,\n"
                "  dryRun: acct.dryRun,\n"
                "  groups: Object.keys(groups).map(client => ({client, ...groups[client]})),\n"
                "  unmatched,\n"
                "}};"
            ),
        },
    },
    {
        'id': '1a2b3c4d-0001-4a1a-9a1a-000000000006', 'name': 'Mode Dry-Run?',
        'type': 'n8n-nodes-base.if', 'typeVersion': 2, 'position': [1100, 0],
        'parameters': {'conditions': {
            'options': {'caseSensitive': True, 'leftValue': '', 'typeValidation': 'strict'},
            'conditions': [{
                'leftValue': "={{ $json.dryRun }}", 'rightValue': True,
                'operator': {'type': 'boolean', 'operation': 'true', 'singleValue': True},
            }],
            'combinator': 'and',
        }, 'options': {}},
    },
    {
        'id': '1a2b3c4d-0001-4a1a-9a1a-000000000007', 'name': 'Respond Dry-Run',
        'type': 'n8n-nodes-base.respondToWebhook', 'typeVersion': 1.1, 'position': [1320, -120],
        'parameters': {'respondWith': 'json', 'responseBody': '={{ $input.all().map(i => i.json) }}', 'options': {}},
    },
    {
        'id': '1a2b3c4d-0001-4a1a-9a1a-000000000008', 'name': 'Uraikan Grup Client',
        'type': 'n8n-nodes-base.code', 'typeVersion': 2, 'position': [1320, 120],
        'parameters': {'jsCode': (
            "const out = [];\n"
            "for (const item of $input.all()) {\n"
            "  const acct = item.json;\n"
            "  for (const g of (acct.groups || [])) {\n"
            "    out.push({json: {\n"
            "      display_name: acct.display_name,\n"
            "      drive_folder_id: acct.drive_folder_id,\n"
            "      client: g.client,\n"
            "      rab: g.rab,\n"
            "      surat: g.surat,\n"
            "    }});\n"
            "  }\n"
            "}\n"
            "return out;"
        )},
    },
    {
        'id': '1a2b3c4d-0001-4a1a-9a1a-000000000009', 'name': 'Resolve Folder Client',
        'type': 'n8n-nodes-base.executeWorkflow', 'typeVersion': 1.2, 'position': [1540, 120],
        'onError': 'continueRegularOutput',
        'parameters': {
            'mode': 'each',
            'workflowId': {'__rl': True, 'mode': 'id', 'value': sub_workflow_id},
            'workflowInputs': {'mappingMode': 'defineBelow', 'value': {
                'parentFolderId': '={{ $json.drive_folder_id }}',
                'namaClient': '={{ $json.client }}',
                'extra': '={{ $json }}',
            }},
        },
    },
    {
        'id': '1a2b3c4d-0001-4a1a-9a1a-000000000010', 'name': 'Uraikan File',
        'type': 'n8n-nodes-base.code', 'typeVersion': 2, 'position': [1760, 120],
        'parameters': {'jsCode': (
            "const out = [];\n"
            "for (const item of $input.all()) {\n"
            "  const g = item.json.extra || {};\n"
            "  const clientFolderId = item.json.clientFolderId;\n"
            "  if (g.rab) out.push({json: {...g, clientFolderId, fileId: g.rab.id, docType: 'RAB'}});\n"
            "  if (g.surat) out.push({json: {...g, clientFolderId, fileId: g.surat.id, docType: 'Surat'}});\n"
            "}\n"
            "return out;"
        )},
    },
    {
        'id': '1a2b3c4d-0001-4a1a-9a1a-000000000011', 'name': 'Pindahkan File ke Folder Client',
        'type': 'n8n-nodes-base.googleDrive', 'typeVersion': 3, 'position': [1980, 120],
        'onError': 'continueRegularOutput',
        'parameters': {
            'operation': 'move', 'fileId': {'__rl': True, 'mode': 'id', 'value': '={{ $json.fileId }}'},
            'driveId': {'__rl': True, 'mode': 'list', 'value': 'My Drive'},
            'folderId': {'__rl': True, 'mode': 'id', 'value': '={{ $json.clientFolderId }}'},
        },
        'credentials': copy.deepcopy(drive_credentials),
    },
    {
        'id': '1a2b3c4d-0001-4a1a-9a1a-000000000012', 'name': 'Respond Migrasi Selesai',
        'type': 'n8n-nodes-base.respondToWebhook', 'typeVersion': 1.1, 'position': [2200, 120],
        'parameters': {'respondWith': 'json', 'responseBody': '={{ $input.all().map(i => i.json) }}', 'options': {}},
    },
]

connections = {
    'Terima Migrasi Folder': {'main': [[{'node': 'Validasi & Uraikan Akun', 'type': 'main', 'index': 0}]]},
    'Validasi & Uraikan Akun': {'main': [[{'node': 'List File di Folder Akun', 'type': 'main', 'index': 0}]]},
    'List File di Folder Akun': {'main': [[{'node': 'Gabung Info Akun', 'type': 'main', 'index': 0}]]},
    'Gabung Info Akun': {'main': [[{'node': 'Kelompokkan per Client', 'type': 'main', 'index': 0}]]},
    'Kelompokkan per Client': {'main': [[{'node': 'Mode Dry-Run?', 'type': 'main', 'index': 0}]]},
    'Mode Dry-Run?': {'main': [
        [{'node': 'Respond Dry-Run', 'type': 'main', 'index': 0}],
        [{'node': 'Uraikan Grup Client', 'type': 'main', 'index': 0}],
    ]},
    'Uraikan Grup Client': {'main': [[{'node': 'Resolve Folder Client', 'type': 'main', 'index': 0}]]},
    'Resolve Folder Client': {'main': [[{'node': 'Uraikan File', 'type': 'main', 'index': 0}]]},
    'Uraikan File': {'main': [[{'node': 'Pindahkan File ke Folder Client', 'type': 'main', 'index': 0}]]},
    'Pindahkan File ke Folder Client': {'main': [[{'node': 'Respond Migrasi Selesai', 'type': 'main', 'index': 0}]]},
}

workflow = {
    'name': 'Raykerja Marketing - Migrasi Folder Client (SEMENTARA)',
    'nodes': nodes, 'connections': connections, 'settings': {'executionOrder': 'v1'},
}

create_request = urllib.request.Request(
    f'{base_url}/api/v1/workflows', data=json.dumps(workflow).encode(), headers=headers, method='POST',
)
with urllib.request.urlopen(create_request, timeout=25) as response:
    created = json.load(response)

secret_path = root / 'private' / 'migration-webhook-secret.txt'
secret_path.parent.mkdir(exist_ok=True)
secret_path.write_text(migration_secret)
secret_path.chmod(0o600)

print(json.dumps({
    'migration_workflow_id': created['id'],
    'migration_workflow_active': created.get('active'),
    'webhook_path': 'raykerja-migrate-folder-klien',
    'secret_saved_to': str(secret_path),
    'note': (
        'Workflow INACTIVE. Aktifkan manual di UI n8n dulu sebelum POST ke webhook-nya '
        '(path production butuh workflow aktif). Setelah migrasi selesai: nonaktifkan/hapus '
        'workflow ini dan hapus file secret di atas.'
    ),
}, ensure_ascii=False, indent=2))
