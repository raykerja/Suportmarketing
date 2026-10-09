-- Admin dapat mengganti nama tampilan staf (folder Drive sudah lewat Edge Function set_folder). Dicatat di marketing_client_changes.
create or replace function public.marketing_set_member_name(p_user_id uuid, p_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_name text := trim(coalesce(p_name,'')); v_old text;
begin
  if not public.marketing_is_admin() then raise exception 'Hanya admin yang boleh mengubah nama staf' using errcode = '42501'; end if;
  if v_name = '' or length(v_name) > 100 then raise exception 'Nama wajib diisi (maksimal 100 karakter)'; end if;
  select display_name into v_old from public.marketing_members where user_id = p_user_id for update;
  if not found then raise exception 'Akun tidak ditemukan'; end if;
  update public.marketing_members set display_name = v_name, updated_at = now() where user_id = p_user_id;
  insert into public.marketing_client_changes(changed_by, action, before, after)
  values (auth.uid(), 'member_name', jsonb_build_object('user_id', p_user_id, 'display_name', v_old), jsonb_build_object('user_id', p_user_id, 'display_name', v_name));
end $$;
revoke all on function public.marketing_set_member_name(uuid, text) from public, anon;
grant execute on function public.marketing_set_member_name(uuid, text) to authenticated;
