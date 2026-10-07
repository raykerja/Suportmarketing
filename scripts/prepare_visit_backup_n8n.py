#!/usr/bin/env python3
"""Tambahkan jalur cadangan JSON ke folder Drive staf pada workflow kunjungan.
Membaca private/live-visit.json (hasil GET workflow aktif), menulis
private/visit-backup-draft.json (berisi secret, jangan di-commit) dan
n8n/visit-to-sheet.template.json (placeholder). Tidak menyentuh n8n."""
import copy, json, re, uuid
from pathlib import Path

root = Path(__file__).resolve().parents[1]
live = json.loads((root / 'private/live-visit.json').read_text())
wf = {k: copy.deepcopy(live[k]) for k in ('name', 'nodes', 'connections', 'settings')}
names = {n['name'] for n in wf['nodes']}
assert 'Susun Backup JSON' not in names, 'Jalur cadangan sudah ada'
drive_cred = next(n['credentials'] for n in wf['nodes'] if n['type'] == 'n8n-nodes-base.googleDrive')
VAL = "$('Validasi Kunjungan').first().json"

def node(name, typ, ver, x, y, params, **extra):
    return dict(id=str(uuid.uuid4()), name=name, type=typ, typeVersion=ver, position=[x, y], parameters=params, **extra)
def edge(*targets):
    return {'main': [[{'node': t, 'type': 'main', 'index': 0}] for t in targets]}
def cond(left, right):
    return {'conditions': {'options': {'caseSensitive': True, 'leftValue': '', 'typeValidation': 'strict', 'version': 2},
            'conditions': [{'id': str(uuid.uuid4()), 'leftValue': left, 'rightValue': right,
                            'operator': {'type': 'string', 'operation': 'equals'}}], 'combinator': 'and'}, 'options': {}}

build = node('Susun Backup JSON', 'n8n-nodes-base.code', 2, 1760, 0, {'jsCode': """const base = $('Validasi Kunjungan').first().json;
const sheet = $input.first().json;
const photoId = $('Susun Baris Sheet').first().json.photo_drive_file_id || null;
const existing = base.backup_drive_file_id && /^[A-Za-z0-9_-]{10,200}$/.test(base.backup_drive_file_id) ? base.backup_drive_file_id : null;
if (!base.drive_folder_id && !existing) return [{json: {mode: 'skip', visit_id: base.visit_id}}];
const body = {backup_versi: 1, id_laporan: base.visit_id, email_marketing: base.email,
  dicadangkan_pada: new Date().toISOString(), baris_sheet: sheet.row_number || null,
  foto_drive_url: photoId ? `https://drive.google.com/file/d/${photoId}/view` : null, data_kunjungan: base.visit};
const binary = await this.helpers.prepareBinaryData(Buffer.from(JSON.stringify(body, null, 2), 'utf8'),
  `Backup_Kunjungan_${base.visit_id}.json`, 'application/json');
return [{json: {mode: existing ? 'update' : 'create', visit_id: base.visit_id, file_id: existing}, binary: {data: binary}}];
"""})
is_skip = node('Lewati Backup?', 'n8n-nodes-base.if', 2.2, 1980, 0, cond('={{ $json.mode }}', 'skip'))
is_update = node('Backup Sudah Ada?', 'n8n-nodes-base.if', 2.2, 2200, 100, cond('={{ $json.mode }}', 'update'))
update = node('Perbarui Backup di Drive', 'n8n-nodes-base.httpRequest', 4.2, 2420, 0, {
    'method': 'PATCH', 'url': "={{ 'https://www.googleapis.com/upload/drive/v3/files/' + $json.file_id + '?uploadType=media&supportsAllDrives=true&fields=id' }}",
    'authentication': 'predefinedCredentialType', 'nodeCredentialType': 'googleDriveOAuth2Api',
    'sendBody': True, 'contentType': 'binaryData', 'inputDataFieldName': 'data', 'options': {'timeout': 30000}},
    credentials={'googleDriveOAuth2Api': drive_cred['googleDriveOAuth2Api']}, onError='continueRegularOutput')
