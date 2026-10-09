#!/usr/bin/env python3
"""Pemeriksaan status HANYA-BACA: Git vs situs live, Edge Function, dan (bila token ada) Supabase.
Pemakaian:  python3 scripts/status_check.py
Keluaran bertanda OK / PERHATIAN / GAGAL. Tidak mengubah apa pun dan tidak mencetak rahasia."""
import hashlib, subprocess, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from _supabase import API, REF, SITE, call, sql, token

root = Path(__file__).resolve().parents[1]
problems = []

def line(level, text):
    print(f'[{level:<10}] {text}')
    if level != 'OK':
        problems.append(text)

def git(*args):
    return subprocess.run(['git', *args], cwd=root, capture_output=True, text=True).stdout.strip()

print('== 1. Git ==')
branch, head = git('rev-parse', '--abbrev-ref', 'HEAD'), git('rev-parse', '--short', 'HEAD')
print(f'    cabang {branch}, HEAD {head}: {git("log", "-1", "--format=%s")}')
subprocess.run(['git', 'fetch', '-q', 'origin'], cwd=root, capture_output=True)
ahead_behind = git('rev-list', '--left-right', '--count', 'HEAD...origin/main').split()
if len(ahead_behind) == 2 and ahead_behind != ['0', '0']:
    line('PERHATIAN', f'lokal vs origin/main: {ahead_behind[0]} commit belum dipush, {ahead_behind[1]} commit belum ditarik')
else:
    line('OK', 'sinkron dengan origin/main')
dirty = [row for row in git('status', '--short').splitlines() if row.strip()]
line('OK' if not dirty else 'PERHATIAN', 'tidak ada perubahan lokal' if not dirty else f'{len(dirty)} berkas berubah/belum dilacak (git status)')

print('== 2. Situs live vs repositori ==')
code, _ = call(SITE, raw=True)
line('OK' if code == 200 else 'GAGAL', f'{SITE} menjawab HTTP {code}')
for name in ['index.html', 'app.js', 'clients-preview.js', 'style.css', 'theme-ray.css', 'config.js']:
    code, live = call(f'{SITE}/{name}?x={hash(name) & 0xffff}', raw=True)
    local = (root / name).read_bytes()
    if code != 200:
        line('GAGAL', f'{name}: live HTTP {code}')
    elif hashlib.sha256(live).digest() == hashlib.sha256(local).digest():
        line('OK', f'{name}: live sama dengan repo')
    else:
        line('PERHATIAN', f'{name}: live BERBEDA dari repo (belum dipush, Pages belum selesai, atau cache; coba ulang 1-2 menit)')

print('== 3. Edge Function ==')
code, body = call(f'https://{REF}.supabase.co/functions/v1/marketing', {'Content-Type': 'application/json', 'Origin': SITE}, {'action': 'settings'}, 'POST')
ok = code == 401 and isinstance(body, dict) and 'Login' in str(body.get('error', ''))
line('OK' if ok else 'GAGAL', 'menolak permintaan tanpa login (401), fungsi hidup' if ok else f'jawaban tak terduga: HTTP {code} {str(body)[:120]}')

print('== 4. Supabase (butuh token) ==')
tok = token()
if not tok:
    line('PERHATIAN', 'token Supabase tidak ada (SUPABASE_ACCESS_TOKEN / ~/.supabase_suportmarket_apikey_key); bagian ini dilewati')
else:
    try:
        _, functions = call(API + '/functions', {'Authorization': 'Bearer ' + tok})
        fn = next((f for f in functions if f.get('slug') == 'marketing'), None)
        line('OK' if fn and fn.get('status') == 'ACTIVE' else 'GAGAL', f"Edge Function marketing versi {fn.get('version')} {fn.get('status')}" if fn else 'Edge Function marketing tidak ditemukan')
        expected_tables = ['marketing_members', 'marketing_visits', 'marketing_progress', 'marketing_clients', 'marketing_client_pics', 'marketing_pic_aliases',
                           'marketing_client_changes', 'marketing_pic_visits', 'marketing_client_offers', 'marketing_client_offer_events', 'marketing_ai_daily_usage']
        tables = {r['t']: r for r in sql("select c.relname t, c.relrowsecurity rls, (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname) pol "
                                         "from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'", tok)}
        missing = [t for t in expected_tables if t not in tables]
        line('OK' if not missing else 'GAGAL', 'semua tabel inti ada' if not missing else 'tabel hilang (migrasi belum diterapkan?): ' + ', '.join(missing))
        no_rls = [t for t, r in tables.items() if not r['rls']]
        line('OK' if not no_rls else 'GAGAL', 'RLS aktif di semua tabel' if not no_rls else 'RLS MATI di: ' + ', '.join(no_rls))
        no_policy = [t for t, r in tables.items() if r['rls'] and int(r['pol']) == 0 and t != 'marketing_ai_daily_usage']
        line('OK' if not no_policy else 'PERHATIAN', 'setiap tabel punya policy' if not no_policy else 'tabel tanpa policy (akses hanya service role): ' + ', '.join(no_policy))
        funcs = {r['proname'] for r in sql("select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'", tok)}
        need = {'marketing_is_admin', 'marketing_save_client', 'marketing_set_client_status', 'marketing_set_pic_alias', 'marketing_set_member_name', 'marketing_record_client_offer'}
        line('OK' if need <= funcs else 'GAGAL', 'semua fungsi RPC ada' if need <= funcs else 'fungsi hilang: ' + ', '.join(sorted(need - funcs)))
        members = sql('select role, active, count(*) n from marketing_members group by 1,2 order by 1,2', tok)
        print('    akun:', ', '.join(f"{m['role']}{'' if m['active'] else ' (nonaktif)'}={m['n']}" for m in members))
        stats = sql("select (select count(*) from marketing_clients where status='aktif') aktif, (select count(*) from marketing_clients where status='arsip') arsip, "
                    "(select count(*) from marketing_clients where kontrak_akhir is null and status='aktif') tanpa_tanggal, "
                    "(select count(*) from marketing_pic_aliases where user_id is null) alias_tanpa_akun, "
                    "(select count(*) from marketing_pic_visits) pic_visit, (select count(*) from marketing_client_offers) penawaran, "
                    "(select count(*) from marketing_visits) sales_visit, (select count(*) from marketing_client_changes) perubahan", tok)[0]
        print('    data:', ', '.join(f'{k}={v}' for k, v in stats.items()))
        if int(stats['alias_tanpa_akun']):
            names = [r['alias'] for r in sql('select alias from marketing_pic_aliases where user_id is null order by 1', tok)]
            line('PERHATIAN', f"{stats['alias_tanpa_akun']} PIC belum punya akun: {', '.join(names)} (client-nya hanya terlihat admin)")
        if int(stats['tanpa_tanggal']):
            line('PERHATIAN', f"{stats['tanpa_tanggal']} client aktif belum punya tanggal kontrak (pengingat Monitoring belum bekerja untuk mereka)")
        if not int(stats['pic_visit']) and not int(stats['penawaran']):
            line('PERHATIAN', 'belum ada PIC Visit / penawaran ulang tercatat: alur menu 2 & 3 belum dipakai atau belum diuji dengan akun staf asli')
    except Exception as error:  # noqa: BLE001
        line('GAGAL', f'pemeriksaan Supabase gagal: {error}')

print('== Ringkasan ==')
print('Semua OK.' if not problems else f'{len(problems)} hal perlu perhatian:\n  - ' + '\n  - '.join(problems))
print('Lihat docs/02-STATUS-PROGRES.md untuk arti tiap temuan dan tindak lanjutnya.')
