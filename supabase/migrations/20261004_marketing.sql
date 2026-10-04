create table if not exists public.marketing_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.marketing_researches (
  research_id text primary key,
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'processing' check (status in ('processing','done','error')),
  target_type text not null check (target_type in ('SWASTA','PEMERINTAH')),
  kecamatan text not null,
  kabupaten_kota text not null,
  provinsi text not null,
  bidang text not null default '',
  jumlah integer not null check (jumlah between 1 and 10),
  tanggal date not null default current_date,
  jumlah_ditemukan integer not null default 0,
  error text,
  targets jsonb not null default '[]'::jsonb
);

create table if not exists public.marketing_leads (
  id uuid primary key default gen_random_uuid(),
  research_id text,
  result_index integer,
  source_row integer unique,
  imported_at timestamptz not null default now(),
  nama_target text not null,
  target_type text,
  kabupaten_kota text,
  provinsi text,
  lead_score integer,
  kategori text,
  data jsonb not null default '{}'::jsonb
);
create index if not exists marketing_leads_research_idx on public.marketing_leads(research_id);
create unique index if not exists marketing_leads_result_idx on public.marketing_leads(research_id, result_index);
create index if not exists marketing_leads_name_idx on public.marketing_leads(lower(nama_target));

create table if not exists public.marketing_letters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  legacy_source text unique,
  recipient text not null,
  subject text not null,
  body text not null
);
create index if not exists marketing_letters_owner_idx on public.marketing_letters(owner_id, created_at desc);

alter table public.marketing_members enable row level security;
alter table public.marketing_researches enable row level security;
alter table public.marketing_leads enable row level security;
alter table public.marketing_letters enable row level security;

drop policy if exists "marketing members own read" on public.marketing_members;
create policy "marketing members own read" on public.marketing_members
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "marketing research team read" on public.marketing_researches;
create policy "marketing research team read" on public.marketing_researches
  for select to authenticated using (exists (select 1 from public.marketing_members where user_id = auth.uid()));
drop policy if exists "marketing leads team read" on public.marketing_leads;
create policy "marketing leads team read" on public.marketing_leads
  for select to authenticated using (exists (select 1 from public.marketing_members where user_id = auth.uid()));
drop policy if exists "marketing letters own read" on public.marketing_letters;
create policy "marketing letters own read" on public.marketing_letters
  for select to authenticated using (owner_id = auth.uid() and exists (select 1 from public.marketing_members where user_id = auth.uid()));
drop policy if exists "marketing letters own insert" on public.marketing_letters;
create policy "marketing letters own insert" on public.marketing_letters
  for insert to authenticated with check (owner_id = auth.uid() and exists (select 1 from public.marketing_members where user_id = auth.uid()));
drop policy if exists "marketing letters own update" on public.marketing_letters;
create policy "marketing letters own update" on public.marketing_letters
  for update to authenticated using (owner_id = auth.uid() and exists (select 1 from public.marketing_members where user_id = auth.uid()))
    with check (owner_id = auth.uid() and exists (select 1 from public.marketing_members where user_id = auth.uid()));
drop policy if exists "marketing letters own delete" on public.marketing_letters;
create policy "marketing letters own delete" on public.marketing_letters
  for delete to authenticated using (owner_id = auth.uid() and exists (select 1 from public.marketing_members where user_id = auth.uid()));

revoke all on public.marketing_members, public.marketing_researches, public.marketing_leads, public.marketing_letters from anon;
grant select on public.marketing_members to authenticated;
grant select on public.marketing_researches, public.marketing_leads to authenticated;
grant select, insert, update, delete on public.marketing_letters to authenticated;
