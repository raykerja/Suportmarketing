-- Client Active + pemetaan PIC Korlap/Admin -> akun. Staf hanya melihat client yang PIC-nya dia; admin melihat semua.
create table public.marketing_pic_aliases (
  alias text not null,
  pic_role text not null check (pic_role in ('korlap','admin')),
  user_id uuid references public.marketing_members(user_id) on delete set null,
  note text not null default '',
  primary key (alias, pic_role)
);
create table public.marketing_clients (
  id uuid primary key default gen_random_uuid(),
  source_no int not null unique,
  nama_client text not null,
  cabang text not null default '',
  pic_user text not null default '',
  nomor_hp text not null default '',
  korlap_raw text not null default '',
  admin_raw text not null default '',
  google_maps text not null default '',
  kategori text not null default '',
  masa_kontrak text not null default '',
  created_at timestamptz not null default now()
);
create table public.marketing_client_pics (
  client_id uuid not null references public.marketing_clients(id) on delete cascade,
  alias text not null,
  pic_role text not null check (pic_role in ('korlap','admin')),
  primary key (client_id, alias, pic_role)
);
create index marketing_client_pics_alias_idx on public.marketing_client_pics(alias, pic_role);

alter table public.marketing_pic_aliases enable row level security;
alter table public.marketing_clients enable row level security;
alter table public.marketing_client_pics enable row level security;
create policy "pic aliases read" on public.marketing_pic_aliases for select to authenticated
  using (exists (select 1 from public.marketing_members where user_id=auth.uid() and active)
    and (user_id=auth.uid() or public.marketing_is_admin()));
create policy "clients read own pic" on public.marketing_clients for select to authenticated
  using (exists (select 1 from public.marketing_members where user_id=auth.uid() and active)
    and (public.marketing_is_admin() or exists (
      select 1 from public.marketing_client_pics p
      join public.marketing_pic_aliases a on a.alias=p.alias and a.pic_role=p.pic_role
      where p.client_id=marketing_clients.id and a.user_id=auth.uid())));
create policy "client pics read own" on public.marketing_client_pics for select to authenticated
  using (exists (select 1 from public.marketing_members where user_id=auth.uid() and active)
    and (public.marketing_is_admin() or exists (
      select 1 from public.marketing_pic_aliases a
      where a.alias=marketing_client_pics.alias and a.pic_role=marketing_client_pics.pic_role and a.user_id=auth.uid())));
revoke all on public.marketing_pic_aliases, public.marketing_clients, public.marketing_client_pics from anon, authenticated;
grant select on public.marketing_pic_aliases, public.marketing_clients, public.marketing_client_pics to authenticated;
