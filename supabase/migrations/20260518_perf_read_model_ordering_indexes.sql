-- 2026-05-18: índices de leitura ordenada do read model de recibos.
-- Os dashboards e relatórios paginam ranking_recibo_contribuicoes por período
-- ordenando por data_recibo/id. Estes compostos evitam sort/scan grande quando
-- o escopo é empresa, vendedor ou cliente.

do $$
begin
  if to_regclass('public.ranking_recibo_contribuicoes') is not null then
    execute 'create index if not exists idx_ranking_recibo_contribuicoes_company_data_id on public.ranking_recibo_contribuicoes (company_id, data_recibo, id)';
    execute 'create index if not exists idx_ranking_recibo_contribuicoes_company_vendedor_data_id on public.ranking_recibo_contribuicoes (company_id, vendedor_id, data_recibo, id) where vendedor_id is not null';
    execute 'create index if not exists idx_ranking_recibo_contribuicoes_company_cliente_data_id on public.ranking_recibo_contribuicoes (company_id, cliente_id, data_recibo, id) where cliente_id is not null';
  end if;
end $$;
