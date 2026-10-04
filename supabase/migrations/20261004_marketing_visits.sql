-- Laporan kunjungan berdasarkan tab DataMarketing, Sheet MARKETING RAYMP 2026.
create table if not exists public.marketing_visits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  lead_id uuid references public.marketing_leads(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb,
  photo_path text,
  photo_drive_file_id text,
  photo_drive_url text,
  sheet_status text not null default 'pending' check (sheet_status in ('pending','processing','synced','error')),
  sheet_row integer,
  sheet_error text,
  constraint marketing_visit_company check (length(trim(coalesce(data->>'nama_perusahaan',''))) between 1 and 180),
  constraint marketing_visit_date check (coalesce(data->>'tanggal_realisasi_kunjungan','') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
);
create index if not exists marketing_visits_owner_date_idx on public.marketing_visits(owner_id, created_at desc);
create index if not exists marketing_visits_sync_idx on public.marketing_visits(sheet_status, created_at);
alter table public.marketing_visits enable row level security;
create policy "marketing visits team read" on public.marketing_visits for select to authenticated
  using (exists (select 1 from public.marketing_members where user_id=auth.uid() and active)
    and (owner_id=auth.uid() or public.marketing_is_admin()));
revoke all on public.marketing_visits from anon;
grant select on public.marketing_visits to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('marketing-visit-photos','marketing-visit-photos',false,10485760,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do nothing;
create policy "marketing visit photo own upload" on storage.objects for insert to authenticated
  with check (bucket_id='marketing-visit-photos' and (storage.foldername(name))[1]=auth.uid()::text
    and exists (select 1 from public.marketing_members where user_id=auth.uid() and active));
create policy "marketing visit photo own read" on storage.objects for select to authenticated
  using (bucket_id='marketing-visit-photos' and (storage.foldername(name))[1]=auth.uid()::text
    and exists (select 1 from public.marketing_members where user_id=auth.uid() and active));
