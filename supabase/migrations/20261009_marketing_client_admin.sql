-- Admin mengelola Client Active: ubah data, PIC Korlap/Admin, tambah client, kelola pemetaan alias -> akun. Semua lewat RPC (cek admin di dalam) + jejak perubahan.
alter table public.marketing_clients
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references auth.users(id);

create table if not exists public.marketing_client_changes (
  id bigint generated always as identity primary key,
  client_id uuid references public.marketing_clients(id) on delete set null,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now(),
  action text not null,
  before jsonb,
  after jsonb
);
alter table public.marketing_client_changes enable row level security;
create policy "client changes admin read" on public.marketing_client_changes for select to authenticated using (public.marketing_is_admin());
revoke all on public.marketing_client_changes from anon, authenticated;
grant select on public.marketing_client_changes to authenticated;

create or replace function public.marketing_save_client(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := nullif(p->>'id','')::uuid;
  v_korlap text[] := coalesce(array(select upper(trim(x)) from jsonb_array_elements_text(coalesce(p->'korlap','[]'::jsonb)) x where trim(x) <> ''), '{}');
  v_admin text[] := coalesce(array(select upper(trim(x)) from jsonb_array_elements_text(coalesce(p->'admin','[]'::jsonb)) x where trim(x) <> ''), '{}');
  v_name text := trim(coalesce(p->>'nama_client',''));
  v_kategori text := upper(trim(coalesce(p->>'kategori','')));
  v_before jsonb; v_after jsonb; v_row public.marketing_clients; a text;
begin
  if not public.marketing_is_admin() then raise exception 'Hanya admin yang boleh mengubah data client' using errcode = '42501'; end if;
  if v_name = '' or length(v_name) > 200 then raise exception 'Nama client wajib diisi (maksimal 200 karakter)'; end if;
  if v_kategori not in ('', 'PEMERINTAHAN', 'SWASTA') then raise exception 'Kategori harus PEMERINTAHAN atau SWASTA'; end if;
  if length(coalesce(p->>'google_maps','')) > 500 or length(coalesce(p->>'pic_user','')) > 200 or length(coalesce(p->>'nomor_hp','')) > 100
     or length(coalesce(p->>'cabang','')) > 100 or length(coalesce(p->>'masa_kontrak','')) > 200 then raise exception 'Ada isian yang terlalu panjang'; end if;
  foreach a in array v_korlap loop
    if not exists (select 1 from public.marketing_pic_aliases where alias = a and pic_role = 'korlap') then raise exception 'PIC Korlap % belum terdaftar', a; end if;
  end loop;
  foreach a in array v_admin loop
    if not exists (select 1 from public.marketing_pic_aliases where alias = a and pic_role = 'admin') then raise exception 'PIC Admin % belum terdaftar', a; end if;
  end loop;
  if v_id is null then
    insert into public.marketing_clients(source_no, nama_client, cabang, pic_user, nomor_hp, korlap_raw, admin_raw, google_maps, kategori, masa_kontrak, updated_by)
    values ((select coalesce(max(source_no),0)+1 from public.marketing_clients), v_name, trim(coalesce(p->>'cabang','')), trim(coalesce(p->>'pic_user','')),
            trim(coalesce(p->>'nomor_hp','')), array_to_string(v_korlap, ', '), array_to_string(v_admin, ', '), trim(coalesce(p->>'google_maps','')),
            v_kategori, trim(coalesce(p->>'masa_kontrak','')), auth.uid())
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
      updated_at=now(), updated_by=auth.uid()
    where id = v_id returning * into v_row;
  end if;
  delete from public.marketing_client_pics where client_id = v_row.id;
  insert into public.marketing_client_pics(client_id, alias, pic_role) select v_row.id, x, 'korlap' from unnest(v_korlap) x on conflict do nothing;
  insert into public.marketing_client_pics(client_id, alias, pic_role) select v_row.id, x, 'admin' from unnest(v_admin) x on conflict do nothing;
  v_after := to_jsonb(v_row) || jsonb_build_object('korlap', to_jsonb(v_korlap), 'admin', to_jsonb(v_admin));
  insert into public.marketing_client_changes(client_id, changed_by, action, before, after) values (v_row.id, auth.uid(), case when v_id is null then 'create' else 'update' end, v_before, v_after);
  return to_jsonb(v_row);
end $$;

create or replace function public.marketing_set_pic_alias(p_alias text, p_role text, p_user_id uuid, p_note text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare v_alias text := upper(trim(coalesce(p_alias,'')));
begin
  if not public.marketing_is_admin() then raise exception 'Hanya admin yang boleh mengubah pemetaan PIC' using errcode = '42501'; end if;
  if v_alias = '' or length(v_alias) > 60 then raise exception 'Nama PIC wajib diisi (maksimal 60 karakter)'; end if;
  if p_role not in ('korlap','admin') then raise exception 'Peran PIC tidak valid'; end if;
  if p_user_id is not null and not exists (select 1 from public.marketing_members where user_id = p_user_id and active) then raise exception 'Akun tidak ditemukan atau nonaktif'; end if;
  insert into public.marketing_pic_aliases(alias, pic_role, user_id, note) values (v_alias, p_role, p_user_id, left(coalesce(p_note,''),200))
  on conflict (alias, pic_role) do update set user_id = excluded.user_id, note = case when p_note is null then public.marketing_pic_aliases.note else excluded.note end;
  insert into public.marketing_client_changes(changed_by, action, after) values (auth.uid(), 'alias', jsonb_build_object('alias', v_alias, 'role', p_role, 'user_id', p_user_id));
end $$;

revoke all on function public.marketing_save_client(jsonb), public.marketing_set_pic_alias(text,text,uuid,text) from public, anon;
grant execute on function public.marketing_save_client(jsonb), public.marketing_set_pic_alias(text,text,uuid,text) to authenticated;
