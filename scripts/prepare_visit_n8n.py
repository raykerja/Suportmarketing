#!/usr/bin/env python3
"""Siapkan workflow kunjungan. Draft berisi credential dan secret; simpan hanya di private/."""
import copy
import json
import re
import urllib.request
import uuid
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = json.loads((root / 'private/raykerja-n8n-draft.json').read_text())
def get(name):
    return copy.deepcopy(next(n for n in source['nodes'] if n['name'] == name))
def node(name, node_type, version, x, y, params, **extra):
    return dict(id=str(uuid.uuid4()), name=name, type=node_type, typeVersion=version,
                position=[x, y], parameters=params, **extra)
def edge(target):
    return {'main': [[{'node': target, 'type': 'main', 'index': 0}]]}

validate_source = get('Siapkan Data Target (RAY AI)')
secret_match = re.search(r'secret !== "([^"]+)"', validate_source['parameters']['jsCode'])
assert secret_match, 'Secret webhook sumber tidak ditemukan'
secret = secret_match.group(1)
webhook = get('Webhook RAY AI Target')
webhook.update(id=str(uuid.uuid4()), name='Webhook Kunjungan Raykerja', position=[0, 0])
webhook['parameters']['path'] = 'raykerja-visit'
validate = node('Validasi Kunjungan', 'n8n-nodes-base.code', 2, 220, 0, {
    'jsCode': """const input = $input.first().json;
if ((input.headers || {})['x-ray-secret'] !== SECRET_VALUE) throw new Error('Unauthorized');
const b = input.body || {};
if (!/^[0-9a-f-]{36}$/i.test(String(b.visit_id || '')) || !b.visit ||
    (b.photo_url && !/^https:\\/\\/ewicmiekwzmxkkokmpzf\\.supabase\\.co\\//.test(String(b.photo_url))) ||
    (b.drive_folder_id && !/^[A-Za-z0-9_-]{10,200}$/.test(String(b.drive_folder_id))))
  throw new Error('Data laporan tidak valid');
return [{json:{visit_id:String(b.visit_id), visit:b.visit, email:String(b.email || ''),
  photo_url:b.photo_url || null, photo_drive_file_id:b.photo_drive_file_id || null,
  drive_folder_id:b.drive_folder_id || null}}];
""".replace('SECRET_VALUE', json.dumps(secret))})
ack = get('Respond Diterima ke RAY AI')
ack.update(id=str(uuid.uuid4()), name='Respons Kunjungan Diterima', position=[440, 0])
ack['parameters']['responseBody'] = '={{ {"ok": true, "status": "processing", "visit_id": $json.visit_id} }}'
condition = get('If Target (RAY AI)')
condition.update(id=str(uuid.uuid4()), name='Ada Foto Baru?', position=[660, 0])
condition['parameters']['conditions']['conditions'][0]['leftValue'] = '={{ !!$json.photo_url }}'
download = node('Unduh Foto Supabase', 'n8n-nodes-base.httpRequest', 4.2, 880, -100,
    {'method': 'GET', 'url': "={{ $('Validasi Kunjungan').first().json.photo_url }}",
     'options': {'response': {'response': {'responseFormat': 'file', 'outputPropertyName': 'data'}}, 'timeout': 30000}},
    onError='continueRegularOutput')
drive = get('Simpan Riset ke Drive Akun')
drive.update(id=str(uuid.uuid4()), name='Unggah Foto ke Drive Akun', position=[1100, -100])
drive['parameters'] = {'operation': 'upload', 'inputDataFieldName': 'data',
    'name': "={{ 'Kunjungan_' + $('Validasi Kunjungan').first().json.visit_id + '.' + ($binary.data?.fileExtension || 'jpg') }}",
    'driveId': {'__rl': True, 'value': 'My Drive', 'mode': 'list', 'cachedResultName': 'My Drive'},
    'folderId': {'__rl': True, 'value': "={{ $('Validasi Kunjungan').first().json.drive_folder_id }}", 'mode': 'id'},
    'options': {}}
