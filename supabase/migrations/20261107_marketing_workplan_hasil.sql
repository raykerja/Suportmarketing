-- Dashboard Workplan Marketing: Hasil Kunjungan bisa dipilih manual per baris rencana (Positif /
-- Proses / Tidak Lanjut) lewat dropdown di tabel "Daftar Workplan & Laporan Kunjungan", untuk
-- baris yang belum (atau tidak bisa) dicocokkan otomatis ke laporan Kunjungan Marketing nyata.
-- workplan_id mengacu ke id baris statis di WORKPLAN_BASE (app.js) — bukan foreign key ke tabel
-- lain, karena data workplan-nya sendiri masih snapshot statis, bukan tabel Supabase.
create table public.marketing_workplan_hasil (
  workplan_id integer primary key,
  hasil text not null check (hasil in ('Positif', 'Proses', 'Tidak Lanjut')),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.marketing_workplan_hasil enable row level security;

create policy "marketing workplan hasil admin read" on public.marketing_workplan_hasil
  for select to authenticated using (public.marketing_is_admin());

revoke all on public.marketing_workplan_hasil from anon, authenticated;
grant select on public.marketing_workplan_hasil to authenticated;

-- security definer: admin saja yang boleh ubah; p_hasil null = hapus (kembali ke otomatis).
create function public.marketing_set_workplan_hasil(p_workplan_id integer, p_hasil text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.marketing_is_admin() then
    raise exception 'Hanya admin yang bisa mengubah Hasil Kunjungan' using errcode = '42501';
  end if;
  if p_hasil is null then
    delete from public.marketing_workplan_hasil where workplan_id = p_workplan_id;
  else
    if p_hasil not in ('Positif', 'Proses', 'Tidak Lanjut') then
      raise exception 'Hasil tidak valid: %', p_hasil;
    end if;
    insert into public.marketing_workplan_hasil (workplan_id, hasil, updated_by, updated_at)
    values (p_workplan_id, p_hasil, auth.uid(), now())
    on conflict (workplan_id) do update
      set hasil = excluded.hasil, updated_by = auth.uid(), updated_at = now();
  end if;
end $$;
revoke all on function public.marketing_set_workplan_hasil(integer, text) from public, anon;
grant execute on function public.marketing_set_workplan_hasil(integer, text) to authenticated;
