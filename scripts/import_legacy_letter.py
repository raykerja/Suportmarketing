#!/usr/bin/env python3
"""Impor satu surat historis RAY AI milik Yasir. Default dry run."""
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
rows = json.loads((ROOT / 'private/legacy-surat-chat.json').read_text())
letters = [r for r in rows if r[3] == 'assistant' and r[4].strip()]
assert len(letters) == 1, 'Jumlah surat historis berubah; tinjau manual.'
letter = letters[0]
print(f'Validasi: {len(letters)} draft surat historis, {len(letter[4])} karakter.')
if '--apply' not in sys.argv:
    print('DRY RUN: tidak menulis ke Supabase.')
    raise SystemExit(0)

token = (Path.home() / '.supabase_suportmarket_apikey_key').read_text().strip()
endpoint = 'https://api.supabase.com/v1/projects/ewicmiekwzmxkkokmpzf/database/query'

def query(sql):
    request = urllib.request.Request(endpoint, data=json.dumps({'query': sql}).encode(), method='POST',
                                     headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=25) as result:
        return json.load(result)

def q(value):
    return "'" + str(value).replace("'", "''") + "'"

users = query("select id from auth.users where email = 'yasir@raykerja.cloud';")
assert len(users) == 1, 'Akun yasir@raykerja.cloud belum tersedia atau tidak unik.'
owner = users[0]['id']
sql = ('insert into public.marketing_letters (owner_id,legacy_source,recipient,subject,body) values ('
       + q(owner) + '::uuid,' + q(f'ray-ai-conversation-{letter[0]}') + ','
       + q('Arsip RAY AI') + ',' + q(letter[1]) + ',' + q(letter[4])
       + ') on conflict (legacy_source) do nothing;')
query(sql)
print('Satu surat historis diproses. Verifikasi row legacy_source pada database.')
