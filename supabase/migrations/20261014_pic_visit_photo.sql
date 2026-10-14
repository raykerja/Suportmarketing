-- Izinkan admin melihat foto di bucket marketing-visit-photos milik akun lain
-- (dipakai juga oleh foto Kunjungan PIC yang disimpan di path <uid>/pic-visits/...).
create policy "marketing visit photo admin read" on storage.objects for select to authenticated
  using (bucket_id='marketing-visit-photos' and public.marketing_is_admin());
