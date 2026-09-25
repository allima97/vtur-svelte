-- Limite de tentativas persistente (compartilhado entre instâncias do Worker).
-- Usado por src/lib/server/persistentRateLimit.ts:
--   rpc('check_security_rate_limit', { p_scope, p_key, p_max, p_window_seconds })
--   → { allowed boolean, retry_after_seconds integer }
-- Mesma regra do contador em memória (src/lib/server/rateLimit.ts): janela fixa que começa
-- na primeira chamada; permite até p_max chamadas na janela; depois responde allowed=false
-- com o tempo que falta para a janela acabar (mínimo 1 s).
-- A chave (IP ou id do usuário) é gravada só como hash md5.

create table if not exists public.security_rate_limits (
  scope text not null,
  key_hash text not null,
  window_start timestamptz not null default now(),
  expires_at timestamptz not null,
  hits integer not null default 0,
  primary key (scope, key_hash)
);

create index if not exists security_rate_limits_expires_at_idx
  on public.security_rate_limits (expires_at);

alter table public.security_rate_limits enable row level security;
-- Sem políticas: só o dono da função (SECURITY DEFINER) e o service_role acessam.
revoke all on table public.security_rate_limits from anon, authenticated;

create or replace function public.check_security_rate_limit(
  p_scope text,
  p_key text,
  p_max integer,
  p_window_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window interval := make_interval(secs => greatest(1, coalesce(p_window_seconds, 60)));
  v_max integer := greatest(1, coalesce(p_max, 1));
  v_scope text := left(coalesce(nullif(btrim(p_scope), ''), 'default'), 120);
  v_key text := md5(coalesce(nullif(btrim(p_key), ''), 'unknown'));
  v_hits integer;
  v_expires timestamptz;
begin
  insert into public.security_rate_limits as t (scope, key_hash, window_start, expires_at, hits)
  values (v_scope, v_key, v_now, v_now + v_window, 1)
  on conflict (scope, key_hash) do update
    set window_start = case when t.expires_at <= v_now then v_now else t.window_start end,
        expires_at   = case when t.expires_at <= v_now then v_now + v_window else t.expires_at end,
        hits         = case when t.expires_at <= v_now then 1 else least(t.hits + 1, v_max + 1) end
  returning t.hits, t.expires_at into v_hits, v_expires;

  -- Limpeza ocasional de janelas vencidas (1 em cada ~50 chamadas).
  if random() < 0.02 then
    delete from public.security_rate_limits where expires_at < v_now - interval '10 minutes';
  end if;

  if v_hits <= v_max then
    return query select true, 0;
  else
    return query select false, greatest(1, ceil(extract(epoch from (v_expires - v_now)))::integer);
  end if;
end;
$$;

revoke all on function public.check_security_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_security_rate_limit(text, text, integer, integer) to service_role;
