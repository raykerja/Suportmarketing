-- Daftar harga seragam & peralatan. Harga beli/modal HANYA untuk admin (RLS tabel). Staf membaca lewat view marketing_price_list yang hanya memuat harga jual.
create table public.marketing_price_items (
  id uuid primary key default gen_random_uuid(),
  kategori text not null check (kategori in ('seragam','peralatan')),
  grup text not null default '',
  no int not null,
  item text not null check (length(trim(item)) between 1 and 200),
  harga_beli_lama bigint check (harga_beli_lama >= 0),
  kenaikan bigint check (kenaikan >= 0),
  harga_beli bigint not null check (harga_beli >= 0),
  harga_jual_lama bigint check (harga_jual_lama >= 0),
  harga_jual bigint not null check (harga_jual >= 0),
  perlu_verifikasi boolean not null default false,
  catatan text not null default '',
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  unique (kategori, no)
);
alter table public.marketing_price_items enable row level security;
create policy "price items admin read" on public.marketing_price_items for select to authenticated using (public.marketing_is_admin());
revoke all on public.marketing_price_items from anon, authenticated;
grant select on public.marketing_price_items to authenticated;

-- View dijalankan sebagai pemilik (melewati RLS tabel) tetapi hanya untuk anggota aktif dan hanya kolom harga jual.
-- Harga jual untuk baris yang ditandai perlu diverifikasi disembunyikan dari staf (null) sampai admin memverifikasi.
create view public.marketing_price_list as
  select p.id, p.kategori, p.grup, p.no, p.item,
         case when p.perlu_verifikasi then null else p.harga_jual end as harga_jual,
         p.perlu_verifikasi
  from public.marketing_price_items p
  where p.active and exists (select 1 from public.marketing_members m where m.user_id = auth.uid() and m.active);
revoke all on public.marketing_price_list from anon, authenticated;
grant select on public.marketing_price_list to authenticated;

create or replace function public.marketing_save_price_item(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := nullif(p->>'id','')::uuid;
  v_kategori text := coalesce(p->>'kategori','');
  v_item text := trim(coalesce(p->>'item',''));
  v_beli bigint := (p->>'harga_beli')::bigint;
  v_jual bigint := (p->>'harga_jual')::bigint;
  v_row public.marketing_price_items; v_before jsonb;
begin
  if not public.marketing_is_admin() then raise exception 'Hanya admin yang boleh mengubah daftar harga' using errcode = '42501'; end if;
  if v_item = '' or length(v_item) > 200 then raise exception 'Nama item wajib diisi (maksimal 200 karakter)'; end if;
  if v_beli is null or v_jual is null or v_beli < 0 or v_jual < 0 then raise exception 'Harga beli dan harga jual wajib berupa angka 0 atau lebih'; end if;
  if v_id is null then
    if v_kategori not in ('seragam','peralatan') then raise exception 'Kategori tidak valid'; end if;
    insert into public.marketing_price_items(kategori, grup, no, item, harga_beli, harga_jual, perlu_verifikasi, catatan, updated_by)
    values (v_kategori, trim(coalesce(p->>'grup','')), (select coalesce(max(no),0)+1 from public.marketing_price_items where kategori = v_kategori), v_item, v_beli, v_jual,
            coalesce((p->>'perlu_verifikasi')::boolean, false), left(trim(coalesce(p->>'catatan','')), 300), auth.uid())
    returning * into v_row;
  else
    select to_jsonb(x) into v_before from public.marketing_price_items x where id = v_id for update;
    if v_before is null then raise exception 'Item tidak ditemukan'; end if;
    if p ? 'expected_updated_at' and (v_before->>'updated_at')::timestamptz <> (p->>'expected_updated_at')::timestamptz then
      raise exception 'Item ini sudah diubah orang lain. Muat ulang lalu ulangi perubahan.' using errcode = '40001';
    end if;
    update public.marketing_price_items set item = v_item, grup = trim(coalesce(p->>'grup', grup)), harga_beli = v_beli, harga_jual = v_jual,
      perlu_verifikasi = coalesce((p->>'perlu_verifikasi')::boolean, perlu_verifikasi), catatan = left(trim(coalesce(p->>'catatan', catatan)), 300),
      active = coalesce((p->>'active')::boolean, active), updated_at = now(), updated_by = auth.uid()
    where id = v_id returning * into v_row;
  end if;
  insert into public.marketing_client_changes(changed_by, action, before, after) values (auth.uid(), 'price', v_before, to_jsonb(v_row));
  return to_jsonb(v_row);
end $$;
revoke all on function public.marketing_save_price_item(jsonb) from public, anon;
grant execute on function public.marketing_save_price_item(jsonb) to authenticated;
