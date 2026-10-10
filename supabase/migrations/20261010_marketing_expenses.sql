-- Laporan Pengeluaran Marketing: menu utama ke-4, dapat diisi staf maupun admin.
create table if not exists public.marketing_expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  nama_marketing text not null,
  tanggal_realisasi date not null,
  jenis_pengeluaran text not null,
  nominal numeric(14,2) not null,
  photo_paths text[] not null default '{}',
  constraint marketing_expense_jenis check (jenis_pengeluaran in (
    'Transportasi (BBM/Tol/Parkir)','Akomodasi/Penginapan','Konsumsi',
    'Komunikasi (Pulsa/Internet)','Cetak & Dokumen','Entertain Klien','Lain-lain')),
  constraint marketing_expense_nominal check (nominal > 0 and nominal <= 1000000000),
  constraint marketing_expense_photo_limit check (array_length(photo_paths,1) is null or array_length(photo_paths,1) <= 3)
);
create index if not exists marketing_expenses_owner_date_idx on public.marketing_expenses(owner_id, created_at desc);
alter table public.marketing_expenses enable row level security;
create policy "marketing expenses team read" on public.marketing_expenses for select to authenticated
  using (exists (select 1 from public.marketing_members where user_id=auth.uid() and active)
    and (owner_id=auth.uid() or public.marketing_is_admin()));
revoke all on public.marketing_expenses from anon;
revoke all on public.marketing_expenses from authenticated;
grant select on public.marketing_expenses to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('marketing-expense-photos','marketing-expense-photos',false,10485760,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do nothing;
create policy "marketing expense photo own upload" on storage.objects for insert to authenticated
  with check (bucket_id='marketing-expense-photos' and (storage.foldername(name))[1]=auth.uid()::text
    and exists (select 1 from public.marketing_members where user_id=auth.uid() and active));
create policy "marketing expense photo own read" on storage.objects for select to authenticated
  using (bucket_id='marketing-expense-photos' and (storage.foldername(name))[1]=auth.uid()::text
    and exists (select 1 from public.marketing_members where user_id=auth.uid() and active));
create policy "marketing expense photo admin read" on storage.objects for select to authenticated
  using (bucket_id='marketing-expense-photos' and public.marketing_is_admin());
