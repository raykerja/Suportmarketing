-- REKAP RAB: daftar bebas link Spreadsheet RAB final (nama + link), dikelola admin, dibaca semua staf aktif.
create table public.marketing_rab_recap (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (length(trim(nama)) between 1 and 200),
  link text not null check (link ~ '^https://'),
  catatan text not null default '' check (length(catatan) <= 300),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index marketing_rab_recap_nama_idx on public.marketing_rab_recap (nama);

alter table public.marketing_rab_recap enable row level security;
create policy "rab recap team read" on public.marketing_rab_recap for select to authenticated using (
  exists (select 1 from public.marketing_members m where m.user_id = auth.uid() and m.active)
);
revoke all on public.marketing_rab_recap from anon, authenticated;
grant select on public.marketing_rab_recap to authenticated;

-- Tambah/ubah hanya lewat RPC ini; cek admin di dalam fungsi (security definer), bukan lewat grant INSERT/UPDATE langsung.
create or replace function public.marketing_save_rab_recap(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := nullif(p->>'id','')::uuid;
  v_nama text := trim(coalesce(p->>'nama',''));
  v_link text := trim(coalesce(p->>'link',''));
  v_catatan text := left(trim(coalesce(p->>'catatan','')), 300);
  v_row public.marketing_rab_recap;
  v_before jsonb;
begin
  if not public.marketing_is_admin() then raise exception 'Hanya admin yang boleh mengubah REKAP RAB' using errcode = '42501'; end if;
  if v_nama = '' or length(v_nama) > 200 then raise exception 'Nama wajib diisi (maksimal 200 karakter)'; end if;
  if v_link !~ '^https://' then raise exception 'Link Spreadsheet wajib diawali https://'; end if;
  if v_id is null then
    insert into public.marketing_rab_recap(nama, link, catatan, created_by, updated_by)
    values (v_nama, v_link, v_catatan, auth.uid(), auth.uid())
    returning * into v_row;
  else
    select to_jsonb(x) into v_before from public.marketing_rab_recap x where id = v_id for update;
    if v_before is null then raise exception 'Entri tidak ditemukan'; end if;
    if p ? 'expected_updated_at' and (v_before->>'updated_at')::timestamptz <> (p->>'expected_updated_at')::timestamptz then
      raise exception 'Entri ini sudah diubah orang lain. Muat ulang lalu ulangi perubahan.' using errcode = '40001';
    end if;
    update public.marketing_rab_recap set nama = v_nama, link = v_link, catatan = v_catatan, updated_at = now(), updated_by = auth.uid()
    where id = v_id returning * into v_row;
  end if;
  return to_jsonb(v_row);
end $$;
revoke all on function public.marketing_save_rab_recap(jsonb) from public, anon;
grant execute on function public.marketing_save_rab_recap(jsonb) to authenticated;

create or replace function public.marketing_delete_rab_recap(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.marketing_is_admin() then raise exception 'Hanya admin yang boleh menghapus REKAP RAB' using errcode = '42501'; end if;
  delete from public.marketing_rab_recap where id = p_id;
end $$;
revoke all on function public.marketing_delete_rab_recap(uuid) from public, anon;
grant execute on function public.marketing_delete_rab_recap(uuid) to authenticated;
