-- Timeline progres per kunjungan. Jalankan hanya setelah marketing_visits tersedia.
create table public.marketing_progress (
  visit_id uuid primary key references public.marketing_visits(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  stage text not null check (stage in ('kunjungan','proposal','penawaran','follow_up','deal','gagal')),
  next_follow_up date,
  last_note text not null,
  last_activity_date date not null,
  last_attachment_url text,
  updated_at timestamptz not null default now(),
  constraint marketing_progress_closed_due check (stage not in ('deal','gagal') or next_follow_up is null)
);
create index marketing_progress_due_idx on public.marketing_progress(next_follow_up, owner_id) where next_follow_up is not null;

create table public.marketing_progress_events (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.marketing_visits(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  stage text not null check (stage in ('kunjungan','proposal','penawaran','follow_up','deal','gagal')),
  activity_date date not null,
  note text not null check (length(trim(note)) between 1 and 3000),
  next_follow_up date,
  attachment_url text,
  created_at timestamptz not null default now()
);
create index marketing_progress_events_visit_idx on public.marketing_progress_events(visit_id, created_at desc);

alter table public.marketing_progress enable row level security;
alter table public.marketing_progress_events enable row level security;
create policy "marketing progress team read" on public.marketing_progress for select to authenticated
  using (exists (select 1 from public.marketing_members where user_id=auth.uid() and active)
    and (owner_id=auth.uid() or public.marketing_is_admin()));
create policy "marketing progress events team read" on public.marketing_progress_events for select to authenticated
  using (exists (select 1 from public.marketing_members where user_id=auth.uid() and active)
    and (owner_id=auth.uid() or public.marketing_is_admin()));
revoke all on public.marketing_progress, public.marketing_progress_events from anon, authenticated;
grant select on public.marketing_progress, public.marketing_progress_events to authenticated;

-- Satu transaksi menjaga ringkasan, riwayat, dan status sinkron Sheet tetap selaras.
create function public.marketing_record_progress(
  p_visit_id uuid, p_owner_id uuid, p_stage text, p_activity_date date,
  p_note text, p_next_follow_up date, p_attachment_url text
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_data jsonb;
  v_event_id uuid;
begin
  select data into v_data from public.marketing_visits
    where id = p_visit_id and owner_id = p_owner_id for update;
  if not found then raise exception 'Laporan tidak ditemukan'; end if;
  if p_stage in ('deal','gagal') then p_next_follow_up := null; end if;
  insert into public.marketing_progress(visit_id,owner_id,stage,next_follow_up,last_note,last_activity_date,last_attachment_url)
  values (p_visit_id,p_owner_id,p_stage,p_next_follow_up,p_note,p_activity_date,p_attachment_url)
  on conflict (visit_id) do update set stage=excluded.stage,next_follow_up=excluded.next_follow_up,
    last_note=excluded.last_note,last_activity_date=excluded.last_activity_date,
    last_attachment_url=coalesce(excluded.last_attachment_url,public.marketing_progress.last_attachment_url),updated_at=now();
  insert into public.marketing_progress_events(visit_id,owner_id,stage,activity_date,note,next_follow_up,attachment_url)
  values (p_visit_id,p_owner_id,p_stage,p_activity_date,p_note,p_next_follow_up,p_attachment_url)
  returning id into v_event_id;
  v_data := v_data || jsonb_build_object('tanggal_follow_up', coalesce(p_next_follow_up::text,''));
  v_data := v_data || jsonb_build_object('tahap_terkini',p_stage,
    'tanggal_aktivitas_terakhir',p_activity_date::text,'catatan_progres_terakhir',p_note,
    'link_file_progres',coalesce(p_attachment_url,v_data->>'link_file_progres',''));
  if p_stage = 'follow_up' then
    v_data := v_data || jsonb_build_object('tanggal_follow_up_aktual',p_activity_date::text,'catatan_hasil_follow_up',p_note);
  elsif p_stage = 'deal' then
    v_data := v_data || jsonb_build_object('respon','Baik','catatan_hasil_follow_up',p_note);
  elsif p_stage = 'gagal' then
    v_data := v_data || jsonb_build_object('respon','Menolak','catatan_hasil_follow_up',p_note);
  end if;
  update public.marketing_visits set data=v_data,sheet_status='pending',sheet_error=null,updated_at=now()
    where id=p_visit_id;
  return v_event_id;
end;
$$;
revoke all on function public.marketing_record_progress(uuid,uuid,text,date,text,date,text) from public, anon, authenticated;
grant execute on function public.marketing_record_progress(uuid,uuid,text,date,text,date,text) to service_role;
