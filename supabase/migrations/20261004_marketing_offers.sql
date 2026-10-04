-- Review hasil riset dan generator dokumen penawaran berbasis n8n.
-- Dijalankan setelah 20261004_marketing.sql; tidak mengubah data historis.
alter table public.marketing_leads
  add column if not exists review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected'));
alter table public.marketing_leads
  add column if not exists reviewed_by uuid references auth.users(id);
alter table public.marketing_leads
  add column if not exists reviewed_at timestamptz;

create index if not exists marketing_leads_review_idx
  on public.marketing_leads(owner_id, review_status, imported_at desc);

create table if not exists public.marketing_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  owner_id uuid not null references auth.users(id),
  lead_id uuid not null references public.marketing_leads(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'processing'
    check (status in ('processing', 'done', 'partial', 'error')),
  umk bigint not null check (umk between 1 and 1000000000),
  drive_folder_id text not null check (drive_folder_id ~ '^[A-Za-z0-9_-]{10,200}$'),
  client_name text not null,
  nomor_surat text,
  doc_file_id text,
  doc_file_url text,
  rab_file_id text,
  rab_file_url text,
  error text
);
create index if not exists marketing_offers_owner_idx
  on public.marketing_offers(owner_id, created_at desc);

alter table public.marketing_offers enable row level security;
drop policy if exists "marketing offers team read" on public.marketing_offers;
create policy "marketing offers team read" on public.marketing_offers
  for select to authenticated using (
    exists (select 1 from public.marketing_members where user_id = auth.uid() and active)
    and (owner_id = auth.uid() or public.marketing_is_admin()));
revoke all on public.marketing_offers from anon, authenticated;
grant select on public.marketing_offers to authenticated;

-- Review lead dan pembuatan penawaran hanya ditulis melalui Edge Function setelah
-- verifikasi Auth dan kepemilikan; tidak ada grant UPDATE/INSERT browser.
