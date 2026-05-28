-- Corrige Vale Viagem para nunca gravar tipo_produtos.id em FKs de produtos.

do $$
declare
  v_tipo_id uuid;
  v_produto_id uuid;
begin
  select id
    into v_tipo_id
  from public.tipo_produtos
  where lower(coalesce(nome, '')) like '%vale viagem%'
     or lower(coalesce(tipo, '')) like '%vale viagem%'
  order by nome
  limit 1;

  if v_tipo_id is not null then
    select id
      into v_produto_id
    from public.produtos
    where tipo_produto = v_tipo_id
      and (
        lower(coalesce(nome, '')) like '%vale viagem%'
        or lower(coalesce(destino, '')) like '%vale viagem%'
      )
    order by nome
    limit 1;

    if v_produto_id is null then
      insert into public.produtos (
        nome,
        destino,
        tipo_produto,
        cidade_id,
        todas_as_cidades,
        ativo,
        valor_neto,
        margem,
        valor_venda,
        moeda,
        cambio,
        valor_em_reais
      ) values (
        'Vale Viagem',
        'Vale Viagem',
        v_tipo_id,
        null,
        true,
        true,
        0,
        null,
        0,
        'BRL',
        1,
        0
      )
      returning id into v_produto_id;
    end if;

    update public.vendas
    set destino_id = v_produto_id,
        updated_at = now()
    where destino_id = v_tipo_id;

    update public.vendas_recibos
    set produto_resolvido_id = v_produto_id
    where produto_id = v_tipo_id
      and (produto_resolvido_id is null or produto_resolvido_id = v_tipo_id);
  end if;
end;
$$;

