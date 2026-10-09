"""Pembantu kecil untuk skrip operasional: token Management API + panggilan HTTP. Tidak pernah mencetak token."""
import json, os, urllib.error, urllib.request
from pathlib import Path

REF = 'ewicmiekwzmxkkokmpzf'
SITE = 'https://marketing.raykerja.cloud'
API = 'https://api.supabase.com/v1/projects/' + REF


def token():
    """Token Management API proyek ini: env SUPABASE_ACCESS_TOKEN atau ~/.supabase_suportmarket_apikey_key. None bila tak ada."""
    value = os.environ.get('SUPABASE_ACCESS_TOKEN', '').strip()
    if value:
        return value
    path = Path.home() / '.supabase_suportmarket_apikey_key'
    return path.read_text().strip() if path.exists() else None


def call(url, headers=None, data=None, method=None, timeout=60, raw=False):
    body = data if isinstance(data, (bytes, type(None))) else json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, method=method, headers={'User-Agent': 'curl/8', **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            payload = response.read()
            return response.status, (payload if raw else (json.loads(payload) if payload else {}))
    except urllib.error.HTTPError as error:
        payload = error.read()
        try:
            return error.code, (payload if raw else json.loads(payload))
        except ValueError:
            return error.code, payload


def sql(query, tok=None):
    tok = tok or token()
    status, result = call(API + '/database/query', {'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json'}, {'query': query}, 'POST')
    if status >= 300:
        raise RuntimeError(f'SQL gagal ({status}): {str(result)[:400]}')
    return result
