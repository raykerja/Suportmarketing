#!/usr/bin/env python3
"""Set URL dan tutup signup publik pada proyek Raykerja. Default dry run."""
import json
import sys
import urllib.request
from pathlib import Path

token = (Path.home() / '.supabase_suportmarket_apikey_key').read_text().strip()
endpoint = 'https://api.supabase.com/v1/projects/ewicmiekwzmxkkokmpzf/config/auth'
headers = {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}
with urllib.request.urlopen(urllib.request.Request(endpoint, headers=headers), timeout=20) as result:
    current = json.load(result)
print('Sebelum:', {k: current.get(k) for k in ('site_url', 'uri_allow_list', 'disable_signup')})
changes = {'site_url': 'https://marketing.raykerja.cloud',
           'uri_allow_list': 'https://marketing.raykerja.cloud',
           'disable_signup': True}
print('Rencana:', changes)
if '--apply' not in sys.argv:
    print('DRY RUN: tidak mengubah konfigurasi Auth.')
    raise SystemExit(0)
assert current.get('site_url') in ('http://localhost:3000', 'https://marketing.raykerja.cloud'), 'Site URL berubah; tinjau manual.'
assert current.get('uri_allow_list') in ('', changes['uri_allow_list']), 'Redirect list berubah; tinjau manual.'
request = urllib.request.Request(endpoint, data=json.dumps(changes).encode(), method='PATCH', headers=headers)
with urllib.request.urlopen(request, timeout=25) as result:
    result.read()
with urllib.request.urlopen(urllib.request.Request(endpoint, headers=headers), timeout=20) as result:
    after = json.load(result)
assert all(after.get(k) == v for k, v in changes.items()), 'Konfigurasi belum terverifikasi.'
print('PASS: Konfigurasi Auth terverifikasi.')
