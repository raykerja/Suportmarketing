-- Rincian RAB (gaji, BPJS, fee, pajak) — data margin/harga internal, admin-only.
-- Disimpan satu kolom jsonb (bukan puluhan kolom) karena murni untuk tampilan form, tidak difilter/diurutkan.
alter table public.marketing_rab_recap
  add column if not exists rincian jsonb not null default '{}'::jsonb check (jsonb_typeof(rincian) = 'object');

-- Staf non-admin tetap baca Nama/Link/Catatan/Durasi/Nilai kontrak (submenu Rekapitulasi RAB) lewat VIEW ini,
-- tapi kolom rincian dikosongkan (null) kalau bukan admin. RLS pada tabel asli tidak bisa menutup satu kolom
-- saja (hanya per baris), jadi masking dilakukan di VIEW + WHERE di bawah mengulang cek "anggota tim aktif"
-- secara eksplisit (VIEW berjalan sebagai pemilik VIEW, bukan pemanggil, jadi tidak otomatis ikut RLS tabel asli).
create or replace view public.marketing_rab_recap_view
  with (security_barrier = true) as
select id, nama, link, catatan, durasi_kontrak, nilai_kontrak, created_at, updated_at, created_by, updated_by,
  case when public.marketing_is_admin() then rincian else null end as rincian
from public.marketing_rab_recap
where exists (select 1 from public.marketing_members m where m.user_id = auth.uid() and m.active);

revoke select on public.marketing_rab_recap from authenticated;
revoke all on public.marketing_rab_recap_view from anon, authenticated;
grant select on public.marketing_rab_recap_view to authenticated;

create or replace function public.marketing_save_rab_recap(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := nullif(p->>'id','')::uuid;
  v_nama text := trim(coalesce(p->>'nama',''));
  v_link text := trim(coalesce(p->>'link',''));
  v_catatan text := left(trim(coalesce(p->>'catatan','')), 300);
  v_durasi text := left(trim(coalesce(p->>'durasi_kontrak','')), 100);
  v_nilai bigint := coalesce((p->>'nilai_kontrak')::bigint, 0);
  v_rincian jsonb := case when jsonb_typeof(p->'rincian') = 'object' then p->'rincian' else '{}'::jsonb end;
  v_row public.marketing_rab_recap;
  v_before jsonb;
begin
  if not public.marketing_is_admin() then raise exception 'Hanya admin yang boleh mengubah REKAP RAB' using errcode = '42501'; end if;
  if v_nama = '' or length(v_nama) > 200 then raise exception 'Nama wajib diisi (maksimal 200 karakter)'; end if;
  if v_link !~ '^https://' then raise exception 'Link Spreadsheet wajib diawali https://'; end if;
  if v_nilai < 0 or v_nilai > 1000000000000 then raise exception 'Nilai kontrak tidak valid'; end if;
  if v_id is null then
    insert into public.marketing_rab_recap(nama, link, catatan, durasi_kontrak, nilai_kontrak, rincian, created_by, updated_by)
    values (v_nama, v_link, v_catatan, v_durasi, v_nilai, v_rincian, auth.uid(), auth.uid())
    returning * into v_row;
  else
    select to_jsonb(x) into v_before from public.marketing_rab_recap x where id = v_id for update;
    if v_before is null then raise exception 'Entri tidak ditemukan'; end if;
    if p ? 'expected_updated_at' and (v_before->>'updated_at')::timestamptz <> (p->>'expected_updated_at')::timestamptz then
      raise exception 'Entri ini sudah diubah orang lain. Muat ulang lalu ulangi perubahan.' using errcode = '40001';
    end if;
    update public.marketing_rab_recap set nama = v_nama, link = v_link, catatan = v_catatan,
      durasi_kontrak = v_durasi, nilai_kontrak = v_nilai, rincian = v_rincian, updated_at = now(), updated_by = auth.uid()
    where id = v_id returning * into v_row;
  end if;
  return to_jsonb(v_row);
end $$;
revoke all on function public.marketing_save_rab_recap(jsonb) from public, anon;
grant execute on function public.marketing_save_rab_recap(jsonb) to authenticated;
