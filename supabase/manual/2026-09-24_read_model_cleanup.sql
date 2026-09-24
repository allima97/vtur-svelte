-- =============================================================================
-- LIMPEZA MANUAL do status do read model (NAO e migration; rodar uma vez,
-- manualmente, DEPOIS do deploy do codigo que usa so o v4).
--
-- O que faz:
--   1. Remove as linhas de status dos modelos legados v1/v2/v3. Os tres
--      gravavam na MESMA tabela ranking_recibo_contribuicoes que o v4 usa;
--      apos o deploy, cron e rebuild pos-venda passam a usar o status v4.
--   2. Linhas v4 presas em 'rebuilding' ha mais de 15 min ou em 'error'
--      voltam para 'dirty', para o proximo acesso/cron reconstruir.
--
-- Nao toca em vendas, recibos, conciliacao ou em ranking_recibo_contribuicoes.
-- =============================================================================

begin;

-- Conferencia antes
select modelo, status, count(*) from public.ranking_read_model_status group by 1, 2 order by 1, 2;

delete from public.ranking_read_model_status
where modelo in ('recibo_contribuicoes_v1', 'recibo_contribuicoes_v2', 'recibo_contribuicoes_v3');

update public.ranking_read_model_status
set status = 'dirty', dirty_at = now(), last_error = null, updated_at = now()
where modelo = 'recibo_contribuicoes_v4'
  and (
    status = 'error'
    or (status = 'rebuilding' and updated_at < now() - interval '15 minutes')
  );

-- Conferencia depois
select modelo, status, count(*) from public.ranking_read_model_status group by 1, 2 order by 1, 2;

commit;
