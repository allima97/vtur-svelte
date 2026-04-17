-- 2026-04-07: Excluir vendas associadas a recibos "Baixa RAC" dos totais de vendas
-- Motivo: Recibos marcados como is_baixa_rac = true não devem ser somados em KPIs, dashboards, consultas de vendas, etc.
-- Isso afeta metas, comissões e rankings, pois essas vendas não contam para o negócio.

-- Atualizar RPC vendas KPIs
create or replace function public.rpc_vendas_kpis(
  p_company_id uuid default null,
  p_vendedor_ids uuid[] default null,
  p_inicio date default null,
  p_fim date default null
)
returns table (
  total_vendas numeric,
  total_taxas numeric,
  total_liquido numeric,
  total_seguro numeric
)
language sql
stable
set search_path = public
as $$
with vendas_base as (
  select v.id, v.valor_total, v.valor_taxas, v.data_venda
  from public.vendas v
  where v.cancelada = false
    and (p_company_id is null or v.company_id = p_company_id)
    and (array_length(p_vendedor_ids, 1) is null or v.vendedor_id = any(p_vendedor_ids))
    -- Excluir vendas associadas a recibos "Baixa RAC"
    and not exists (
      select 1 from public.conciliacao_recibos cr
      where cr.venda_id = v.id and cr.is_baixa_rac = true
    )
),
recibos_all as (
  select
    r.venda_id,
    sum(coalesce(r.valor_total, 0)) as total_bruto_all,
    sum(coalesce(r.valor_taxas, 0)) as total_taxas_all,
    sum(
      case
        when lower(coalesce(tp.tipo, '')) like '%seguro%'
          or lower(coalesce(tp.nome, '')) like '%seguro%'
        then coalesce(r.valor_total, 0)
        else 0
      end
    ) as total_seguro_bruto_all
  from public.vendas_recibos r
  left join public.tipo_produtos tp on tp.id = r.produto_id
  join vendas_base v on v.id = r.venda_id
  group by r.venda_id
),
recibos_period as (
  select
    r.venda_id,
    sum(coalesce(r.valor_total, 0)) as total_bruto_period,
    sum(coalesce(r.valor_taxas, 0)) as total_taxas_period,
    sum(
      case
        when lower(coalesce(tp.tipo, '')) like '%seguro%'
          or lower(coalesce(tp.nome, '')) like '%seguro%'
        then coalesce(r.valor_total, 0)
        else 0
      end
    ) as total_seguro_bruto_period
  from public.vendas_recibos r
  left join public.tipo_produtos tp on tp.id = r.produto_id
  join vendas_base v on v.id = r.venda_id
  where (p_inicio is null or coalesce(r.data_venda, v.data_venda) >= p_inicio)
    and (p_fim is null or coalesce(r.data_venda, v.data_venda) <= p_fim)
  group by r.venda_id
),
sem_recibos_period as (
  -- Vendas sem recibos: mantém competência pela própria venda.
  select
    v.id as venda_id,
    coalesce(v.valor_total, 0) as vendas_total,
    coalesce(v.valor_taxas, 0) as taxas_total,
    0 as seguro_total
  from vendas_base v
  left join recibos_period rp on rp.venda_id = v.id
  where rp.venda_id is null
    and (p_inicio is null or v.data_venda >= p_inicio)
    and (p_fim is null or v.data_venda <= p_fim)
),
com_recibos_period as (
  -- Vendas com recibos: competência pelos recibos no período.
  select
    v.id as venda_id,
    case
      when ra.total_bruto_all > 0 then
        (case
          when rp.total_bruto_period > 0 then rp.total_bruto_period
          else ra.total_bruto_all * (case
            when ra.total_bruto_all > 0 and coalesce(v.valor_total, 0) > 0 then
              least(1, greatest(0, coalesce(v.valor_total, 0) / ra.total_bruto_all))
            else 1
          end)
        end)
      else coalesce(v.valor_total, 0)
    end as vendas_total,
    case
      when ra.total_bruto_all > 0 then
        (case
          when rp.total_bruto_period > 0 then rp.total_taxas_period
          else ra.total_taxas_all * (case
            when ra.total_bruto_all > 0 and coalesce(v.valor_total, 0) > 0 then
              least(1, greatest(0, coalesce(v.valor_total, 0) / ra.total_bruto_all))
            else 1
          end)
        end)
      else coalesce(v.valor_taxas, 0)
    end as taxas_total,
    case
      when ra.total_bruto_all > 0 then
        (case
          when rp.total_bruto_period > 0 then rp.total_seguro_bruto_period
          else ra.total_seguro_bruto_all * (case
            when ra.total_bruto_all > 0 and coalesce(v.valor_total, 0) > 0 then
              least(1, greatest(0, coalesce(v.valor_total, 0) / ra.total_bruto_all))
            else 1
          end)
        end)
      else 0
    end as seguro_total
  from vendas_base v
  join recibos_all ra on ra.venda_id = v.id
  left join recibos_period rp on rp.venda_id = v.id
),
calc as (
  select venda_id, vendas_total, taxas_total, seguro_total from sem_recibos_period
  union all
  select venda_id, vendas_total, taxas_total, seguro_total from com_recibos_period
)
select
  coalesce(sum(vendas_total), 0) as total_vendas,
  coalesce(sum(taxas_total), 0) as total_taxas,
  coalesce(sum(vendas_total), 0) - coalesce(sum(taxas_total), 0) as total_liquido,
  coalesce(sum(seguro_total), 0) as total_seguro
