-- =============================================================================
-- Baseline do read model de ranking/dashboard (versionamento do que JA EXISTE
-- em producao). Estas tabelas e RPCs foram criadas direto no Supabase e nunca
-- tinham sido versionadas no repositorio.
--
-- Aplicar este arquivo em producao e um NO-OP: tudo usa IF NOT EXISTS /
-- CREATE OR REPLACE com o mesmo corpo que esta no banco em 24/09/2026.
-- Para registrar sem executar:
--   supabase migration repair --status applied 20260924200000
-- =============================================================================

create table if not exists public.ranking_read_model_status (
  id uuid not null default gen_random_uuid(),
  modelo text not null,
  company_id uuid not null,
  mes date not null,
  status text not null default 'dirty'::text,
  dirty_at timestamp with time zone,
  rebuilt_at timestamp with time zone,
  last_error text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint ranking_read_model_status_pkey primary key (id),
  constraint ranking_read_model_status_unique unique (modelo, company_id, mes),
  constraint ranking_read_model_status_company_id_fkey foreign key (company_id) references public.companies(id) on delete cascade,
  constraint ranking_read_model_status_month_chk check ((mes = (date_trunc('month'::text, (mes)::timestamp with time zone))::date)),
  constraint ranking_read_model_status_status_chk check ((status = any (array['dirty'::text, 'rebuilding'::text, 'ready'::text, 'error'::text])))
);

create index if not exists idx_ranking_read_model_status_lookup
  on public.ranking_read_model_status using btree (modelo, company_id, mes, status);

alter table public.ranking_read_model_status enable row level security;

create table if not exists public.ranking_recibo_contribuicoes (
  id uuid not null default gen_random_uuid(),
  source_key text not null,
  company_id uuid not null,
  mes date not null,
  data_recibo date not null,
  vendedor_id uuid not null,
  cliente_id uuid,
  venda_id uuid,
  recibo_id uuid,
  venda_key text not null,
  recibo_numero text,
  produto_id uuid,
  produto_nome text,
  destino_nome text,
  valor_bruto numeric not null default 0,
  valor_taxas numeric not null default 0,
  valor_seguro numeric not null default 0,
  is_seguro boolean not null default false,
  fator numeric not null default 1,
  source_bruto numeric not null default 0,
  source_taxas numeric not null default 0,
  origem text not null default 'ranking_ts'::text,
  built_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint ranking_recibo_contribuicoes_pkey primary key (id),
  constraint ranking_recibo_contribuicoes_source_key_key unique (source_key),
  constraint ranking_recibo_contribuicoes_cliente_id_fkey foreign key (cliente_id) references public.clientes(id) on delete set null,
  constraint ranking_recibo_contribuicoes_company_id_fkey foreign key (company_id) references public.companies(id) on delete cascade,
  constraint ranking_recibo_contribuicoes_produto_id_fkey foreign key (produto_id) references public.tipo_produtos(id) on delete set null,
  constraint ranking_recibo_contribuicoes_recibo_id_fkey foreign key (recibo_id) references public.vendas_recibos(id) on delete set null,
  constraint ranking_recibo_contribuicoes_venda_id_fkey foreign key (venda_id) references public.vendas(id) on delete set null,
  constraint ranking_recibo_contribuicoes_vendedor_id_fkey foreign key (vendedor_id) references public.users(id) on delete cascade,
  constraint ranking_recibo_contribuicoes_month_chk check ((mes = (date_trunc('month'::text, (mes)::timestamp with time zone))::date))
);

create index if not exists idx_ranking_recibo_contribuicoes_company_mes
  on public.ranking_recibo_contribuicoes using btree (company_id, mes);
create index if not exists idx_ranking_recibo_contribuicoes_vendedor_mes
  on public.ranking_recibo_contribuicoes using btree (company_id, mes, vendedor_id);
create index if not exists idx_ranking_recibo_contribuicoes_company_vendedor_data
  on public.ranking_recibo_contribuicoes using btree (company_id, vendedor_id, data_recibo) where (vendedor_id is not null);
create index if not exists idx_ranking_recibo_contribuicoes_company_cliente_data
  on public.ranking_recibo_contribuicoes using btree (company_id, cliente_id, data_recibo) where (cliente_id is not null);

