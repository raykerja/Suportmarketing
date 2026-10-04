#!/usr/bin/env python3
"""Siapkan workflow surat privat memakai credential dan secret dari workflow sumber."""
import copy
import json
import re
import uuid
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = json.loads((root / 'private/raykerja-n8n-draft.json').read_text())
get = lambda name: copy.deepcopy(next(n for n in source['nodes'] if n['name'] == name))
webhook = get('Webhook RAY AI Target')
webhook.update(id=str(uuid.uuid4()), name='Webhook Surat Raykerja', position=[0, 0])
webhook['parameters']['path'] = 'raykerja-letter'
prepare = get('Siapkan Data Target (RAY AI)')
match = re.search(r"secret !== \"([^\"]+)\"", prepare['parameters']['jsCode'])
assert match, 'Secret workflow sumber tidak ditemukan.'
prepare.update(id=str(uuid.uuid4()), name='Validasi Surat', position=[220, 0])
prepare['parameters']['jsCode'] = """const input = $input.first().json;
const secret = (input.headers || {})['x-ray-secret'];
if (secret !== SECRET_VALUE) throw new Error('Unauthorized');
const b = input.body || {};
if (!/^[0-9a-f-]{36}$/i.test(String(b.letter_id || '')) ||
    !/^[A-Za-z0-9_-]{10,200}$/.test(String(b.drive_folder_id || '')) ||
    !String(b.body || '').trim()) throw new Error('Surat atau folder tidak valid');
return [{json:{letter_id:String(b.letter_id), drive_folder_id:String(b.drive_folder_id),
  subject:String(b.subject || ''), recipient:String(b.recipient || ''), body:String(b.body)}}];
""".replace('SECRET_VALUE', json.dumps(match.group(1)))
ack = get('Respond Diterima ke RAY AI')
ack.update(id=str(uuid.uuid4()), name='Respons Surat Diterima', position=[440, 0])
ack['parameters']['responseBody'] = '={{ {"ok": true, "status": "processing", "letter_id": $json.letter_id} }}'
drive = copy.deepcopy(next(n for n in source['nodes'] if n['name'] == 'Simpan Riset ke Drive Akun'))
drive.update(id=str(uuid.uuid4()), name='Simpan Surat ke Drive Akun', position=[660, 0])
drive['parameters']['content'] = "={{ 'SURAT PENAWARAN\\n\\nPerihal: ' + $('Validasi Surat').first().json.subject + '\\nPenerima: ' + $('Validasi Surat').first().json.recipient + '\\n\\n' + $('Validasi Surat').first().json.body }}"
drive['parameters']['name'] = "={{ 'Surat_Penawaran_' + $json.letter_id + '.txt' }}"
drive['parameters']['folderId']['value'] = "={{ $('Validasi Surat').first().json.drive_folder_id }}"
callback = get('Respond Target ke RAY AI')
callback.update(id=str(uuid.uuid4()), name='Callback Surat Supabase', position=[880, 0])
callback['parameters']['jsonBody'] = "={{ {kind:'letter', letter_id:$('Validasi Surat').first().json.letter_id, drive_status:$json.id ? 'done' : 'error', drive_file_id:$json.id || null, drive_error:$json.error?.message || ($json.id ? null : 'Unggah Google Drive tidak menghasilkan file ID')} }}"
nodes = [webhook, prepare, ack, drive, callback]
def edge(target):
    return {'main': [[{'node': target, 'type': 'main', 'index': 0}]]}
workflow = {'name': 'Raykerja Marketing - Surat ke Drive', 'nodes': nodes,
            'connections': {webhook['name']: edge(prepare['name']), prepare['name']: edge(ack['name']),
                            ack['name']: edge(drive['name']), drive['name']: edge(callback['name'])},
            'settings': source['settings']}
output = root / 'private/raykerja-letter-n8n-draft.json'
output.write_text(json.dumps(workflow, ensure_ascii=False, indent=2))
output.chmod(0o600)
print(json.dumps({'nodes': len(nodes), 'webhook_path': 'raykerja-letter', 'draft': str(output),
                  'contains_credentials': True}, indent=2))