from calc;
$$;

-- Atualizar RPC dashboard vendas summary
create or replace function public.rpc_dashboard_vendas_summary(
  p_company_id uuid default null,
  p_vendedor_ids uuid[] default null,
  p_inicio date default null,
  p_fim date default null
)
returns table (
  total_vendas numeric,
  total_taxas numeric,
  total_liquido numeric,
  total_seguro numeric,
  qtd_vendas bigint,
  ticket_medio numeric,
  timeline jsonb,
  top_destinos jsonb,
  por_produto jsonb,
  por_vendedor jsonb
)
language sql
stable
set search_path = public
as $$
with vendas_base as (
  select v.id, v.vendedor_id, v.destino_id, v.data_venda, v.valor_total, v.valor_taxas
  from public.vendas v
  where v.cancelada = false
    and (p_company_id is null or v.company_id = p_company_id)
    and (p_inicio is null or v.data_venda >= p_inicio)
    and (p_fim is null or v.data_venda <= p_fim)
    and (array_length(p_vendedor_ids, 1) is null or v.vendedor_id = any(p_vendedor_ids))
    -- Excluir vendas associadas a recibos "Baixa RAC"
    and not exists (
      select 1 from public.conciliacao_recibos cr
      where cr.venda_id = v.id and cr.is_baixa_rac = true
    )
),
recibos_base as (
  select
    r.venda_id,
    r.produto_id,
    coalesce(r.valor_total, 0) as valor_total,
    coalesce(r.valor_taxas, 0) as valor_taxas,
    lower(coalesce(tp.tipo, '')) as tp_tipo,
    lower(coalesce(tp.nome, '')) as tp_nome,
    tp.nome as tp_nome_original,
    tp.exibe_kpi_comissao
  from public.vendas_recibos r
  left join public.tipo_produtos tp on tp.id = r.produto_id
  join vendas_base v on v.id = r.venda_id
),
recibos_sum as (
  select
    rb.venda_id,
    sum(rb.valor_total) as total_bruto,
    sum(rb.valor_taxas) as total_taxas,
    sum(case when rb.tp_tipo like '%seguro%' or rb.tp_nome like '%seguro%' then rb.valor_total else 0 end) as total_seguro
  from recibos_base rb
  group by rb.venda_id
),
vendas_calc as (
  select
    v.id,
    v.vendedor_id,
    v.destino_id,
    v.data_venda,
    case
      when rs.total_bruto is null then coalesce(v.valor_total, 0)
      else
        (case
          when rs.total_bruto > 0 and coalesce(v.valor_total, 0) > 0 then
            least(1, greatest(0, coalesce(v.valor_total, 0) / rs.total_bruto))
          else 1
        end) * rs.total_bruto
    end as vendas_total,
    case
      when rs.total_bruto is null then coalesce(v.valor_taxas, 0)
      else coalesce(rs.total_taxas, 0)
    end as taxas_total,
    case
      when rs.total_bruto is null then 0
      else
        (case
          when rs.total_bruto > 0 and coalesce(v.valor_total, 0) > 0 then
            least(1, greatest(0, coalesce(v.valor_total, 0) / rs.total_bruto))
          else 1
        end) * coalesce(rs.total_seguro, 0)
    end as seguro_total
  from vendas_base v
  left join recibos_sum rs on rs.venda_id = v.id
),
totals as (
  select
    coalesce(sum(vendas_total), 0) as total_vendas,
    coalesce(sum(taxas_total), 0) as total_taxas,
    coalesce(sum(vendas_total), 0) - coalesce(sum(taxas_total), 0) as total_liquido,
    coalesce(sum(seguro_total), 0) as total_seguro,
    count(distinct vc.id) as qtd_vendas,
    case
      when count(distinct vc.id) > 0 then coalesce(sum(vendas_total), 0) / count(distinct vc.id)
      else 0
    end as ticket_medio
  from vendas_calc vc
),
timeline as (
  select
    jsonb_agg(
      jsonb_build_object(
        'data', to_char(vc.data_venda, 'YYYY-MM-DD'),
        'vendas', coalesce(sum(vc.vendas_total), 0),
        'taxas', coalesce(sum(vc.taxas_total), 0)
      )
      order by vc.data_venda
    ) as data
  from vendas_calc vc
  group by vc.data_venda
),
top_destinos as (
  with grouped as (
    select
      d.id, d.nome,
      sum(vc.vendas_total) as total_vendas,
      count(distinct vc.id) as qtd
    from vendas_calc vc
    left join public.destinos d on d.id = vc.destino_id
    group by d.id, d.nome
  )
  select
    jsonb_agg(
      jsonb_build_object(
        'destino', g.nome,
        'vendas', coalesce(g.total_vendas, 0),
        'qtd', g.qtd
      )
      order by g.total_vendas desc
    ) as data
  from grouped g
  order by g.total_vendas desc
  limit 10
),
por_produto as (
  with grouped as (
    select
      rb.produto_id, rb.tp_nome_original,
      sum(
        case
          when rs.total_bruto > 0 then
            (case
              when rs.total_bruto > 0 and coalesce(v.valor_total, 0) > 0 then
                least(1, greatest(0, coalesce(v.valor_total, 0) / rs.total_bruto))
              else 1
            end) * rb.valor_total
          else rb.valor_total
        end
      ) as total_vendas,
      count(distinct v.id) as qtd
    from vendas_base v
    join recibos_base rb on rb.venda_id = v.id
    left join recibos_sum rs on rs.venda_id = v.id
    group by rb.produto_id, rb.tp_nome_original
  )
  select
    jsonb_agg(
      jsonb_build_object(
        'produto', g.tp_nome_original,
        'vendas', coalesce(g.total_vendas, 0),
        'qtd', g.qtd
      )
      order by g.total_vendas desc
    ) as data
  from grouped g
  order by g.total_vendas desc
  limit 10
),
por_vendedor as (
  with grouped as (
    select
      u.id, u.nome_completo,
      sum(vc.vendas_total) as total_vendas,
      count(distinct vc.id) as qtd
    from vendas_calc vc
    left join public.users u on u.id = vc.vendedor_id
    group by u.id, u.nome_completo
  )
  select
    jsonb_agg(
      jsonb_build_object(
        'vendedor', g.nome_completo,
        'vendas', coalesce(g.total_vendas, 0),
        'qtd', g.qtd
      )
      order by g.total_vendas desc
    ) as data
  from grouped g
  order by g.total_vendas desc
  limit 10
)
select
  t.total_vendas,
  t.total_taxas,
  t.total_liquido,
  t.total_seguro,
  t.qtd_vendas,
  t.ticket_medio,
  tl.data as timeline,
  td.data as top_destinos,
  pp.data as por_produto,
  pv.data as por_vendedor
from totals t
cross join timeline tl
cross join top_destinos td
cross join por_produto pp
cross join por_vendedor pv;
$$;

grant execute on function public.rpc_vendas_kpis(uuid, uuid[], date, date) to authenticated, anon, service_role;
grant execute on function public.rpc_dashboard_vendas_summary(uuid, uuid[], date, date) to authenticated, anon, service_role;