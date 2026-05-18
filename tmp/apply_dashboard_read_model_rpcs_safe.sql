-- Agregacoes server-side para dashboards master/gestor.
-- Evita trafegar milhares de linhas de ranking_recibo_contribuicoes para a API
-- apenas para somar timeline, destinos, produtos e comparativo por empresa.

create or replace function public.dashboard_vendas_summary_from_read_model(
  p_company_ids uuid[],
  p_vendedor_ids uuid[],
  p_cliente_ids uuid[],
  p_inicio date,
  p_fim date
)
returns table (
  total_vendas numeric,
  total_taxas numeric,
  total_seguro numeric,
  qtd_vendas bigint,
  qtd_recibos bigint,
  timeline jsonb,
  top_destinos jsonb,
  por_produto jsonb
)
language sql
security definer
set search_path = public
as $dashboard_vendas_summary$
  with filtered as materialized (
    select
      company_id,
      data_recibo,
      vendedor_id,
      cliente_id,
      venda_key,
      recibo_id,
      recibo_numero,
      produto_id,
      produto_nome,
      destino_nome,
      valor_bruto,
      valor_taxas,
      valor_seguro,
      is_seguro
    from public.ranking_recibo_contribuicoes
    where data_recibo >= p_inicio
      and data_recibo <= p_fim
      and (
        coalesce(array_length(p_company_ids, 1), 0) = 0
        or company_id = any(p_company_ids)
      )
      and (
        coalesce(array_length(p_vendedor_ids, 1), 0) = 0
        or vendedor_id = any(p_vendedor_ids)
      )
      and (
        coalesce(array_length(p_cliente_ids, 1), 0) = 0
        or cliente_id = any(p_cliente_ids)
      )
  ),
  totals as (
    select
      coalesce(sum(valor_bruto), 0)::numeric as total_vendas,
      coalesce(sum(valor_taxas), 0)::numeric as total_taxas,
      coalesce(sum(case when is_seguro then valor_bruto else valor_seguro end), 0)::numeric as total_seguro,
      count(distinct venda_key)::bigint as qtd_vendas,
      count(distinct concat_ws('|', venda_key, coalesce(recibo_id::text, recibo_numero, ''), data_recibo::text))::bigint as qtd_recibos
    from filtered
  ),
  timeline_rows as (
    select
      data_recibo::text as date,
      round(sum(valor_bruto)::numeric, 2) as value
    from filtered
    where valor_bruto > 0
    group by data_recibo
    order by data_recibo
  ),
  destino_rows as (
    select
      coalesce(nullif(trim(destino_nome), ''), 'Destino nao informado') as name,
      round(sum(valor_bruto)::numeric, 2) as value,
      count(distinct concat_ws('|', venda_key, coalesce(recibo_id::text, recibo_numero, ''), data_recibo::text))::bigint as receipt_count
    from filtered
    where valor_bruto > 0
    group by coalesce(nullif(trim(destino_nome), ''), 'Destino nao informado')
    order by value desc
    limit 5
  ),
  produto_rows as (
    select
      coalesce(produto_id::text, 'sem-produto') as id,
      coalesce(nullif(trim(produto_nome), ''), 'Produto') as name,
      round(sum(valor_bruto)::numeric, 2) as value
    from filtered
    where valor_bruto > 0
    group by coalesce(produto_id::text, 'sem-produto'), coalesce(nullif(trim(produto_nome), ''), 'Produto')
    order by value desc
    limit 6
  )
  select
    totals.total_vendas,
    totals.total_taxas,
    totals.total_seguro,
    totals.qtd_vendas,
    totals.qtd_recibos,
    coalesce((select jsonb_agg(jsonb_build_object('date', date, 'value', value) order by date) from timeline_rows), '[]'::jsonb) as timeline,
    coalesce((select jsonb_agg(jsonb_build_object('name', name, 'value', value, 'count', receipt_count) order by value desc) from destino_rows), '[]'::jsonb) as top_destinos,
    coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'value', value) order by value desc) from produto_rows), '[]'::jsonb) as por_produto
  from totals;
$dashboard_vendas_summary$;

create or replace function public.dashboard_empresa_comparativo_from_read_model(
  p_company_ids uuid[],
  p_inicio date,
  p_fim date,
  p_meta_inicio date,
  p_meta_fim date
)
returns table (
  company_id uuid,
  total_vendas numeric,
  qtd_vendas bigint,
  total_meta numeric
)
language sql
security definer
set search_path = public
as $dashboard_empresa_comparativo$
  with requested_companies as (
    select unnest(p_company_ids) as company_id
  ),
  sales as (
    select
      company_id,
      coalesce(sum(valor_bruto), 0)::numeric as total_vendas,
      count(distinct venda_key)::bigint as qtd_vendas
    from public.ranking_recibo_contribuicoes
    where data_recibo >= p_inicio
      and data_recibo <= p_fim
      and (
        coalesce(array_length(p_company_ids, 1), 0) = 0
        or company_id = any(p_company_ids)
      )
    group by company_id
  ),
  metas as (
    select
      u.company_id,
      coalesce(sum(m.meta_geral), 0)::numeric as total_meta
    from public.metas_vendedor m
    join public.users u on u.id = m.vendedor_id
    where m.ativo = true
      and m.periodo >= p_meta_inicio
      and m.periodo <= p_meta_fim
      and u.active = true
      and (
        coalesce(array_length(p_company_ids, 1), 0) = 0
        or u.company_id = any(p_company_ids)
      )
    group by u.company_id
  )
  select
    rc.company_id,
    coalesce(s.total_vendas, 0)::numeric as total_vendas,
    coalesce(s.qtd_vendas, 0)::bigint as qtd_vendas,
    coalesce(m.total_meta, 0)::numeric as total_meta
  from requested_companies rc
  left join sales s on s.company_id = rc.company_id
  left join metas m on m.company_id = rc.company_id;
