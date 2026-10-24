-- Menu "Data Karyawan": satu baris per lokasi/client tempat form data karyawan dibuat.
-- Penulisan hanya lewat service role di Edge Function (callback n8n); staf/admin hanya baca.
create table if not exists public.marketing_employee_locations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  nama_lokasi text not null check (char_length(nama_lokasi) between 2 and 180),
  created_by uuid not null references auth.users(id),
  created_by_name text not null,
  status text not null default 'processing' check (status in ('processing', 'done', 'error')),
  drive_folder_id text check (drive_folder_id ~ '^[A-Za-z0-9_-]{10,200}$'),
  drive_folder_url text,
  form_id text check (form_id ~ '^[A-Za-z0-9_-]{10,200}$'),
  form_edit_url text,
  form_view_url text,
  media_folder_id text check (media_folder_id ~ '^[A-Za-z0-9_-]{10,200}$'),
  media_folder_url text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketing_employee_locations_created_at_idx
  on public.marketing_employee_locations (created_at desc);

alter table public.marketing_employee_locations enable row level security;

create policy "marketing employee locations team read" on public.marketing_employee_locations
  for select to authenticated using (
    exists (select 1 from public.marketing_members where user_id = auth.uid() and active)
  );

revoke all on public.marketing_employee_locations from anon, authenticated;
grant select on public.marketing_employee_locations to authenticated;
