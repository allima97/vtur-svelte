-- Add explicit is_baixa_rac flag to conciliacao_recibos
-- This replaces the pattern of using a special "Baixa RAC" user in ranking_vendedor_id

alter table public.conciliacao_recibos
  add column if not exists is_baixa_rac boolean not null default false;

-- Create index for performance on queries filtering by is_baixa_rac
create index if not exists conciliacao_recibos_is_baixa_rac_idx
  on public.conciliacao_recibos (company_id, is_baixa_rac, movimento_data);

-- Create composite index for common filter patterns
create index if not exists conciliacao_recibos_ranking_status_idx
  on public.conciliacao_recibos (company_id, is_baixa_rac, ranking_vendedor_id, status, movimento_data);
