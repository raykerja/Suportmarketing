#!/usr/bin/env python3
"""Pasang migrasi Client Active + PIC lalu isi data dari private/client-active-export.json. Default dry run."""
import json, re, sys, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
REF = 'ewicmiekwzmxkkokmpzf'
clients = json.loads((ROOT / 'private/client-active-export.json').read_text())
mapping = json.loads((ROOT / 'outputs/pic-mapping-20261009/pic-mapping.json').read_text())
pics = []
for c in clients:
    for role, raw in (('korlap', c['korlap']), ('admin', c['admin'])):
        aliases = [raw] if raw == 'PAK TOHAR' else [a for a in re.split(r'[ ,]+', raw) if a]
        pics += [{'no': c['no'], 'alias': a, 'role': role} for a in aliases]
aliases = [{'alias': a, 'role': r, 'name': v['akun'], 'note': v['status']}
           for r in ('korlap', 'admin') for a, v in mapping[r].items()]
unknown = {(p['alias'], p['role']) for p in pics} - {(a['alias'], a['role']) for a in aliases}
print(f'{len(clients)} client, {len(pics)} relasi PIC, {len(aliases)} alias; alias tak terpetakan: {sorted(unknown)}')
if '--apply' not in sys.argv:
    raise SystemExit('DRY RUN. Tambahkan --apply.')
aliases += [{'alias': a, 'role': r, 'name': None, 'note': 'belum punya akun'} for a, r in sorted(unknown)]
def lit(o): return '$j$' + json.dumps(o, ensure_ascii=False) + '$j$'
sql = (ROOT / 'supabase/migrations/20261009_marketing_clients_pic.sql').read_text() + f"""
insert into public.marketing_pic_aliases(alias,pic_role,user_id,note)
select a.alias,a.role,(select user_id from public.marketing_members m where m.display_name=a.name),coalesce(a.note,'')
from jsonb_to_recordset({lit(aliases)}::jsonb) as a(alias text,role text,name text,note text);
insert into public.marketing_clients(source_no,nama_client,cabang,pic_user,nomor_hp,korlap_raw,admin_raw,google_maps,kategori,masa_kontrak)
select no,nama,cabang,pic_user,hp,korlap,admin,maps,kat,kontrak
from jsonb_to_recordset({lit(clients)}::jsonb) as c(no int,nama text,cabang text,pic_user text,hp text,korlap text,admin text,maps text,kat text,kontrak text);
insert into public.marketing_client_pics(client_id,alias,pic_role)
select c.id,p.alias,p.role from jsonb_to_recordset({lit(pics)}::jsonb) as p(no int,alias text,role text)
join public.marketing_clients c on c.source_no=p.no on conflict do nothing;
"""
token = (Path.home() / '.supabase_suportmarket_apikey_key').read_text().strip()
req = urllib.request.Request(f'https://api.supabase.com/v1/projects/{REF}/database/query',
    data=json.dumps({'query': 'begin;' + sql + 'commit;'}).encode(), method='POST',
    headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
print(urllib.request.urlopen(req, timeout=60).read().decode()[:300])
