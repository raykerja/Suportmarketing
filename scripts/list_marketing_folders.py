#!/usr/bin/env python3
"""Daftar akun pemasaran + folder Drive masing-masing (read-only, tidak sentuh Drive).

Dipakai sebagai input untuk workflow migrasi "folder klien per akun" (Bagian B).
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _supabase import sql

rows = sql(
    "select display_name, drive_folder_id from marketing_members "
    "where drive_folder_id is not null order by display_name"
)
print(json.dumps({'accounts': rows}, ensure_ascii=False, indent=2))