drive['onError'] = 'continueRegularOutput'
prepare = node('Susun Baris Sheet', 'n8n-nodes-base.code', 2, 1320, 0, {'jsCode': """const base = $('Validasi Kunjungan').first().json;
const photoId = $json.id || base.photo_drive_file_id || null;
const photoUrl = photoId ? `https://drive.google.com/file/d/${photoId}/view` : '';
const v = base.visit;
const safe = (x) => { const s = String(x ?? '').trim(); return /^[=+@]/.test(s) ? "'" + s : s; };
const date = (x) => /^\\d{4}-\\d{2}-\\d{2}$/.test(String(x || '')) ? String(x).split('-').reverse().join('/') : '';
const fields = ['area','nama_perusahaan','kategori','nomor_kontak_perusahaan','alamat','tanggal_input',
  'tanggal_janji_kunjungan','jabatan_pic','nama_pejabat_pic_1','nama_pejabat_pic_2',
  'nomor_kontak_pic','foto_kunjungan','tanggal_realisasi_kunjungan','respon','tanggal_follow_up',
  'catatan','titik_lokasi_laporan','koordinat_target','tanggal_follow_up_aktual',
  'catatan_hasil_follow_up','nama_marketing','plotting_area','informasi_penting',
  'tenaga_kerja_saat_ini','bagian_kerja_outsourcing','jumlah_calon_tenaga_kerja',
  'petugas_telemarketing','status_telemarketing','tanggal_menghubungi','catatan_telemarketing',
  'tahap_terkini','tanggal_aktivitas_terakhir','catatan_progres_terakhir','link_file_progres'];
const dates = new Set(['tanggal_input','tanggal_janji_kunjungan','tanggal_realisasi_kunjungan',
  'tanggal_follow_up','tanggal_follow_up_aktual','tanggal_menghubungi','tanggal_aktivitas_terakhir']);
const sheet = {};
for (const key of fields) sheet[key] = key === 'foto_kunjungan' ? photoUrl : dates.has(key) ? date(v[key]) : safe(v[key]);
sheet.visit_stage = safe(v.visit_stage === 'initial' ? 'Tahap 1' : 'Lengkap');
sheet.waktu_realisasi_kunjungan = v.waktu_realisasi_kunjungan && !isNaN(Date.parse(v.waktu_realisasi_kunjungan))
  ? new Intl.DateTimeFormat('id-ID', {timeZone:'Asia/Jakarta', day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(v.waktu_realisasi_kunjungan)) : '';
sheet.status_marketing = safe(v.status_marketing);
return [{json:{visit_id:base.visit_id, photo_drive_file_id:photoId,
  photo_expected:!!base.photo_url, sheet, email:base.email}}];
"""})

config = json.loads((Path.home() / '.n8n_instances.json').read_text())['main']
api_key = Path(config['keys']['read'].replace('~', str(Path.home()))).read_text().strip()
req = urllib.request.Request(config['url'].rstrip('/') + '/api/v1/workflows/NJayC4edLgwMFzUX',
                         headers={'X-N8N-API-KEY': api_key})
reference = json.load(urllib.request.urlopen(req, timeout=20))
sheets_credential = next(n['credentials'] for n in reference['nodes'] if n['type'] == 'n8n-nodes-base.googleSheets')
headers = ['AREA','  NAMA PERUSAHAAN','KATEGORI','NOMOR KONTAK PERUSAHAAN','ALAMAT','TANGGAL INPUT',
    'TANGGAL JANJI KUNJUNGAN','JABATAN PIC','NAMA PEJABAT PIC 1','NAMA PEJABAT PIC 2','NOMOR KONTAK PIC',
    'FOTO KUNJUNGAN','TANGGAL REALISASI KUNJUNGAN','RESPON','TANGGAL FOLLOW UP','CATATAN',
    'TITIK LOKASI LAPORAN','KOORDINAT TARGET','TANGGAL FOLLOW UP AKTUAL','CATATAN HASIL FOLLOW UP',
    ' NAMA MARKETING','PLOTTING AREA','INFORMASI PENTING','TENAGA KERJA SAAT INI',
    'BAGIAN KERJA OUTSOURCING','JUMLAH CALON TENAGA KERJA','PETUGAS TELEMARKETING',
    'STATUS TELEMARKETING','TANGGAL MENGHUBUNGI','CATATAN TELEMARKETING','ID LAPORAN','EMAIL MARKETING',
    'TAHAP TERKINI','TANGGAL AKTIVITAS TERAKHIR','CATATAN PROGRES TERAKHIR','LINK FILE PROGRES',
    'TAHAP PENGISIAN','WAKTU REALISASI','STATUS MARKETING']
