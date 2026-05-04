-- 2026-05-04: rate limit distribuido para rotas publicas sensiveis.
-- O rate limiter em memoria continua como fallback local, mas este RPC
-- centraliza contadores no Postgres para ambientes serverless/Cloudflare.

create extension if not exists pgcrypto;

create table if not exists public.security_rate_limits (
  id text primary key,
  scope text not null,
  key_hash text not null,
  count integer not null default 0,
  reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists security_rate_limits_reset_at_idx
  on public.security_rate_limits (reset_at);

alter table public.security_rate_limits enable row level security;

revoke all on table public.security_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.security_rate_limits to service_role;

create or replace function public.check_security_rate_limit(
  p_scope text,
  p_key text,
  p_max integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  retry_after_seconds integer,
  current_count integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_scope text := left(coalesce(nullif(trim(p_scope), ''), 'default'), 80);
  v_key text := coalesce(p_key, 'unknown');
  v_max integer := greatest(1, least(coalesce(p_max, 10), 10000));
  v_window_seconds integer := greatest(1, least(coalesce(p_window_seconds, 60), 3600));
  v_id text := v_scope || ':' || encode(digest(v_key, 'sha256'), 'hex');
  v_count integer;
  v_reset_at timestamptz;
begin
  if random() < 0.01 then
    delete from public.security_rate_limits
    where reset_at < now() - interval '1 day';
  end if;

  insert into public.security_rate_limits as rl (
    id,
    scope,
    key_hash,
    count,
    reset_at,
    updated_at
  )
  values (
    v_id,
    v_scope,
    encode(digest(v_key, 'sha256'), 'hex'),
    1,
    now() + (v_window_seconds * interval '1 second'),
    now()
  )
  on conflict (id) do update
  set
    count = case
      when rl.reset_at <= now() then 1
      else rl.count + 1
    end,
    reset_at = case
      when rl.reset_at <= now() then now() + (v_window_seconds * interval '1 second')
      else rl.reset_at
    end,
    updated_at = now()
  returning rl.count, rl.reset_at
  into v_count, v_reset_at;

  return query
  select
    v_count <= v_max,
    case
      when v_count <= v_max then 0
      else greatest(1, ceil(extract(epoch from (v_reset_at - now())))::integer)
    end,
    v_count,
    v_reset_at;
end;
$$;

revoke execute on function public.check_security_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.check_security_rate_limit(text, text, integer, integer)
  to service_role;
