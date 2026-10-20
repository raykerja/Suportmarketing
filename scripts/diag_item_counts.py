#!/usr/bin/env python3
"""Diagnostik read-only: cetak jumlah item yang keluar dari SETIAP node pada 1 eksekusi.

Pakai: python3 scripts/diag_item_counts.py <workflow_id> [execution_id]
Tanpa execution_id, pakai eksekusi terakhir.
"""
import json
import sys
import urllib.request
from pathlib import Path

workflow_id = sys.argv[1]
api_key = (Path.home() / '.n8n_raykerja_apikey_key').read_text().strip()
base_url = 'https://steelblue-stingray-633122.hostingersite.com'
headers = {'X-N8N-API-KEY': api_key}

if len(sys.argv) > 2:
    execution_id = sys.argv[2]
else:
    list_request = urllib.request.Request(
        f'{base_url}/api/v1/executions?workflowId={workflow_id}&limit=1', headers=headers,
    )
    with urllib.request.urlopen(list_request, timeout=25) as response:
        execution_id = json.load(response)['data'][0]['id']

detail_request = urllib.request.Request(f'{base_url}/api/v1/executions/{execution_id}?includeData=true', headers=headers)
with urllib.request.urlopen(detail_request, timeout=25) as response:
    detail = json.load(response)

run_data = detail.get('data', {}).get('resultData', {}).get('runData', {})
print(f'execution {execution_id}:')
for node_name, runs in run_data.items():
    for i, run in enumerate(runs):
        main = run.get('data', {}).get('main', [[]])
        counts = [len(branch) if branch else 0 for branch in main]
        error = run.get('error')
        print(f'  {node_name} (run {i}): item counts per output branch = {counts}' + (f'  ERROR: {json.dumps(error)[:300]}' if error else ''))
