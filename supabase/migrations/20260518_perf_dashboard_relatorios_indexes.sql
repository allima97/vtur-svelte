-- 2026-05-18: índices focados em carregamento de dashboards e relatórios.
-- Estes índices cobrem filtros recorrentes de período, empresa, vendedor e
-- dados auxiliares usados por widgets e relatórios analíticos.

do $$
begin
  if to_regclass('public.viagens') is not null then
    execute 'create index if not exists idx_viagens_company_data_inicio on public.viagens (company_id, data_inicio)';
    execute 'create index if not exists idx_viagens_company_data_fim_desc on public.viagens (company_id, data_fim desc) where data_fim is not null';
    execute 'create index if not exists idx_viagens_responsavel_data_inicio on public.viagens (responsavel_user_id, data_inicio) where responsavel_user_id is not null';
    execute 'create index if not exists idx_viagens_venda_id on public.viagens (venda_id) where venda_id is not null';
    execute 'create index if not exists idx_viagens_followup_lookup on public.viagens (company_id, follow_up_fechado, data_fim desc) where data_fim is not null';
  end if;

  if to_regclass('public.clientes') is not null then
    execute 'create index if not exists idx_clientes_company_nascimento on public.clientes (company_id, nascimento) where nascimento is not null';
  end if;

  if to_regclass('public.cliente_acompanhantes') is not null then
    execute 'create index if not exists idx_cliente_acompanhantes_company_nascimento on public.cliente_acompanhantes (company_id, data_nascimento) where ativo = true and data_nascimento is not null';
    execute 'create index if not exists idx_cliente_acompanhantes_cliente on public.cliente_acompanhantes (cliente_id) where cliente_id is not null';
  end if;

  if to_regclass('public.metas_vendedor') is not null then
    execute 'create index if not exists idx_metas_vendedor_ativo_periodo on public.metas_vendedor (vendedor_id, periodo) where ativo = true';
  end if;

  if to_regclass('public.vendas_pagamentos') is not null then
    execute 'create index if not exists idx_vendas_pagamentos_venda_id on public.vendas_pagamentos (venda_id) where venda_id is not null';
    execute 'create index if not exists idx_vendas_pagamentos_company_created_at on public.vendas_pagamentos (company_id, created_at desc) where company_id is not null and created_at is not null';
  end if;

  if to_regclass('public.caixa_movimentacoes') is not null then
    execute 'create index if not exists idx_caixa_movimentacoes_company_data on public.caixa_movimentacoes (company_id, data_movimentacao desc) where company_id is not null and data_movimentacao is not null';
  end if;

  if to_regclass('public.vendas') is not null then
    execute 'create index if not exists idx_vendas_company_data_venda on public.vendas (company_id, data_venda desc) where company_id is not null and data_venda is not null';
    execute 'create index if not exists idx_vendas_vendedor_data_venda on public.vendas (vendedor_id, data_venda desc) where vendedor_id is not null and data_venda is not null';
    execute 'create index if not exists idx_vendas_cliente_data_venda on public.vendas (cliente_id, data_venda desc) where cliente_id is not null and data_venda is not null';
  end if;

  if to_regclass('public.vendas_recibos') is not null then
    execute 'create index if not exists idx_vendas_recibos_venda_produto on public.vendas_recibos (venda_id, produto_id) where venda_id is not null';
    execute 'create index if not exists idx_vendas_recibos_produto_resolvido on public.vendas_recibos (produto_resolvido_id) where produto_resolvido_id is not null';
    execute 'create index if not exists idx_vendas_recibos_destino_cidade on public.vendas_recibos (destino_cidade_id) where destino_cidade_id is not null';
  end if;

  if to_regclass('public.quote') is not null then
    execute 'create index if not exists idx_quote_created_at_desc on public.quote (created_at desc) where created_at is not null';
    execute 'create index if not exists idx_quote_created_by_created_at on public.quote (created_by, created_at desc) where created_by is not null';
    execute 'create index if not exists idx_quote_client_id on public.quote (client_id) where client_id is not null';
    execute 'create index if not exists idx_quote_status_created_at on public.quote (status_negociacao, created_at desc) where status_negociacao is not null and created_at is not null';
    execute 'create index if not exists idx_quote_last_interaction_at on public.quote (last_interaction_at desc) where last_interaction_at is not null';
  end if;

  if to_regclass('public.quote_item') is not null then
    execute 'create index if not exists idx_quote_item_quote_order_perf on public.quote_item (quote_id, order_index) where quote_id is not null';
    execute 'create index if not exists idx_quote_item_cidade_id on public.quote_item (cidade_id) where cidade_id is not null';
  end if;

  if to_regclass('public.quote_item_segment') is not null then
    execute 'create index if not exists idx_quote_item_segment_item_order on public.quote_item_segment (quote_item_id, order_index) where quote_item_id is not null';
  end if;

  if to_regclass('public.consultorias_online') is not null then
    execute 'create index if not exists idx_consultorias_online_created_by_data on public.consultorias_online (created_by, data_hora) where fechada = false';
  end if;

  if to_regclass('public.users') is not null then
    execute 'create index if not exists idx_users_company_active_individual on public.users (company_id, active, uso_individual) where company_id is not null';
  end if;

  if to_regclass('public.paises') is not null then
    execute 'create index if not exists idx_paises_nome on public.paises (nome)';
  end if;

  if to_regclass('public.subdivisoes') is not null then
    execute 'create index if not exists idx_subdivisoes_nome on public.subdivisoes (nome)';
    execute 'create index if not exists idx_subdivisoes_pais_nome on public.subdivisoes (pais_id, nome) where pais_id is not null';
  end if;

  if to_regclass('public.cidades') is not null then
    execute 'create index if not exists idx_cidades_nome on public.cidades (nome)';
    execute 'create index if not exists idx_cidades_subdivisao_nome on public.cidades (subdivisao_id, nome) where subdivisao_id is not null';
  end if;

  if to_regclass('public.tipo_produtos') is not null then
    execute 'create index if not exists idx_tipo_produtos_ativo_nome on public.tipo_produtos (ativo, nome)';
  end if;

  if to_regclass('public.produtos') is not null then
    execute 'create index if not exists idx_produtos_nome on public.produtos (nome)';
  end if;

  if to_regclass('public.metas_vendedor_produto') is not null then
    execute 'create index if not exists idx_metas_vendedor_produto_meta on public.metas_vendedor_produto (meta_vendedor_id) where meta_vendedor_id is not null';
    execute 'create index if not exists idx_metas_vendedor_produto_produto on public.metas_vendedor_produto (produto_id) where produto_id is not null';
  end if;
end $$;
