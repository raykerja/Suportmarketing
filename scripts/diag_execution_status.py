#!/usr/bin/env python3
"""Diagnostik read-only: status eksekusi terakhir sebuah workflow (running/success/error)."""
import json
import sys
import urllib.request
from pathlib import Path

workflow_id = sys.argv[1]
limit = sys.argv[2] if len(sys.argv) > 2 else '3'

api_key = (Path.home() / '.n8n_raykerja_apikey_key').read_text().strip()
base_url = 'https://steelblue-stingray-633122.hostingersite.com'
headers = {'X-N8N-API-KEY': api_key}

request = urllib.request.Request(f'{base_url}/api/v1/executions?workflowId={workflow_id}&limit={limit}', headers=headers)
with urllib.request.urlopen(request, timeout=25) as response:
    data = json.load(response)['data']

for ex in data:
    print(json.dumps({
        'id': ex.get('id'), 'status': ex.get('status'), 'finished': ex.get('finished'),
        'startedAt': ex.get('startedAt'), 'stoppedAt': ex.get('stoppedAt'),
    }, ensure_ascii=False))
