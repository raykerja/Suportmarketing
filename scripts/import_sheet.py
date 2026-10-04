#!/usr/bin/env python3
"""Validasi atau impor ekspor Sheet Marketing ke Supabase. Default hanya dry run."""
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REF = 'ewicmiekwzmxkkokmpzf'
data = json.loads((ROOT / 'private/marketing-sheet-export.json').read_text())
rows = data['rows']
assert len(rows) == len({r['source_row'] for r in rows})
assert all(r['data'].get('nama_target') for r in rows)
print(f'Validasi: {len(rows)} baris unik, sumber {data["source"]}.')
if '--apply' not in sys.argv:
    print('DRY RUN: tidak menulis ke Supabase. Tambahkan --apply setelah migrasi disetujui.')
    raise SystemExit(0)

token = (Path.home() / '.supabase_suportmarket_apikey_key').read_text().strip()
endpoint = f'https://api.supabase.com/v1/projects/{REF}/database/query'

def sql_text(value):
    return "'" + str(value).replace("'", "''") + "'"

for start in range(0, len(rows), 20):
    batch = rows[start:start+20]
    values = []
    for item in batch:
        d = item['data']
        fields = [item['source_row'], d.get('research_id'), d['nama_target'], d.get('target_type'),
                  d.get('kabupaten_kota'), d.get('provinsi'), d.get('lead_score'), d.get('kategori')]
        score = int(fields[6]) if str(fields[6]).isdigit() else 'null'
        values.append(f"({fields[0]}, {', '.join(sql_text(v or '') for v in fields[1:6])}, {score}, "
                      f"{sql_text(fields[7] or '')}, {sql_text(json.dumps(d, ensure_ascii=False))}::jsonb)")
    query = ('insert into public.marketing_leads '
             '(source_row,research_id,nama_target,target_type,kabupaten_kota,provinsi,lead_score,kategori,data) values '
             + ','.join(values) + ' on conflict (source_row) do nothing;')
    req = urllib.request.Request(endpoint, data=json.dumps({'query': query}).encode(), method='POST',
                                 headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as result:
        result.read()
    print(f'Batch {start // 20 + 1}: {len(batch)} baris diproses.')
print('Selesai. Verifikasi jumlah row pada database sebelum menyatakan PASS.')
