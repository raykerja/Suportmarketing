#!/usr/bin/env python3
"""Hapus 1 workflow n8n by id (dipakai untuk bersih-bersih workflow sementara/test)."""
import sys
import urllib.request
from pathlib import Path

workflow_id = sys.argv[1]
api_key = (Path.home() / '.n8n_raykerja_apikey_key').read_text().strip()
base_url = 'https://steelblue-stingray-633122.hostingersite.com'
headers = {'X-N8N-API-KEY': api_key}

request = urllib.request.Request(f'{base_url}/api/v1/workflows/{workflow_id}', headers=headers, method='DELETE')
with urllib.request.urlopen(request, timeout=25) as response:
    response.read()
print(f'Workflow {workflow_id} dihapus.')
