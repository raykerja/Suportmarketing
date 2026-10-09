-- Siklus hidup client: arsip (bukan hapus) dan masa kontrak berupa tanggal. Staf hanya melihat client berstatus aktif; admin melihat semua.
alter table public.marketing_clients
  add column if not exists status text not null default 'aktif' check (status in ('aktif','arsip')),
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id),
  add column if not exists archive_reason text not null default '',
  add column if not exists kontrak_mulai date,
  add column if not exists kontrak_akhir date,
  add constraint marketing_clients_kontrak_order check (kontrak_mulai is null or kontrak_akhir is null or kontrak_akhir >= kontrak_mulai);

-- Dua baris yang masa kontraknya sudah terisi teks di sheet
update public.marketing_clients set kontrak_mulai = '2026-09-01', kontrak_akhir = '2026-12-31' where source_no = 274;
update public.marketing_clients set kontrak_mulai = '2026-09-25', kontrak_akhir = '2027-09-24' where source_no = 275;

drop policy "clients read own pic" on public.marketing_clients;
create policy "clients read own pic" on public.marketing_clients for select to authenticated
  using (exists (select 1 from public.marketing_members where user_id=auth.uid() and active)
    and (public.marketing_is_admin() or (status = 'aktif' and exists (
      select 1 from public.marketing_client_pics p
      join public.marketing_pic_aliases a on a.alias=p.alias and a.pic_role=p.pic_role
      where p.client_id=marketing_clients.id and a.user_id=auth.uid()))));

-- Pencatatan PIC Visit hanya untuk client aktif; mengubah catatan lama tetap boleh walau client kemudian diarsipkan.
drop policy "pic visits insert own" on public.marketing_pic_visits;
create policy "pic visits insert own" on public.marketing_pic_visits for insert to authenticated
  with check (owner_id=auth.uid()
    and exists (select 1 from public.marketing_members where user_id=auth.uid() and active)
    and exists (select 1 from public.marketing_clients c where c.id=client_id and c.status='aktif'));
drop policy "pic visits update own" on public.marketing_pic_visits;
create policy "pic visits update own" on public.marketing_pic_visits for update to authenticated
  using (owner_id=auth.uid() and exists (select 1 from public.marketing_members where user_id=auth.uid() and active))
  with check (owner_id=auth.uid());