keys = ['area','nama_perusahaan','kategori','nomor_kontak_perusahaan','alamat','tanggal_input',
    'tanggal_janji_kunjungan','jabatan_pic','nama_pejabat_pic_1','nama_pejabat_pic_2','nomor_kontak_pic',
    'foto_kunjungan','tanggal_realisasi_kunjungan','respon','tanggal_follow_up','catatan',
    'titik_lokasi_laporan','koordinat_target','tanggal_follow_up_aktual','catatan_hasil_follow_up',
    'nama_marketing','plotting_area','informasi_penting','tenaga_kerja_saat_ini',
    'bagian_kerja_outsourcing','jumlah_calon_tenaga_kerja','petugas_telemarketing',
    'status_telemarketing','tanggal_menghubungi','catatan_telemarketing']
mapping = {header: '={{ $json.sheet.' + key + ' }}' for header, key in zip(headers, keys)}
mapping.update({'ID LAPORAN': '={{ $json.visit_id }}', 'EMAIL MARKETING': '={{ $json.email }}',
    'TAHAP TERKINI': '={{ $json.sheet.tahap_terkini }}',
    'TANGGAL AKTIVITAS TERAKHIR': '={{ $json.sheet.tanggal_aktivitas_terakhir }}',
    'CATATAN PROGRES TERAKHIR': '={{ $json.sheet.catatan_progres_terakhir }}',
    'LINK FILE PROGRES': '={{ $json.sheet.link_file_progres }}',
    'TAHAP PENGISIAN': '={{ $json.sheet.visit_stage }}',
    'WAKTU REALISASI': '={{ $json.sheet.waktu_realisasi_kunjungan }}',
    'STATUS MARKETING': '={{ $json.sheet.status_marketing }}'})
schema = [{'id': h, 'displayName': h, 'required': False, 'defaultMatch': False, 'display': True,
           'type': 'string', 'canBeUsedToMatch': True} for h in headers]
sheets = node('Sinkron DataMarketing', 'n8n-nodes-base.googleSheets', 4.7, 1540, 0, {
    'operation': 'appendOrUpdate',
    'documentId': {'__rl': True, 'value': '1QanZaDjm5s48E0MGnuq9Hwkp9z0rvfgSvndRIakog1I', 'mode': 'id'},
    'sheetName': {'__rl': True, 'value': 'DataMarketing', 'mode': 'name'},
    'columns': {'mappingMode': 'defineBelow', 'value': mapping, 'matchingColumns': ['ID LAPORAN'],
                'schema': schema, 'attemptToConvertTypes': False, 'convertFieldsToString': True},
    'options': {'cellFormat': 'USER_ENTERED'}}, credentials=sheets_credential,
    onError='continueRegularOutput')
callback = get('Respond Target ke RAY AI')
callback.update(id=str(uuid.uuid4()), name='Callback Kunjungan Supabase', position=[1760, 0])
callback['parameters']['jsonBody'] = "={{ {kind:'visit', visit_id:$('Validasi Kunjungan').first().json.visit_id, ok:$json['ID LAPORAN']===$('Validasi Kunjungan').first().json.visit_id && (!$('Susun Baris Sheet').first().json.photo_expected || !!$('Susun Baris Sheet').first().json.photo_drive_file_id), sheet_row:$json.row_number || null, photo_drive_file_id:$('Susun Baris Sheet').first().json.photo_drive_file_id, error:$json.error?.message || ($json['ID LAPORAN'] ? 'Foto gagal disimpan di Drive' : 'Sheet tidak mengembalikan ID laporan')} }}"
nodes = [webhook, validate, ack, condition, download, drive, prepare, sheets, callback]
connections = {webhook['name']: edge(validate['name']), validate['name']: edge(ack['name']),
    ack['name']: edge(condition['name']),
    condition['name']: {'main': [[{'node': download['name'], 'type': 'main', 'index': 0}],
                                  [{'node': prepare['name'], 'type': 'main', 'index': 0}]]},
    download['name']: edge(drive['name']), drive['name']: edge(prepare['name']),
    prepare['name']: edge(sheets['name']), sheets['name']: edge(callback['name'])}
workflow = {'name': 'Raykerja Marketing - Kunjungan ke DataMarketing', 'nodes': nodes,
            'connections': connections, 'settings': source['settings']}
output = root / 'private/raykerja-visit-n8n-draft.json'
output.write_text(json.dumps(workflow, ensure_ascii=False, indent=2))
output.chmod(0o600)
print(json.dumps({'nodes': len(nodes), 'webhook_path': 'raykerja-visit', 'contains_credentials': True,
                  'draft': str(output)}, indent=2))
