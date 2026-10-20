#!/usr/bin/env python3
"""Diagnostik read-only: cetak definisi lengkap 1 node dari workflow tertentu."""
import json
import sys
import urllib.request
from pathlib import Path

workflow_id = sys.argv[1]
node_name = sys.argv[2]

api_key = (Path.home() / '.n8n_raykerja_apikey_key').read_text().strip()
base_url = 'https://steelblue-stingray-633122.hostingersite.com'
headers = {'X-N8N-API-KEY': api_key}

request = urllib.request.Request(f'{base_url}/api/v1/workflows/{workflow_id}', headers=headers)
with urllib.request.urlopen(request, timeout=25) as response:
    current = json.load(response)

node = next(n for n in current['nodes'] if n['name'] == node_name)
print(json.dumps(node, ensure_ascii=False, indent=2))
