-- MIGRATION: Add payment form filtration to KPI RPCs
-- Fixes: KPI totals were including non-commissioned payment forms (Crédito Diversos, Vale Viagem, etc)
-- Version: 2026-04-07
-- Severity: CRITICAL - Affects dashboard, KPIs, commissions

-- ================================
-- HELPER FUNCTION: Check if payment form is non-commissioned
-- ================================
drop function if exists public.is_forma_pagamento_nao_comissionavel(text);
create or replace function public.is_forma_pagamento_nao_comissionavel(forma_nome text)
returns boolean
language sql
stable
as $$
  select coalesce(
    exists(
      select 1
      from public.parametros_pagamentos_nao_comissionaveis
      where ativo = true
        and (
          -- Match exact normalized term or partial word match
          normalize(forma_nome) ilike '%' || termo_normalizado || '%'
          or forma_nome ilike '%' || termo || '%'
        )
      limit 1
    ),
    false
  );
$$;

-- ================================
-- HELPER FUNCTION: Calculate commissioned amount for a sale
-- Deducts non-commissioned payment amounts from total
-- ================================
drop function if exists public.calculate_venda_comissionada_amount(uuid);
create or replace function public.calculate_venda_comissionada_amount(venda_id_param uuid)
returns numeric
language sql
stable
as $$
  select coalesce(
    v.valor_total - coalesce(
      (
        select coalesce(sum(coalesce(vp.valor_total, 0)), 0)
        from public.vendas_pagamentos vp
        where vp.venda_id = venda_id_param
          and is_forma_pagamento_nao_comissionavel(coalesce(vp.forma_nome, ''))
      ),
      0
    ),
    0
  )
  from public.vendas v
  where v.id = venda_id_param
$$;

-- ================================
-- UPDATE: rpc_vendas_kpis
-- Now filters non-commissioned payment forms from totals
-- ================================
drop function if exists public.rpc_vendas_kpis(uuid, date, date);
create or replace function public.rpc_vendas_kpis(
  company_id_param uuid,
  data_inicio date,
  data_fim date
)
returns table (
  total_vendas numeric,
  total_taxas numeric,
  total_liquido numeric,
  contador_vendas integer,
  valor_medio numeric
)
language sql
stable
as $$
  with vendas_filtradas as (
    select
      v.id,
      v.valor_total,
      v.taxa_valor,
      (v.valor_total - coalesce(v.taxa_valor, 0)) as valor_liquido,
      -- Calculate commissioned amount (deduct non-commissioned payment forms)
      coalesce(
        v.valor_total - coalesce(
          (
            select coalesce(sum(coalesce(vp.valor_total, 0)), 0)
            from public.vendas_pagamentos vp
            where vp.venda_id = v.id
              and is_forma_pagamento_nao_comissionavel(coalesce(vp.forma_nome, ''))
          ),
          0
        ),
        0
      ) as valor_comissionado
    from public.vendas v
    where v.company_id = company_id_param
      and v.cancelada = false
      and v.data_venda >= data_inicio
      and v.data_venda <= data_fim
      -- Exclude low RAC receipts
      and not exists (
        select 1
        from public.conciliacao_recibos cr
        where cr.venda_id = v.id
          and cr.is_baixa_rac = true
      )
  )
  select
    coalesce(sum(valor_comissionado), 0)::numeric as total_vendas,
    coalesce(sum(taxa_valor), 0)::numeric as total_taxas,
    coalesce(sum(valor_comissionado - coalesce(taxa_valor, 0)), 0)::numeric as total_liquido,
    count(*)::integer as contador_vendas,
    case when count(*) > 0 then coalesce(sum(valor_comissionado), 0) / count(*) else 0 end::numeric as valor_medio
  from vendas_filtradas;
$$;

-- ================================
-- UPDATE: rpc_dashboard_vendas_summary
-- Now includes non-commissioned payment deductions in calculations
-- ================================
drop function if exists public.rpc_dashboard_vendas_summary(uuid);
create or replace function public.rpc_dashboard_vendas_summary(company_id_param uuid)
returns table (
  mes integer,
  ano integer,
  total_vendas numeric,
  total_taxas numeric,
  total_liquido numeric,
  meta_vendas numeric,
  percentual_meta numeric,
  contador_vendas integer
)
language sql
stable
as $$
  with vendas_por_mes as (
    select
      extract(month from v.data_venda)::integer as mes,
      extract(year from v.data_venda)::integer as ano,
      v.id,
      v.valor_total,
      v.taxa_valor,
      -- Calculate commissioned amount
      coalesce(
        v.valor_total - coalesce(
          (
            select coalesce(sum(coalesce(vp.valor_total, 0)), 0)
            from public.vendas_pagamentos vp
            where vp.venda_id = v.id
              and is_forma_pagamento_nao_comissionavel(coalesce(vp.forma_nome, ''))
          ),
          0
        ),
        0
      ) as valor_comissionado
    from public.vendas v
    where v.company_id = company_id_param
      and v.cancelada = false
      -- Exclude low RAC receipts
      and not exists (
        select 1
        from public.conciliacao_recibos cr
        where cr.venda_id = v.id
          and cr.is_baixa_rac = true
      )
  ),
  meses_anos as (
    select distinct mes, ano from vendas_por_mes
  ),
  vendas_agregadas as (
    select
      m.mes,
      m.ano,
      coalesce(sum(v.valor_comissionado), 0)::numeric as total_comissionado,
      coalesce(sum(v.taxa_valor), 0)::numeric as total_taxa,
      coalesce(sum(v.valor_comissionado - coalesce(v.taxa_valor, 0)), 0)::numeric as total_liq,
      count(v.id)::integer as contador
    from meses_anos m
    left join vendas_por_mes v on v.mes = m.mes and v.ano = m.ano
    group by m.mes, m.ano
  ),
  metas as (
    select
      extract(month from mv.mes)::integer as mes,
      extract(year from mv.mes)::integer as ano,
      coalesce(mv.valor_meta, 0)::numeric as valor_meta
    from public.metas_vendedor mv
    where mv.company_id = company_id_param
  )
  select
    va.mes,
    va.ano,
    va.total_comissionado as total_vendas,
    va.total_taxa as total_taxas,
    va.total_liq as total_liquido,
    coalesce(m.valor_meta, 0)::numeric as meta_vendas,
    case
      when coalesce(m.valor_meta, 0) > 0 then (va.total_comissionado / m.valor_meta * 100)::numeric
      else 0
    end as percentual_meta,
    va.contador as contador_vendas
  from vendas_agregadas va
  left join metas m on m.mes = va.mes and m.ano = va.ano
  order by va.ano desc, va.mes desc;
$$;

-- ================================
-- VALIDATION: Test that non-commissioned forms are properly filtered
-- ================================
-- After applying migration, run:
-- SELECT * FROM rpc_vendas_kpis('YOUR_COMPANY_ID', '2026-04-01'::date, '2026-04-30'::date);
-- SELECT * FROM rpc_dashboard_vendas_summary('YOUR_COMPANY_ID');
--
-- Verify that totals exclude payments from Crédito Diversos, Vale Viagem, etc.