$dashboard_empresa_comparativo$;

create or replace function public.dashboard_metas_summary(
  p_company_ids uuid[],
  p_vendedor_ids uuid[],
  p_inicio date,
  p_fim date
)
returns table (
  meta_geral numeric,
  meta_diferenciada numeric,
  vendedor_count bigint
)
language sql
security definer
set search_path = public
as $dashboard_metas_summary$
  with eligible_users as materialized (
    select u.id
    from public.users u
    left join public.user_types ut on ut.id = u.user_type_id
    where u.id is not null
      and coalesce(u.active, true) = true
      and coalesce(u.uso_individual, false) = false
      and (
        coalesce(array_length(p_vendedor_ids, 1), 0) = 0
        or u.id = any(p_vendedor_ids)
      )
      and (
        coalesce(array_length(p_vendedor_ids, 1), 0) > 0
        or coalesce(array_length(p_company_ids, 1), 0) = 0
        or u.company_id = any(p_company_ids)
      )
      and regexp_replace(lower(coalesce(u.nome_completo, u.email, '')), '\s+', ' ', 'g') not in ('baixa rac', 'equipe vtur')
      and (
        upper(coalesce(ut.name, '')) like '%VENDEDOR%'
        or (
          upper(coalesce(ut.name, '')) like '%GESTOR%'
          and coalesce(u.participa_ranking, false) = true
        )
      )
  )
  select
    coalesce(sum(m.meta_geral), 0)::numeric as meta_geral,
    coalesce(sum(m.meta_diferenciada), 0)::numeric as meta_diferenciada,
    count(distinct e.id)::bigint as vendedor_count
  from eligible_users e
  left join public.metas_vendedor m
    on m.vendedor_id = e.id
   and m.ativo = true
   and m.periodo >= p_inicio
   and m.periodo <= p_fim;
$dashboard_metas_summary$;

