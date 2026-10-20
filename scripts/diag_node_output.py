#!/usr/bin/env python3
"""Diagnostik read-only: cetak output lengkap 1 node dari 1 eksekusi (semua item)."""
import json
import sys
import urllib.request
from pathlib import Path

workflow_id = sys.argv[1]
node_name = sys.argv[2]

api_key = (Path.home() / '.n8n_raykerja_apikey_key').read_text().strip()
base_url = 'https://steelblue-stingray-633122.hostingersite.com'
headers = {'X-N8N-API-KEY': api_key}

list_request = urllib.request.Request(f'{base_url}/api/v1/executions?workflowId={workflow_id}&limit=1', headers=headers)
with urllib.request.urlopen(list_request, timeout=25) as response:
    execution_id = json.load(response)['data'][0]['id']

detail_request = urllib.request.Request(f'{base_url}/api/v1/executions/{execution_id}?includeData=true', headers=headers)
with urllib.request.urlopen(detail_request, timeout=25) as response:
    detail = json.load(response)

run_data = detail.get('data', {}).get('resultData', {}).get('runData', {})
runs = run_data.get(node_name, [])
for run in runs:
    main = run.get('data', {}).get('main', [[]])
    for branch_i, branch in enumerate(main):
        print(f'--- branch {branch_i}, {len(branch)} item(s) ---')
        print(json.dumps([b.get('json') for b in branch], ensure_ascii=False, indent=2))