create = node('Unggah Backup ke Drive Akun', 'n8n-nodes-base.googleDrive', 3, 2420, 200, {
    'operation': 'upload', 'inputDataFieldName': 'data',
    'name': "={{ 'Backup_Kunjungan_' + $json.visit_id + '.json' }}",
    'driveId': {'__rl': True, 'value': 'My Drive', 'mode': 'list', 'cachedResultName': 'My Drive'},
    'folderId': {'__rl': True, 'value': "={{ " + VAL + ".drive_folder_id }}", 'mode': 'id'}, 'options': {}},
    credentials={'googleDriveOAuth2Api': drive_cred['googleDriveOAuth2Api']}, onError='continueRegularOutput')
result = node('Hasil Backup', 'n8n-nodes-base.code', 2, 2640, 100, {'jsCode': """const plan = $('Susun Backup JSON').first().json;
if (plan.mode === 'skip') return [{json: {backup_status: 'skipped', backup_drive_file_id: null, backup_error: null}}];
const fileId = $json.id || null;
return [{json: fileId ? {backup_status: 'done', backup_drive_file_id: fileId, backup_error: null}
  : {backup_status: 'error', backup_drive_file_id: plan.file_id || null,
     backup_error: String($json.error?.message || 'Cadangan ke Drive gagal').slice(0, 250)}}];
"""})

by = {n['name']: n for n in wf['nodes']}
cb = by['Callback Kunjungan Supabase']
cb['position'] = [2860, 0]
S = "$('Sinkron DataMarketing').first().json"
cb['parameters']['jsonBody'] = ("={{ {kind:'visit', visit_id:" + VAL + ".visit_id, ok:" + S + "['ID LAPORAN']===" + VAL +
    ".visit_id && (!$('Susun Baris Sheet').first().json.photo_expected || !!$('Susun Baris Sheet').first().json.photo_drive_file_id), "
    "sheet_row:" + S + ".row_number || null, photo_drive_file_id:$('Susun Baris Sheet').first().json.photo_drive_file_id, "
    "error:" + S + ".error?.message || (" + S + "['ID LAPORAN'] ? 'Foto gagal disimpan di Drive' : 'Sheet tidak mengembalikan ID laporan'), "
    "backup_status:$json.backup_status, backup_drive_file_id:$json.backup_drive_file_id, backup_error:$json.backup_error} }}")
v = by['Validasi Kunjungan']
v['parameters']['jsCode'] = v['parameters']['jsCode'].replace(
    "drive_folder_id:b.drive_folder_id || null}",
    "drive_folder_id:b.drive_folder_id || null,\n  backup_drive_file_id:b.backup_drive_file_id || null}")
assert 'backup_drive_file_id' in v['parameters']['jsCode']
wf['nodes'] += [build, is_skip, is_update, update, create, result]
c = wf['connections']
c['Sinkron DataMarketing'] = edge(build['name'])
c[build['name']] = edge(is_skip['name'])
c[is_skip['name']] = {'main': [[{'node': result['name'], 'type': 'main', 'index': 0}], [{'node': is_update['name'], 'type': 'main', 'index': 0}]]}
c[is_update['name']] = {'main': [[{'node': update['name'], 'type': 'main', 'index': 0}], [{'node': create['name'], 'type': 'main', 'index': 0}]]}
c[update['name']] = edge(result['name'])
c[create['name']] = edge(result['name'])
c[result['name']] = edge(cb['name'])
(root / 'private/visit-backup-draft.json').write_text(json.dumps(wf, ensure_ascii=False, indent=2))

# Template portabel
tpl = copy.deepcopy(wf)
text_secret = set()
for n in tpl['nodes']:
    n.pop('credentials', None); n.pop('webhookId', None)
    for h in n['parameters'].get('headerParameters', {}).get('parameters', []):
        if h['name'].lower() == 'x-ray-secret': text_secret.add(h['value'])
    m = re.search(r'secret\s*!==\s*"([^"]+)"', n['parameters'].get('jsCode', ''))
    if m: text_secret.add(m.group(1))
    if n['type'] == 'n8n-nodes-base.googleSheets':
        n['parameters']['documentId'] = {'__rl': True, 'value': 'SET_SPREADSHEET_ID', 'mode': 'id'}
assert len(text_secret) == 1
t = json.dumps(tpl, ensure_ascii=False, indent=2).replace(text_secret.pop(), 'SET_MARKETING_WEBHOOK_SECRET')
(root / 'n8n/visit-to-sheet.template.json').write_text(t + '\n')
print('nodes', len(wf['nodes']))
