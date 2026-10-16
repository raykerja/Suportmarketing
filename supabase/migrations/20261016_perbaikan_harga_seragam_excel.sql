-- Perbaikan harga kategori 'seragam' agar sesuai acuan "DAFTRAR HARGA SERAGAM.xlsx"
-- (dibandingkan dengan data live 2026-10-16; kategori 'peralatan' TIDAK disentuh --
-- belum ada file Excel acuan untuk peralatan). Harga lama disimpan di harga_jual_lama
-- dan setiap perubahan dicatat di marketing_client_changes untuk audit.
do $$
declare
  rec record;
  v_before jsonb;
  v_after jsonb;
begin
  for rec in
    select * from (values
      ('ROMPI BIASA', 120000::bigint),
      ('ROMPI TEBAL JALA', 245000::bigint),
      ('SEPATU PDH DOOF', 205000::bigint),
      ('SEPATU PDH HANDYMAN', 315000::bigint),
      ('TOPI PDL JALA', 40000::bigint),
      ('TOPI PET SAPTAM + EMBLEM', 70000::bigint),
      ('SEPATU PDH DENAWARI', 310000::bigint),
      ('SEPATU SECWAN PDH SUS', 245000::bigint)
    ) as t(item, harga_baru)
  loop
    select to_jsonb(x) into v_before from public.marketing_price_items x
      where kategori = 'seragam' and item = rec.item;
    if v_before is null then
      raise exception 'Item seragam tidak ditemukan: %', rec.item;
    end if;
    update public.marketing_price_items
      set harga_jual_lama = harga_jual, harga_jual = rec.harga_baru, updated_at = now()
      where kategori = 'seragam' and item = rec.item
      returning to_jsonb(marketing_price_items.*) into v_after;
    insert into public.marketing_client_changes(changed_by, action, before, after)
      values (null, 'price', v_before, v_after);
  end loop;
end $$;
