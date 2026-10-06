-- Batas pemakaian AI per akun, menurut tanggal Asia/Jakarta.
-- Diterapkan hanya bersama Edge Function yang memakai OPENAI_API_KEY.
create table if not exists public.marketing_ai_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_day date not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_day)
);

alter table public.marketing_ai_daily_usage enable row level security;
revoke all on public.marketing_ai_daily_usage from anon, authenticated;

create or replace function public.marketing_ai_reserve(p_user_id uuid, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  reserved_count integer;
begin
  if p_user_id is null or p_limit < 1 or p_limit > 100 then
    return false;
  end if;
  insert into public.marketing_ai_daily_usage (user_id, usage_day, request_count)
  values (p_user_id, (now() at time zone 'Asia/Jakarta')::date, 1)
  on conflict (user_id, usage_day) do update
    set request_count = public.marketing_ai_daily_usage.request_count + 1,
        updated_at = now()
    where public.marketing_ai_daily_usage.request_count < p_limit
  returning request_count into reserved_count;
  return reserved_count is not null;
end;
$$;

revoke all on function public.marketing_ai_reserve(uuid, integer) from public, anon, authenticated;
grant execute on function public.marketing_ai_reserve(uuid, integer) to service_role;
