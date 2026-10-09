-- PIC Visit ke client aktif. Staf mencatat hanya untuk client yang boleh dilihatnya (RLS marketing_clients berlaku di subquery); admin membaca semua.
create table public.marketing_pic_visits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  client_id uuid not null references public.marketing_clients(id),
  visit_stage text not null default 'initial' check (visit_stage in ('initial','detail')),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data)='object' and pg_column_size(data) < 32768),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index marketing_pic_visits_owner_idx on public.marketing_pic_visits(owner_id, created_at desc);
create index marketing_pic_visits_client_idx on public.marketing_pic_visits(client_id, created_at desc);
alter table public.marketing_pic_visits enable row level security;
create policy "pic visits read" on public.marketing_pic_visits for select to authenticated
  using (exists (select 1 from public.marketing_members where user_id=auth.uid() and active)
    and (owner_id=auth.uid() or public.marketing_is_admin()));
create policy "pic visits insert own" on public.marketing_pic_visits for insert to authenticated
  with check (owner_id=auth.uid()
    and exists (select 1 from public.marketing_members where user_id=auth.uid() and active)
    and exists (select 1 from public.marketing_clients c where c.id=client_id));
create policy "pic visits update own" on public.marketing_pic_visits for update to authenticated
  using (owner_id=auth.uid() and exists (select 1 from public.marketing_members where user_id=auth.uid() and active))
  with check (owner_id=auth.uid() and exists (select 1 from public.marketing_clients c where c.id=client_id));
revoke all on public.marketing_pic_visits from anon, authenticated;
grant select, insert on public.marketing_pic_visits to authenticated;
grant update (visit_stage, data, updated_at) on public.marketing_pic_visits to authenticated;
