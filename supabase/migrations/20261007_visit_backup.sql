-- Jalur cadangan: salinan lengkap data kunjungan ke folder Drive masing-masing staf.
-- Kolom ditambah saja; data dan policy lama tidak berubah.
alter table public.marketing_visits
  add column if not exists backup_status text not null default 'pending'
    check (backup_status in ('pending','done','skipped','error')),
  add column if not exists backup_drive_file_id text,
  add column if not exists backup_drive_url text,
  add column if not exists backup_at timestamptz,
  add column if not exists backup_error text;