alter table public.ranking_recibo_contribuicoes enable row level security;

-- -----------------------------------------------------------------------------
-- RPCs de leitura do read model (corpo identico ao de producao em 24/09/2026)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.dashboard_vendas_summary_from_read_model(p_company_ids uuid[], p_vendedor_ids uuid[], p_cliente_ids uuid[], p_inicio date, p_fim date)
 RETURNS TABLE(total_vendas numeric, total_taxas numeric, total_seguro numeric, qtd_vendas bigint, qtd_recibos bigint, timeline jsonb, top_destinos jsonb, por_produto jsonb)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.dashboard_empresa_comparativo_from_read_model(p_company_ids uuid[], p_inicio date, p_fim date, p_meta_inicio date, p_meta_fim date)
 RETURNS TABLE(company_id uuid, total_vendas numeric, qtd_vendas bigint, total_meta numeric)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.dashboard_compras_resumo_from_read_model(p_company_ids uuid[], p_vendedor_ids uuid[], p_inicio date, p_fim date, p_limit integer)
 RETURNS TABLE(top_vendedores jsonb, top_clientes jsonb, ultimas_compras jsonb, total bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.relatorio_clientes_from_read_model(p_company_ids uuid[], p_vendedor_ids uuid[], p_inicio date, p_fim date)
 RETURNS TABLE(cliente_id uuid, total_compras bigint, total_gasto numeric, ultima_compra date)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with grouped as (
    select
      coalesce(
        cliente_id::text,
        'sem-cliente:' || coalesce(nullif(venda_key, ''), recibo_id::text, concat_ws('|', recibo_numero, data_recibo::text))
      ) as cliente_key,
      (array_agg(cliente_id order by data_recibo desc nulls last))[1] as cliente_id,
      count(distinct coalesce(nullif(venda_key, ''), recibo_id::text, concat_ws('|', recibo_numero, data_recibo::text)))::bigint as total_compras,
      round(coalesce(sum(valor_bruto), 0)::numeric, 2) as total_gasto,
      max(data_recibo)::date as ultima_compra
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
    group by coalesce(
      cliente_id::text,
      'sem-cliente:' || coalesce(nullif(venda_key, ''), recibo_id::text, concat_ws('|', recibo_numero, data_recibo::text))
    )
  )
  select
    grouped.cliente_id,
    grouped.total_compras,
    grouped.total_gasto,
    grouped.ultima_compra
  from grouped
  order by grouped.total_gasto desc;
$function$;

CREATE OR REPLACE FUNCTION public.relatorio_destinos_from_read_model(p_company_ids uuid[], p_vendedor_ids uuid[], p_inicio date, p_fim date)
 RETURNS TABLE(destino text, quantidade bigint, receita numeric)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    coalesce(nullif(trim(destino_nome), ''), 'Destino nao informado') as destino,
    count(distinct coalesce(nullif(venda_key, ''), recibo_id::text, concat_ws('|', recibo_numero, data_recibo::text)))::bigint as quantidade,
    round(coalesce(sum(valor_bruto), 0)::numeric, 2) as receita
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
  group by coalesce(nullif(trim(destino_nome), ''), 'Destino nao informado')
  order by receita desc;
$function$;

CREATE OR REPLACE FUNCTION public.relatorio_produtos_from_read_model(p_company_ids uuid[], p_vendedor_ids uuid[], p_inicio date, p_fim date)
 RETURNS TABLE(produto_id uuid, produto text, tipo text, quantidade bigint, receita numeric, lucro numeric)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    produto_id,
    coalesce(nullif(trim(produto_nome), ''), 'Produto nao informado') as produto,
    case when bool_or(is_seguro) then 'Seguro' else 'Produto' end as tipo,
    count(distinct concat_ws('|', venda_key, coalesce(recibo_id::text, recibo_numero, ''), data_recibo::text))::bigint as quantidade,
    round(coalesce(sum(valor_bruto), 0)::numeric, 2) as receita,
    round(coalesce(sum(valor_taxas), 0)::numeric, 2) as lucro
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
  group by
    produto_id,
    coalesce(nullif(trim(produto_nome), ''), 'Produto nao informado')
  order by receita desc;
$function$;
