-- Gaji pokok pada RAB boleh berbeda dari UMK setempat. UMK setempat tetap menjadi acuan komponen BPJS; NULL = gaji pokok sama dengan UMK.
alter table public.marketing_offers
  add column if not exists gaji_pokok bigint check (gaji_pokok is null or gaji_pokok between 1 and 1000000000);
