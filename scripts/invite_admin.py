#!/usr/bin/env python3
"""Kirim undangan Supabase Auth ke Yasir. Default dry run."""
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

email = 'yasir@raykerja.cloud'
ref = 'ewicmiekwzmxkkokmpzf'
print('Undangan akun:', email)
if '--apply' not in sys.argv:
    print('DRY RUN: tidak membuat user atau mengirim email.')
    raise SystemExit(0)

token = (Path.home() / '.supabase_suportmarket_apikey_key').read_text().strip()
headers = {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}
query_endpoint = f'https://api.supabase.com/v1/projects/{ref}/database/query'
query = json.dumps({'query': "select id from auth.users where email = 'yasir@raykerja.cloud';", 'read_only': True}).encode()
with urllib.request.urlopen(urllib.request.Request(query_endpoint, data=query, method='POST', headers=headers), timeout=25) as result:
    users = json.load(result)
if users:
    print('Akun Auth sudah ada; undangan tidak dikirim ulang.')
    raise SystemExit(0)

key_request = urllib.request.Request(f'https://api.supabase.com/v1/projects/{ref}/api-keys', headers=headers)
with urllib.request.urlopen(key_request, timeout=20) as result:
    keys = json.load(result)
service_key = next(item['api_key'] for item in keys if item.get('name') == 'service_role')
endpoint = (f'https://{ref}.supabase.co/auth/v1/invite?redirect_to='
            + urllib.parse.quote('https://marketing.raykerja.cloud', safe=''))
request = urllib.request.Request(endpoint, data=json.dumps({'email': email}).encode(), method='POST',
                                 headers={'apikey': service_key, 'Authorization': 'Bearer ' + service_key,
                                          'Content-Type': 'application/json'})
with urllib.request.urlopen(request, timeout=30) as result:
    invited = json.load(result)
assert invited.get('email') == email, 'Respons undangan tidak sesuai.'
print('PASS: User dibuat dan undangan diminta untuk dikirim. Periksa email penerima.')
