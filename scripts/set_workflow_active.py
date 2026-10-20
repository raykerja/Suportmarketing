#!/usr/bin/env python3
"""Aktifkan/nonaktifkan 1 workflow n8n by id. Pakai: python3 scripts/set_workflow_active.py <id> <true|false>"""
import sys
import urllib.request
from pathlib import Path

workflow_id = sys.argv[1]
active = sys.argv[2].lower() == 'true'
api_key = (Path.home() / '.n8n_raykerja_apikey_key').read_text().strip()
base_url = 'https://steelblue-stingray-633122.hostingersite.com'
headers = {'X-N8N-API-KEY': api_key, 'Content-Type': 'application/json'}

path = 'activate' if active else 'deactivate'
request = urllib.request.Request(f'{base_url}/api/v1/workflows/{workflow_id}/{path}', data=b'{}', headers=headers, method='POST')
with urllib.request.urlopen(request, timeout=25) as response:
    result = response.read()
print(f'Workflow {workflow_id} -> active={active}')
