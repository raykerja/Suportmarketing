#!/usr/bin/env python3
"""Buat workflow test SEMENTARA untuk menguji sub-workflow "Resolve Folder Client"
secara terisolasi (tanpa menyentuh counter nomor surat / template RAB-Surat asli).

Pakai: python3 scripts/prepare_resolve_folder_test_harness.py <sub_workflow_id>

Workflow yang dibuat INACTIVE. Setelah test selesai: aktifkan sebentar untuk
panggil webhook test-nya, lalu nonaktifkan/hapus + hapus folder scratch di Drive.
"""
import copy
import json
import secrets
import sys
import urllib.request
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit('Pakai: python3 scripts/prepare_resolve_folder_test_harness.py <sub_workflow_id>')
sub_workflow_id = sys.argv[1]

root = Path(__file__).resolve().parents[1]
api_key = (Path.home() / '.n8n_raykerja_apikey_key').read_text().strip()
base_url = 'https://steelblue-stingray-633122.hostingersite.com'
headers = {'X-N8N-API-KEY': api_key, 'Content-Type': 'application/json'}

test_secret = secrets.token_urlsafe(24)

offer_request = urllib.request.Request(f'{base_url}/api/v1/workflows/R7kXoTLBk8X0d4cy', headers=headers)
with urllib.request.urlopen(offer_request, timeout=25) as response:
    offer_workflow = json.load(response)
rab_copy_node = next(n for n in offer_workflow['nodes'] if n['name'] == 'Salin Template RAB')
drive_credentials = rab_copy_node.get('credentials')
assert drive_credentials, 'Node "Salin Template RAB" tidak punya credentials Google Drive; hentikan.'

nodes = [
    {
        'id': 'e2b2c0a0-0001-4b1b-9b1b-000000000001', 'name': 'Terima Test Resolve Folder',
        'type': 'n8n-nodes-base.webhook', 'typeVersion': 2, 'position': [0, 0],
        'parameters': {'httpMethod': 'POST', 'path': 'raykerja-test-resolve-folder',
                       'responseMode': 'responseNode', 'options': {}},
    },
    {
        'id': 'e2b2c0a0-0001-4b1b-9b1b-000000000002', 'name': 'Validasi Test',
        'type': 'n8n-nodes-base.code', 'typeVersion': 2, 'position': [220, 0],
        'parameters': {'jsCode': (
            "const input = $input.first().json;\n"
            "const secret = (input.headers || {})['x-ray-test-secret'];\n"
            f"if (secret !== '{test_secret}') throw new Error('Unauthorized');\n"
            "const body = input.body || {};\n"
            "return [{json: {parent_folder_id: body.parent_folder_id || '', nama_client: String(body.nama_client || '')}}];"
        )},
    },
    {
        'id': 'e2b2c0a0-0001-4b1b-9b1b-000000000003', 'name': 'Perlu Folder Scratch?',
        'type': 'n8n-nodes-base.if', 'typeVersion': 2, 'position': [440, 0],
        'parameters': {'conditions': {
            'options': {'caseSensitive': True, 'leftValue': '', 'typeValidation': 'strict'},
            'conditions': [{
                'leftValue': '={{ $json.parent_folder_id }}', 'rightValue': '',
                'operator': {'type': 'string', 'operation': 'equals'},
            }],
            'combinator': 'and',
        }, 'options': {}},
    },
    {
        'id': 'e2b2c0a0-0001-4b1b-9b1b-000000000004', 'name': 'Buat Folder Scratch',
        'type': 'n8n-nodes-base.googleDrive', 'typeVersion': 3, 'position': [660, -120],
        'onError': 'continueRegularOutput',
        'parameters': {
            'resource': 'folder', 'operation': 'create',
            'name': 'TEST - Resolve Folder Client',
            'driveId': {'__rl': True, 'mode': 'list', 'value': 'My Drive'},
            'options': {},
        },
        'credentials': copy.deepcopy(drive_credentials),
    },
    {
        'id': 'e2b2c0a0-0001-4b1b-9b1b-000000000005', 'name': 'Siapkan Input Resolve',
        'type': 'n8n-nodes-base.code', 'typeVersion': 2, 'position': [880, 0],
        'parameters': {'jsCode': (
            "const j = $input.first().json;\n"
            "const parentFolderId = j.parent_folder_id || j.id;\n"
            "if (!parentFolderId) throw new Error('Tidak ada parent_folder_id maupun folder scratch baru');\n"
            "const namaClient = $('Validasi Test').first().json.nama_client;\n"
            "return [{json: {parentFolderId, namaClient}}];"
        )},
    },
    {
        'id': 'e2b2c0a0-0001-4b1b-9b1b-000000000006', 'name': 'Resolve Folder Client',
        'type': 'n8n-nodes-base.executeWorkflow', 'typeVersion': 1.2, 'position': [1100, 0],
        'parameters': {
            'workflowId': {'__rl': True, 'mode': 'id', 'value': sub_workflow_id},
            'workflowInputs': {'mappingMode': 'defineBelow', 'value': {
                'parentFolderId': '={{ $json.parentFolderId }}',
                'namaClient': '={{ $json.namaClient }}',
            }},
        },
    },
    {
        'id': 'e2b2c0a0-0001-4b1b-9b1b-000000000007', 'name': 'Respond Test',
        'type': 'n8n-nodes-base.respondToWebhook', 'typeVersion': 1.1, 'position': [1320, 0],
        'parameters': {'respondWith': 'json', 'responseBody': '={{ $json }}', 'options': {}},
    },
]

