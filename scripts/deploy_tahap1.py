#!/usr/bin/env python3
"""Tahap 1: pasang jalur backup kunjungan ke Drive staf.
Dijalankan manual oleh pemilik:  ! python3 scripts/deploy_tahap1.py
Urutan: cek kolom migration -> cadangkan workflow n8n -> deploy Edge Function -> update n8n -> verifikasi.
Berhenti di langkah pertama yang gagal. Push ke GitHub dilakukan terpisah (git push origin main)."""
import json, os, subprocess, sys, urllib.request, urllib.error, uuid
from pathlib import Path

root = Path(__file__).resolve().parents[1]
home = Path.home()
REF = 'ewicmiekwzmxkkokmpzf'
WF_ID = 'm12aJ6zFGhfgCjqP'
sb_token = (home / '.supabase_suportmarket_apikey_key').read_text().strip()
n8n = json.loads((home / '.n8n_instances.json').read_text())['main']
n8n_key = (home / '.n8n_key').read_text().strip()

def call(url, headers, data=None, method=None, timeout=60):
    req = urllib.request.Request(url, data=data, method=method, headers={'User-Agent': 'curl/8', **headers})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read()
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        sys.exit(f'GAGAL HTTP {e.code} di {url.split("?")[0]}: {e.read()[:300]!r}')

def sql(query):
    return call(f'https://api.supabase.com/v1/projects/{REF}/database/query',
                {'Authorization': 'Bearer ' + sb_token, 'Content-Type': 'application/json'},
                json.dumps({'query': query}).encode(), 'POST')

print('1/5 Cek kolom backup di marketing_visits ...')
cols = {r['column_name'] for r in sql("select column_name from information_schema.columns "
        "where table_schema='public' and table_name='marketing_visits' and column_name like 'backup%'")}
need = {'backup_status', 'backup_drive_file_id', 'backup_drive_url', 'backup_at', 'backup_error'}
if cols != need:
    sys.exit(f'BERHENTI: migration belum lengkap. Ada {sorted(cols)}, perlu {sorted(need)}')
print('    OK, lima kolom ada.')

print('2/5 Cadangkan workflow n8n lama ...')
nh = {'X-N8N-API-KEY': n8n_key}
live = call(f'{n8n["url"]}/api/v1/workflows/{WF_ID}', nh)
backup = home / '.n8n_backups' / f'visit-{WF_ID}-sebelum-deploy-tahap1.json'
backup.write_text(json.dumps(live, ensure_ascii=False, indent=1)); backup.chmod(0o600)
if any(n['name'] == 'Susun Backup JSON' for n in live['nodes']):
    sys.exit('BERHENTI: workflow aktif sudah memiliki jalur backup.')
print('    Tersimpan:', backup)

print('3/5 Deploy Edge Function marketing ...')
src = (root / 'supabase/functions/marketing/index.ts').read_bytes()
b = uuid.uuid4().hex
meta = json.dumps({'name': 'marketing', 'entrypoint_path': 'index.ts', 'verify_jwt': False})
body = (f'--{b}\r\nContent-Disposition: form-data; name="metadata"\r\n\r\n{meta}\r\n'
        f'--{b}\r\nContent-Disposition: form-data; name="file"; filename="index.ts"\r\n'
        'Content-Type: application/typescript\r\n\r\n').encode() + src + f'\r\n--{b}--\r\n'.encode()
out = call(f'https://api.supabase.com/v1/projects/{REF}/functions/deploy?slug=marketing',
           {'Authorization': 'Bearer ' + sb_token, 'Content-Type': 'multipart/form-data; boundary=' + b}, body, 'POST')
print('    Versi sekarang:', out.get('version'), out.get('status'))

print('4/5 Update workflow n8n ...')
draft = json.loads((root / 'private/visit-backup-draft.json').read_text())
settings = {k: v for k, v in (draft.get('settings') or {}).items()
            if k in ('executionOrder', 'timezone', 'saveExecutionProgress', 'saveManualExecutions',
                     'saveDataErrorExecution', 'saveDataSuccessExecution', 'executionTimeout', 'errorWorkflow')}
payload = {'name': draft['name'], 'nodes': draft['nodes'], 'connections': draft['connections'], 'settings': settings}
call(f'{n8n["url"]}/api/v1/workflows/{WF_ID}', {**nh, 'Content-Type': 'application/json'},
     json.dumps(payload).encode(), 'PUT')

print('5/5 Verifikasi ...')
after = call(f'{n8n["url"]}/api/v1/workflows/{WF_ID}', nh)
ok = len(after['nodes']) == len(draft['nodes']) and any(n['name'] == 'Hasil Backup' for n in after['nodes'])
print('    Workflow aktif:', after.get('active'), '| jumlah node:', len(after['nodes']), '| jalur backup:', ok)
if not ok or not after.get('active'):
    sys.exit('PERIKSA: workflow tidak sesuai harapan. Pulihkan dari ' + str(backup))
print('SELESAI. Berikutnya: git push origin main, lalu uji "sinkron ulang" pada satu kunjungan.')
