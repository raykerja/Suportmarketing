-- Progres Penawaran Ulang: centang manual per client (terpisah dari tahap Monitoring & Tindaklanjut) untuk
-- memantau klien lama mana yang sudah dibuatkan surat penawaran ulang. Dilihat per akun PIC Admin (hanya
-- client yang PIC Admin-nya dia); admin sistem melihat semua. Boleh dicentang oleh PIC Admin pemilik client
-- itu sendiri atau admin sistem.
create table public.marketing_client_repitch (
  client_id uuid primary key references public.marketing_clients(id) on delete cascade,
  offer_made boolean not null default false,
  marked_by uuid references auth.users(id),
  marked_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.marketing_client_repitch enable row level security;

create policy "repitch read own pic admin" on public.marketing_client_repitch for select to authenticated
  using (exists (select 1 from public.marketing_members where user_id=auth.uid() and active)
    and (public.marketing_is_admin() or exists (
      select 1 from public.marketing_client_pics p
      join public.marketing_pic_aliases a on a.alias=p.alias and a.pic_role=p.pic_role
      where p.client_id=marketing_client_repitch.client_id and p.pic_role='admin' and a.user_id=auth.uid())));

revoke all on public.marketing_client_repitch from anon, authenticated;
grant select on public.marketing_client_repitch to authenticated;

-- security definer: satu fungsi menangani baik admin sistem maupun PIC Admin pemilik client, dengan
-- pemeriksaan hak akses eksplisit di dalamnya (bukan lewat RLS insert/update biasa).
create function public.marketing_set_client_repitch(p_client_id uuid, p_offer_made boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.marketing_members where user_id=auth.uid() and active) then
    raise exception 'Akun tidak aktif' using errcode = '42501';
  end if;
  if not exists (select 1 from public.marketing_clients where id=p_client_id and status='aktif') then
    raise exception 'Client tidak ditemukan atau tidak aktif';
  end if;
  if not (public.marketing_is_admin() or exists (
      select 1 from public.marketing_client_pics p
      join public.marketing_pic_aliases a on a.alias=p.alias and a.pic_role=p.pic_role
      where p.client_id=p_client_id and p.pic_role='admin' and a.user_id=auth.uid())) then
    raise exception 'Anda bukan PIC Admin client ini' using errcode = '42501';
  end if;
  insert into public.marketing_client_repitch(client_id, offer_made, marked_by, marked_at, updated_at)
  values (p_client_id, p_offer_made, auth.uid(), case when p_offer_made then now() end, now())
  on conflict (client_id) do update set offer_made=excluded.offer_made, marked_by=auth.uid(),
    marked_at=case when excluded.offer_made then now() else public.marketing_client_repitch.marked_at end, updated_at=now();
end $$;
revoke all on function public.marketing_set_client_repitch(uuid,boolean) from public, anon;
grant execute on function public.marketing_set_client_repitch(uuid,boolean) to authenticated;