connections = {
    'Terima Test Resolve Folder': {'main': [[{'node': 'Validasi Test', 'type': 'main', 'index': 0}]]},
    'Validasi Test': {'main': [[{'node': 'Perlu Folder Scratch?', 'type': 'main', 'index': 0}]]},
    'Perlu Folder Scratch?': {'main': [
        [{'node': 'Buat Folder Scratch', 'type': 'main', 'index': 0}],
        [{'node': 'Siapkan Input Resolve', 'type': 'main', 'index': 0}],
    ]},
    'Buat Folder Scratch': {'main': [[{'node': 'Siapkan Input Resolve', 'type': 'main', 'index': 0}]]},
    'Siapkan Input Resolve': {'main': [[{'node': 'Resolve Folder Client', 'type': 'main', 'index': 0}]]},
    'Resolve Folder Client': {'main': [[{'node': 'Respond Test', 'type': 'main', 'index': 0}]]},
}

workflow = {
    'name': 'TEST - Resolve Folder Client (SEMENTARA, hapus setelah test)',
    'nodes': nodes, 'connections': connections, 'settings': {'executionOrder': 'v1'},
}

create_request = urllib.request.Request(
    f'{base_url}/api/v1/workflows', data=json.dumps(workflow).encode(), headers=headers, method='POST',
)
with urllib.request.urlopen(create_request, timeout=25) as response:
    created = json.load(response)

secret_path = root / 'private' / 'test-resolve-folder-secret.txt'
secret_path.parent.mkdir(exist_ok=True)
secret_path.write_text(test_secret)
secret_path.chmod(0o600)

print(json.dumps({
    'test_workflow_id': created['id'],
    'test_workflow_active': created.get('active'),
    'webhook_path': 'raykerja-test-resolve-folder',
    'secret_saved_to': str(secret_path),
    'note': (
        'Workflow INACTIVE. Aktifkan manual dulu di UI n8n sebelum POST ke webhook production-nya. '
        'Panggil 2x dengan nama_client SAMA: run-1 tanpa parent_folder_id (bikin folder scratch baru, '
        'catat parent_folder_id dari respons), run-2 KIRIM parent_folder_id yang sama -> clientFolderId '
        'harus identik dengan run-1 (bukan folder baru). Setelah selesai: nonaktifkan/hapus workflow ini, '
        'hapus folder scratch di Drive, hapus file secret di atas.'
    ),
}, ensure_ascii=False, indent=2))