create or replace function public.marketing_save_client(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := nullif(p->>'id','')::uuid;
  v_korlap text[] := coalesce(array(select upper(trim(x)) from jsonb_array_elements_text(coalesce(p->'korlap','[]'::jsonb)) x where trim(x) <> ''), '{}');
  v_admin text[] := coalesce(array(select upper(trim(x)) from jsonb_array_elements_text(coalesce(p->'admin','[]'::jsonb)) x where trim(x) <> ''), '{}');
  v_name text := trim(coalesce(p->>'nama_client',''));
  v_kategori text := upper(trim(coalesce(p->>'kategori','')));
  v_mulai date := nullif(trim(coalesce(p->>'kontrak_mulai','')),'')::date;
  v_akhir date := nullif(trim(coalesce(p->>'kontrak_akhir','')),'')::date;
  v_before jsonb; v_after jsonb; v_row public.marketing_clients; a text;
begin
  if not public.marketing_is_admin() then raise exception 'Hanya admin yang boleh mengubah data client' using errcode = '42501'; end if;
  if v_name = '' or length(v_name) > 200 then raise exception 'Nama client wajib diisi (maksimal 200 karakter)'; end if;
  if v_kategori not in ('', 'PEMERINTAHAN', 'SWASTA') then raise exception 'Kategori harus PEMERINTAHAN atau SWASTA'; end if;
  if v_mulai is not null and v_akhir is not null and v_akhir < v_mulai then raise exception 'Tanggal akhir kontrak tidak boleh sebelum tanggal mulai'; end if;
  if length(coalesce(p->>'google_maps','')) > 500 or length(coalesce(p->>'pic_user','')) > 200 or length(coalesce(p->>'nomor_hp','')) > 100
     or length(coalesce(p->>'cabang','')) > 100 or length(coalesce(p->>'masa_kontrak','')) > 200 then raise exception 'Ada isian yang terlalu panjang'; end if;
  foreach a in array v_korlap loop
    if not exists (select 1 from public.marketing_pic_aliases where alias = a and pic_role = 'korlap') then raise exception 'PIC Korlap % belum terdaftar', a; end if;
  end loop;
  foreach a in array v_admin loop
    if not exists (select 1 from public.marketing_pic_aliases where alias = a and pic_role = 'admin') then raise exception 'PIC Admin % belum terdaftar', a; end if;
  end loop;
  if v_id is null then
    insert into public.marketing_clients(source_no, nama_client, cabang, pic_user, nomor_hp, korlap_raw, admin_raw, google_maps, kategori, masa_kontrak, kontrak_mulai, kontrak_akhir, updated_by)
    values ((select coalesce(max(source_no),0)+1 from public.marketing_clients), v_name, trim(coalesce(p->>'cabang','')), trim(coalesce(p->>'pic_user','')),
            trim(coalesce(p->>'nomor_hp','')), array_to_string(v_korlap, ', '), array_to_string(v_admin, ', '), trim(coalesce(p->>'google_maps','')),
            v_kategori, trim(coalesce(p->>'masa_kontrak','')), v_mulai, v_akhir, auth.uid())
    returning * into v_row;
    v_before := null;
  else
    select to_jsonb(c) || jsonb_build_object('korlap', (select coalesce(jsonb_agg(alias),'[]') from public.marketing_client_pics where client_id=c.id and pic_role='korlap'),
                                             'admin',  (select coalesce(jsonb_agg(alias),'[]') from public.marketing_client_pics where client_id=c.id and pic_role='admin'))
      into v_before from public.marketing_clients c where c.id = v_id for update;
    if v_before is null then raise exception 'Client tidak ditemukan'; end if;
    if p ? 'expected_updated_at' and (v_before->>'updated_at')::timestamptz <> (p->>'expected_updated_at')::timestamptz then
      raise exception 'Data client ini sudah diubah orang lain. Muat ulang lalu ulangi perubahan.' using errcode = '40001';
    end if;
    update public.marketing_clients set nama_client=v_name, cabang=trim(coalesce(p->>'cabang','')), pic_user=trim(coalesce(p->>'pic_user','')),
      nomor_hp=trim(coalesce(p->>'nomor_hp','')), korlap_raw=array_to_string(v_korlap, ', '), admin_raw=array_to_string(v_admin, ', '),
      google_maps=trim(coalesce(p->>'google_maps','')), kategori=v_kategori, masa_kontrak=trim(coalesce(p->>'masa_kontrak','')),
      kontrak_mulai=v_mulai, kontrak_akhir=v_akhir, updated_at=now(), updated_by=auth.uid()
    where id = v_id returning * into v_row;
  end if;
  delete from public.marketing_client_pics where client_id = v_row.id;
  insert into public.marketing_client_pics(client_id, alias, pic_role) select v_row.id, x, 'korlap' from unnest(v_korlap) x on conflict do nothing;
  insert into public.marketing_client_pics(client_id, alias, pic_role) select v_row.id, x, 'admin' from unnest(v_admin) x on conflict do nothing;
  v_after := to_jsonb(v_row) || jsonb_build_object('korlap', to_jsonb(v_korlap), 'admin', to_jsonb(v_admin));
  insert into public.marketing_client_changes(client_id, changed_by, action, before, after) values (v_row.id, auth.uid(), case when v_id is null then 'create' else 'update' end, v_before, v_after);
  return to_jsonb(v_row);
end $$;

create or replace function public.marketing_set_client_status(p_id uuid, p_status text, p_reason text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare v_old text; v_reason text := left(trim(coalesce(p_reason,'')), 300);
begin
  if not public.marketing_is_admin() then raise exception 'Hanya admin yang boleh mengarsipkan client' using errcode = '42501'; end if;
  if p_status not in ('aktif','arsip') then raise exception 'Status tidak valid'; end if;
  select status into v_old from public.marketing_clients where id = p_id for update;
  if not found then raise exception 'Client tidak ditemukan'; end if;
  if p_status = 'arsip' and v_reason = '' then raise exception 'Isi alasan pengarsipan'; end if;
  update public.marketing_clients set status = p_status, archived_at = case when p_status='arsip' then now() end,
    archived_by = case when p_status='arsip' then auth.uid() end, archive_reason = case when p_status='arsip' then v_reason else '' end,
    updated_at = now(), updated_by = auth.uid() where id = p_id;
  insert into public.marketing_client_changes(client_id, changed_by, action, before, after)
  values (p_id, auth.uid(), 'status', jsonb_build_object('status', v_old), jsonb_build_object('status', p_status, 'alasan', v_reason));
end $$;
revoke all on function public.marketing_set_client_status(uuid,text,text) from public, anon;
grant execute on function public.marketing_set_client_status(uuid,text,text) to authenticated;
