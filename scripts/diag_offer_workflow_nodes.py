#!/usr/bin/env python3
"""Diagnostik read-only: bandingkan node workflow live vs yang diharapkan script migrasi."""
import json
import urllib.request
from pathlib import Path

api_key = (Path.home() / '.n8n_raykerja_apikey_key').read_text().strip()
base_url = 'https://steelblue-stingray-633122.hostingersite.com'
headers = {'X-N8N-API-KEY': api_key}

request = urllib.request.Request(f'{base_url}/api/v1/workflows/R7kXoTLBk8X0d4cy', headers=headers)
with urllib.request.urlopen(request, timeout=25) as response:
    current = json.load(response)

REQUIRED_NODES = {
    'Webhook Penawaran Web', 'Validasi Penawaran Web', 'Respons Penawaran Diterima',
    'Ambil Counter Nomor Surat', 'Siapkan Penawaran Web', 'Perbarui Counter Nomor Surat',
    'Salin Template RAB', 'Isi Data RAB', 'Pindahkan RAB ke Folder Akun', 'Salin Template Surat',
    'Isi Surat Pengantar', 'Pindahkan Surat ke Folder Akun', 'Callback Penawaran Supabase',
}

live_names = {n['name'] for n in current['nodes']}
print(json.dumps({
    'active': current.get('active'),
    'versionId': current.get('versionId'),
    'live_node_names': sorted(live_names),
    'missing_from_live': sorted(REQUIRED_NODES - live_names),
    'extra_in_live': sorted(live_names - REQUIRED_NODES),
}, ensure_ascii=False, indent=2))
