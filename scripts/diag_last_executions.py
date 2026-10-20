#!/usr/bin/env python3
"""Diagnostik read-only: tampilkan input/output node tertentu dari eksekusi terakhir suatu workflow.

Pakai: python3 scripts/diag_last_executions.py <workflow_id> [jumlah_eksekusi]
"""
import json
import sys
import urllib.request
from pathlib import Path

workflow_id = sys.argv[1]
n = int(sys.argv[2]) if len(sys.argv) > 2 else 2

api_key = (Path.home() / '.n8n_raykerja_apikey_key').read_text().strip()
base_url = 'https://steelblue-stingray-633122.hostingersite.com'
headers = {'X-N8N-API-KEY': api_key}

list_request = urllib.request.Request(
    f'{base_url}/api/v1/executions?workflowId={workflow_id}&limit={n}', headers=headers,
)
with urllib.request.urlopen(list_request, timeout=25) as response:
    executions = json.load(response)['data']

for ex in executions:
    detail_request = urllib.request.Request(
        f"{base_url}/api/v1/executions/{ex['id']}?includeData=true", headers=headers,
    )
    with urllib.request.urlopen(detail_request, timeout=25) as response:
        detail = json.load(response)
    run_data = detail.get('data', {}).get('resultData', {}).get('runData', {})
    print(f"=== execution {ex['id']} (status={ex.get('status')}) ===")
    for node_name in ('Buat Folder Client', 'Cari Folder Client', 'Siapkan Nama Escaped', 'Tetapkan Folder Client'):
        runs = run_data.get(node_name)
        if not runs:
            continue
        for run in runs:
            out = run.get('data', {}).get('main', [[]])
            print(f"--- {node_name} ---")
            print(json.dumps(out, ensure_ascii=False, indent=2)[:2000])
