-- 2026-05-18: índices para caminhos quentes da listagem de vendas.
-- A tela /vendas pagina por data e filtra status derivado de cancelada,
-- data_final e data_embarque. Estes índices reduzem scans em bases grandes.

do $$
begin
  if to_regclass('public.vendas') is not null then
    execute 'create index if not exists idx_vendas_company_cancelada_data_venda on public.vendas (company_id, cancelada, data_venda desc) where company_id is not null and data_venda is not null';
    execute 'create index if not exists idx_vendas_vendedor_cancelada_data_venda on public.vendas (vendedor_id, cancelada, data_venda desc) where vendedor_id is not null and data_venda is not null';
    execute 'create index if not exists idx_vendas_company_data_final_aberta on public.vendas (company_id, data_final) where company_id is not null and cancelada = false and data_final is not null';
    execute 'create index if not exists idx_vendas_company_data_embarque_aberta on public.vendas (company_id, data_embarque) where company_id is not null and cancelada = false and data_embarque is not null';
  end if;
end $$;
