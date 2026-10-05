-- Penawaran manual memakai generator yang sama tanpa membuat target riset palsu.
-- Metadata isian disimpan untuk audit; dokumen tetap berada di Drive akun.
alter table public.marketing_offers
  alter column lead_id drop not null;

alter table public.marketing_offers
  add column if not exists manual_input jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.marketing_offers'::regclass
      and conname = 'marketing_offers_source_check'
  ) then
    alter table public.marketing_offers
      add constraint marketing_offers_source_check
      check (lead_id is not null or manual_input is not null);
  end if;
end $$;