create or replace function public.dashboard_compras_resumo_from_read_model(
  p_company_ids uuid[],
  p_vendedor_ids uuid[],
  p_inicio date,
  p_fim date,
  p_limit integer
)
returns table (
  top_vendedores jsonb,
  top_clientes jsonb,
  ultimas_compras jsonb,
  total bigint
)
language sql
security definer
set search_path = public
as $dashboard_compras_resumo$
  with filtered as materialized (
    select
      company_id,
      data_recibo,
      vendedor_id,
      cliente_id,
      venda_id,
      venda_key,
      destino_nome,
      valor_bruto
    from public.ranking_recibo_contribuicoes
    where data_recibo >= p_inicio
      and data_recibo <= p_fim
      and valor_bruto > 0
      and (
        coalesce(array_length(p_company_ids, 1), 0) = 0
        or company_id = any(p_company_ids)
      )
      and (
        coalesce(array_length(p_vendedor_ids, 1), 0) = 0
        or vendedor_id = any(p_vendedor_ids)
      )
  ),
  sale_rows as materialized (
    select
      coalesce(venda_id::text, venda_key) as sale_key,
      (array_agg(venda_id order by data_recibo desc nulls last))[1] as venda_id,
      (array_agg(cliente_id order by data_recibo desc nulls last))[1] as cliente_id,
      (array_agg(vendedor_id order by data_recibo desc nulls last))[1] as vendedor_id,
      (array_agg(company_id order by data_recibo desc nulls last))[1] as company_id,
      max(data_recibo)::date as data_compra,
      coalesce(
        nullif(trim((array_agg(destino_nome order by data_recibo desc nulls last))[1]), ''),
        'Destino nao informado'
      ) as destino,
      round(sum(valor_bruto)::numeric, 2) as valor
    from filtered
    where coalesce(venda_id::text, venda_key) is not null
    group by coalesce(venda_id::text, venda_key)
  ),
  top_vendedores_rows as (
    select
      sr.vendedor_id,
      coalesce(nullif(trim(u.nome_completo), ''), nullif(trim(u.email), ''), 'Vendedor não informado') as vendedor_nome,
      round(sum(sr.valor)::numeric, 2) as valor,
      count(*)::bigint as quantidade
    from sale_rows sr
    left join public.users u on u.id = sr.vendedor_id
    group by sr.vendedor_id, coalesce(nullif(trim(u.nome_completo), ''), nullif(trim(u.email), ''), 'Vendedor não informado')
    order by valor desc
    limit 3
  ),
  cliente_rank as materialized (
    select
      coalesce(sr.cliente_id::text, 'sem-cliente:' || sr.sale_key) as cliente_key,
      (array_agg(sr.cliente_id order by sr.data_compra desc nulls last))[1] as cliente_id,
      (array_agg(sr.venda_id order by sr.data_compra desc nulls last))[1] as latest_sale_id,
      (array_agg(sr.destino order by sr.data_compra desc nulls last))[1] as destino,
      max(sr.data_compra)::date as latest_date,
      round(sum(sr.valor)::numeric, 2) as valor,
      count(*)::bigint as quantidade
    from sale_rows sr
    group by coalesce(sr.cliente_id::text, 'sem-cliente:' || sr.sale_key)
    order by valor desc
    limit 5
  ),
  top_clientes_rows as (
    select
      cr.cliente_id,
      coalesce(nullif(trim(c.nome), ''), 'Cliente sem nome') as cliente_nome,
      v.data_embarque as data_saida,
      coalesce(nullif(trim(cd.nome), ''), nullif(trim(pd.nome), ''), cr.destino, 'Destino nao informado') as destino,
      cr.valor,
      cr.quantidade
    from cliente_rank cr
    left join public.vendas v on v.id = cr.latest_sale_id
    left join public.clientes c on c.id = coalesce(v.cliente_id, cr.cliente_id)
    left join public.cidades cd on cd.id = v.destino_cidade_id
    left join public.produtos pd on pd.id = v.destino_id
    order by cr.valor desc
  ),
  recent_sales as (
    select *
    from sale_rows
    order by data_compra desc nulls last
    limit greatest(1, least(coalesce(p_limit, 5), 100))
  ),
  recent_rows as (
    select
      coalesce(v.id::text, rs.sale_key) as id,
      v.numero_venda,
      coalesce(v.cliente_id, rs.cliente_id) as cliente_id,
      coalesce(nullif(trim(c.nome), ''), 'Cliente sem nome') as cliente_nome,
      nullif(trim(c.email), '') as cliente_email,
      nullif(trim(coalesce(c.whatsapp, c.telefone)), '') as cliente_telefone,
      nullif(trim(c.whatsapp), '') as cliente_whatsapp,
      c.nascimento as cliente_nascimento,
      coalesce(v.vendedor_id, rs.vendedor_id) as vendedor_id,
      coalesce(nullif(trim(u.nome_completo), ''), nullif(trim(u.email), ''), 'Vendedor não informado') as vendedor_nome,
      coalesce(v.company_id, rs.company_id) as company_id,
      coalesce(rs.data_compra, v.data_venda)::date as data_compra,
      v.data_embarque as data_saida,
      coalesce(nullif(trim(cd.nome), ''), nullif(trim(pd.nome), ''), rs.destino, 'Destino nao informado') as destino,
      rs.valor
    from recent_sales rs
    left join public.vendas v on v.id = rs.venda_id
    left join public.clientes c on c.id = coalesce(v.cliente_id, rs.cliente_id)
    left join public.users u on u.id = coalesce(v.vendedor_id, rs.vendedor_id)
    left join public.cidades cd on cd.id = v.destino_cidade_id
    left join public.produtos pd on pd.id = v.destino_id
    order by coalesce(rs.data_compra, v.data_venda) desc nulls last
  )
  select
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'vendedor_id', vendedor_id,
          'vendedor_nome', vendedor_nome,
          'valor', valor,
          'quantidade', quantidade
        )
        order by valor desc
      )
      from top_vendedores_rows
    ), '[]'::jsonb) as top_vendedores,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'cliente_id', cliente_id,
          'cliente_nome', cliente_nome,
          'data_saida', data_saida,
          'destino', destino,
          'valor', valor,
          'quantidade', quantidade
        )
        order by valor desc
      )
      from top_clientes_rows
    ), '[]'::jsonb) as top_clientes,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', id,
          'numero_venda', numero_venda,
          'cliente_id', cliente_id,
          'cliente_nome', cliente_nome,
          'cliente_email', cliente_email,
          'cliente_telefone', cliente_telefone,
          'cliente_whatsapp', cliente_whatsapp,
          'cliente_nascimento', cliente_nascimento,
          'vendedor_id', vendedor_id,
          'vendedor_nome', vendedor_nome,
          'company_id', company_id,
          'data_compra', data_compra,
          'data_saida', data_saida,
          'destino', destino,
          'valor', valor
        )
        order by data_compra desc nulls last
      )
      from recent_rows
    ), '[]'::jsonb) as ultimas_compras,
    (select count(*) from sale_rows)::bigint as total;
$dashboard_compras_resumo$;

grant execute on function public.dashboard_vendas_summary_from_read_model(uuid[], uuid[], uuid[], date, date) to service_role;
grant execute on function public.dashboard_empresa_comparativo_from_read_model(uuid[], date, date, date, date) to service_role;
grant execute on function public.dashboard_metas_summary(uuid[], uuid[], date, date) to service_role;
grant execute on function public.dashboard_compras_resumo_from_read_model(uuid[], uuid[], date, date, integer) to service_role;
