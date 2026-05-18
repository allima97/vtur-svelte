-- 2026-05-18: complementos de performance para caminhos quentes de relatórios.
-- Evita scans grandes em leituras por competência, paginação de detalhes e
-- leitura do read model por vendedor/cliente no dashboard e relatórios.

do $$
begin
  if to_regclass('public.ranking_recibo_contribuicoes') is not null then
    execute 'create index if not exists idx_ranking_recibo_contribuicoes_company_vendedor_data on public.ranking_recibo_contribuicoes (company_id, vendedor_id, data_recibo) where vendedor_id is not null';
    execute 'create index if not exists idx_ranking_recibo_contribuicoes_company_cliente_data on public.ranking_recibo_contribuicoes (company_id, cliente_id, data_recibo) where cliente_id is not null';
  end if;

  if to_regclass('public.vendas_recibos') is not null then
    execute 'create index if not exists idx_vendas_recibos_data_venda_venda on public.vendas_recibos (data_venda, venda_id) where data_venda is not null and venda_id is not null';
    execute 'create index if not exists idx_vendas_recibos_venda_data_venda on public.vendas_recibos (venda_id, data_venda) where venda_id is not null and data_venda is not null';
  end if;

  if to_regclass('public.vendas_pagamentos') is not null then
    execute 'create index if not exists idx_vendas_pagamentos_venda_created_at on public.vendas_pagamentos (venda_id, created_at desc) where venda_id is not null and created_at is not null';
  end if;

  if to_regclass('public.metas_vendedor') is not null then
    execute 'create index if not exists idx_metas_vendedor_periodo_ativo_vendedor on public.metas_vendedor (periodo, vendedor_id) where ativo = true';
  end if;
end $$;
