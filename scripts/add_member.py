#!/usr/bin/env python3
"""Tambahkan user Auth yang sudah ada ke daftar Marketing; default dry run."""
import json
import sys
import urllib.request
from pathlib import Path

email = 'yasir@raykerja.cloud'
print('Akun Marketing pertama:', email)
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

users = query("select id from auth.users where email = 'yasir@raykerja.cloud';")
assert len(users) == 1, 'Akun Auth belum tersedia atau tidak unik.'
user_id = users[0]['id']
query(f"insert into public.marketing_members (user_id) values ('{user_id}'::uuid) on conflict (user_id) do nothing;")
print('Keanggotaan diproses. Verifikasi akses RLS sebelum membuka situs.')
