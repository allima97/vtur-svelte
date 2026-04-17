-- Migration: 20260409_vendas_recibos_numero_normalizado.sql
-- Adiciona coluna `numero_recibo_normalizado` em `vendas_recibos`,
-- popula com backfill dos registros existentes e cria índice para
-- matching eficiente na conciliação.
--
-- Regra de normalização:
--   remove qualquer caractere que não seja [A-Z0-9] (após upper).
-- Exemplos:
--   "5630-0000083899" -> "56300000083899"
--   "REC-ABC-77"      -> "RECABC77"
--   "56300000083899"  -> "56300000083899"

-- 1. Adiciona coluna (nullable, preenchida pelo trigger/backfill)
alter table public.vendas_recibos
  add column if not exists numero_recibo_normalizado text;

-- 2. Backfill dos registros existentes
update public.vendas_recibos
set numero_recibo_normalizado = upper(regexp_replace(numero_recibo, '[^A-Z0-9]', '', 'gi'))
where numero_recibo is not null
  and (numero_recibo_normalizado is null or numero_recibo_normalizado = '');

-- 3. Índice para lookup rápido na conciliação
create index if not exists idx_vendas_recibos_numero_normalizado
  on public.vendas_recibos (numero_recibo_normalizado)
  where numero_recibo_normalizado is not null;

-- 4. Trigger para manter a coluna atualizada automaticamente em INSERT/UPDATE
create or replace function public.fn_vendas_recibos_normalize_numero()
returns trigger
language plpgsql
as $$
begin
  if new.numero_recibo is not null then
    new.numero_recibo_normalizado := upper(regexp_replace(new.numero_recibo, '[^A-Z0-9]', '', 'gi'));
  else
    new.numero_recibo_normalizado := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_vendas_recibos_normalize_numero on public.vendas_recibos;
create trigger trg_vendas_recibos_normalize_numero
  before insert or update of numero_recibo
  on public.vendas_recibos
  for each row execute function public.fn_vendas_recibos_normalize_numero();