create or replace function public.sync_venda_children(
  p_venda_id       uuid,
  p_company_id     uuid,
  p_cliente_id     uuid,
  p_vendedor_id    uuid,
  p_user_id        uuid,
  p_recibos        jsonb,
  p_pagamentos     jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r                jsonb;
  pg               jsonb;
  v_viagem_id      uuid;
  v_recibo_id      uuid;
  v_recibo_map     jsonb := '{}';
  v_viagem_ids     uuid[];
  v_status         text;
  v_hoje           date := current_date;
  v_data_inicio    date;
  v_data_fim       date;
  v_data_venda     date;
  v_venda_data     date;
  v_destino_label  text;
  v_origem_label   text;
  v_numero_recibo  text;
  v_recibo_ref     text;
  v_venda_recibo_id uuid;
  v_valor_nao_comissionado numeric;
begin
  select data_venda into v_venda_data
  from public.vendas
  where id = p_venda_id;

  select array_agg(id) into v_viagem_ids
    from viagens where venda_id = p_venda_id;

  if v_viagem_ids is not null then
    delete from viagem_passageiros where viagem_id = any(v_viagem_ids);
  end if;

  delete from viagens           where venda_id = p_venda_id;
  delete from vendas_pagamentos where venda_id = p_venda_id;
  delete from vendas_recibos    where venda_id = p_venda_id;

  for r in select * from jsonb_array_elements(p_recibos)
  loop
    if not ((r->>'produto_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$') then
      raise exception 'RECIBO_INVALIDO';
    end if;

    v_numero_recibo := r->>'numero_recibo';
    v_data_venda := coalesce(
      nullif(trim(coalesce(r->>'data_venda', '')), '')::date,
      v_venda_data
    );

    insert into vendas_recibos (
      venda_id, produto_id, produto_resolvido_id,
      destino_cidade_id,
      numero_recibo, numero_recibo_normalizado, numero_reserva,
      tipo_pacote, valor_total, valor_taxas, valor_du, valor_rav,
      data_venda, data_inicio, data_fim, contrato_path, contrato_url
    ) values (
      p_venda_id,
      (r->>'produto_id')::uuid,
      nullif(trim(coalesce(r->>'produto_resolvido_id', '')), '')::uuid,
      nullif(trim(coalesce(r->>'destino_cidade_id', '')), '')::uuid,
      v_numero_recibo,
      upper(regexp_replace(coalesce(v_numero_recibo, ''), '[^A-Z0-9]', '', 'gi')),
      nullif(trim(coalesce(r->>'numero_reserva', '')), ''),
      nullif(trim(coalesce(r->>'tipo_pacote', '')), ''),
      coalesce((r->>'valor_total')::numeric, 0),
      coalesce((r->>'valor_taxas')::numeric, 0),
      coalesce((r->>'valor_du')::numeric,    0),
      coalesce((r->>'valor_rav')::numeric,   0),
      v_data_venda,
      nullif(trim(coalesce(r->>'data_inicio', '')), '')::date,
      nullif(trim(coalesce(r->>'data_fim', '')),    '')::date,
      nullif(trim(coalesce(r->>'contrato_path', '')), ''),
      nullif(trim(coalesce(r->>'contrato_url', '')),  '')
    )
    returning id, data_inicio::date, data_fim::date
      into v_recibo_id, v_data_inicio, v_data_fim;

    v_recibo_ref := coalesce(trim(r->>'recibo_ref'), '');
    if v_recibo_ref <> '' then
      v_recibo_map := jsonb_set(v_recibo_map, array[v_recibo_ref], to_jsonb(v_recibo_id::text));
    end if;

    v_status := case
      when v_data_fim is not null and v_data_fim < v_hoje then 'concluida'
      when v_data_inicio is not null and v_data_inicio > v_hoje then 'confirmada'
      when v_data_fim is not null and v_hoje > v_data_fim then 'concluida'
      else 'em_viagem'
    end;
    if v_data_inicio is null then v_status := 'planejada'; end if;

    v_destino_label := nullif(trim(lower(coalesce(r->>'cidade_nome', r->>'produto_nome', r->>'tipo_nome', ''))), '');
    v_origem_label  := null;

    insert into viagens (
      company_id, venda_id, recibo_id, cliente_id,
      responsavel_user_id, origem, destino,
      data_inicio, data_fim, status, observacoes
    ) values (
      p_company_id, p_venda_id, v_recibo_id, p_cliente_id,
      p_vendedor_id, v_origem_label, v_destino_label,
      v_data_inicio, v_data_fim, v_status,
      case when v_numero_recibo is not null then 'Recibo ' || v_numero_recibo end
    )
    returning id into v_viagem_id;

    insert into viagem_passageiros (viagem_id, cliente_id, company_id, papel, created_by)
    values (v_viagem_id, p_cliente_id, p_company_id, 'passageiro', p_user_id);
  end loop;

  for pg in select * from jsonb_array_elements(p_pagamentos)
  loop
    if (pg->>'forma_pagamento_id') is null and (pg->>'forma_nome') is null then
      continue;
    end if;

    v_recibo_ref := coalesce(trim(pg->>'recibo_ref'), '');
    v_venda_recibo_id := null;

    if v_recibo_ref <> '' then
      v_venda_recibo_id := (v_recibo_map->>v_recibo_ref)::uuid;
    end if;

    insert into vendas_pagamentos (
      venda_id, venda_recibo_id, company_id,
      forma_pagamento_id, forma_nome, operacao, plano,
      valor_bruto, desconto_valor, valor_total,
      parcelas, parcelas_qtd, parcelas_valor,
      vencimento_primeira, paga_comissao
    ) values (
      p_venda_id,
      v_venda_recibo_id,
      p_company_id,
      nullif(trim(coalesce(pg->>'forma_pagamento_id', '')), '')::uuid,
      nullif(trim(coalesce(pg->>'forma_nome', '')), ''),
      nullif(trim(coalesce(pg->>'operacao', '')), ''),
      nullif(trim(coalesce(pg->>'plano', '')), ''),
      nullif((pg->>'valor_bruto'),    null)::numeric,
      nullif((pg->>'desconto_valor'), null)::numeric,
      nullif((pg->>'valor_total'),    null)::numeric,
      case when pg->'parcelas' is not null and jsonb_array_length(pg->'parcelas') > 0 then pg->'parcelas' end,
      nullif((pg->>'parcelas_qtd'), null)::integer,
      nullif((pg->>'parcelas_valor'), null)::numeric,
      nullif(trim(coalesce(pg->>'vencimento_primeira', '')), '')::date,
      case when (pg->>'paga_comissao') is not null then (pg->>'paga_comissao')::boolean end
    );
  end loop;

  select coalesce(sum(coalesce(vp.valor_total, 0)), 0)
  into v_valor_nao_comissionado
  from public.vendas_pagamentos vp
  where vp.venda_id = p_venda_id
    and public.is_forma_pagamento_nao_comissionavel(coalesce(vp.forma_nome, ''));

  update public.vendas
  set valor_nao_comissionado = v_valor_nao_comissionado,
      updated_at = now()
  where id = p_venda_id;
end;
$$;

grant execute on function public.sync_venda_children(
  uuid, uuid, uuid, uuid, uuid, jsonb, jsonb
) to service_role;

notify pgrst, 'reload schema';
