-- Monitoring & tindak lanjut penawaran ulang per client aktif. Staf hanya pada client yang boleh dilihatnya (RLS marketing_clients); admin melihat semua.
create table public.marketing_client_offers (
  client_id uuid primary key references public.marketing_clients(id) on delete cascade,
  stage text not null check (stage in ('review','proposal','sent','follow_up','won','lost')),
  offer_type text not null check (offer_type in ('Perpanjangan kontrak','Layanan tambahan','Perpanjangan + perluasan')),
  next_follow_up date,
  last_note text not null,
  last_activity_date date not null,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  constraint client_offers_closed_due check (stage not in ('won','lost') or next_follow_up is null)
);
create index marketing_client_offers_due_idx on public.marketing_client_offers(next_follow_up) where next_follow_up is not null;
create table public.marketing_client_offer_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.marketing_clients(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  stage text not null check (stage in ('review','proposal','sent','follow_up','won','lost')),
  offer_type text not null,
  activity_date date not null,
  note text not null check (length(trim(note)) between 1 and 3000),
  next_follow_up date,
  created_at timestamptz not null default now()
);
create index marketing_client_offer_events_idx on public.marketing_client_offer_events(client_id, created_at desc);

alter table public.marketing_client_offers enable row level security;
alter table public.marketing_client_offer_events enable row level security;
-- exists(...) pada marketing_clients ikut RLS: client yang tak boleh dilihat dianggap tidak ada.
create policy "offers read" on public.marketing_client_offers for select to authenticated
  using (exists (select 1 from public.marketing_members where user_id=auth.uid() and active)
    and exists (select 1 from public.marketing_clients c where c.id=client_id));
create policy "offers insert" on public.marketing_client_offers for insert to authenticated
  with check (updated_by=auth.uid() and exists (select 1 from public.marketing_members where user_id=auth.uid() and active)
    and exists (select 1 from public.marketing_clients c where c.id=client_id and c.status='aktif'));
create policy "offers update" on public.marketing_client_offers for update to authenticated
  using (exists (select 1 from public.marketing_members where user_id=auth.uid() and active) and exists (select 1 from public.marketing_clients c where c.id=client_id and c.status='aktif'))
  with check (updated_by=auth.uid());
create policy "offer events read" on public.marketing_client_offer_events for select to authenticated
  using (exists (select 1 from public.marketing_members where user_id=auth.uid() and active)
    and exists (select 1 from public.marketing_clients c where c.id=client_id));
create policy "offer events insert" on public.marketing_client_offer_events for insert to authenticated
  with check (owner_id=auth.uid() and exists (select 1 from public.marketing_members where user_id=auth.uid() and active)
    and exists (select 1 from public.marketing_clients c where c.id=client_id and c.status='aktif'));
revoke all on public.marketing_client_offers, public.marketing_client_offer_events from anon, authenticated;
grant select, insert on public.marketing_client_offer_events to authenticated;
grant select, insert on public.marketing_client_offers to authenticated;
grant update (stage, offer_type, next_follow_up, last_note, last_activity_date, updated_by, updated_at) on public.marketing_client_offers to authenticated;

-- Satu transaksi menjaga ringkasan dan riwayat tetap selaras; security invoker agar RLS berlaku.
create function public.marketing_record_client_offer(
  p_client_id uuid, p_stage text, p_offer_type text, p_activity_date date, p_note text, p_next_follow_up date
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_event uuid; v_note text := trim(coalesce(p_note,''));
begin
  if not exists (select 1 from public.marketing_clients where id = p_client_id and status = 'aktif') then raise exception 'Client tidak ditemukan atau tidak aktif'; end if;
  if v_note = '' then raise exception 'Catatan wajib diisi'; end if;
  if p_stage in ('won','lost') then p_next_follow_up := null;
  elsif p_next_follow_up is null or p_next_follow_up < current_date - 1 then raise exception 'Tahap terbuka memerlukan jadwal follow up hari ini atau setelahnya'; end if;
  insert into public.marketing_client_offers(client_id, stage, offer_type, next_follow_up, last_note, last_activity_date, updated_by)
  values (p_client_id, p_stage, p_offer_type, p_next_follow_up, v_note, p_activity_date, auth.uid())
  on conflict (client_id) do update set stage=excluded.stage, offer_type=excluded.offer_type, next_follow_up=excluded.next_follow_up,
    last_note=excluded.last_note, last_activity_date=excluded.last_activity_date, updated_by=excluded.updated_by, updated_at=now();
  insert into public.marketing_client_offer_events(client_id, owner_id, stage, offer_type, activity_date, note, next_follow_up)
  values (p_client_id, auth.uid(), p_stage, p_offer_type, p_activity_date, v_note, p_next_follow_up) returning id into v_event;
  return v_event;
end $$;
revoke all on function public.marketing_record_client_offer(uuid,text,text,date,text,date) from public, anon;
grant execute on function public.marketing_record_client_offer(uuid,text,text,date,text,date) to authenticated;
