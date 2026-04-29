-- ============================================================
-- RPC: sync_venda_children
-- Substitui a logica sequencial de syncVendaChildren do TS
-- Executa tudo dentro de uma transacao atomica unica.
-- Se qualquer etapa falhar, tudo e revertido automaticamente.
-- ============================================================

create or replace function sync_venda_children(
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
  v_destino_label  text;
  v_origem_label   text;
  v_numero_recibo  text;
  v_recibo_ref     text;
  v_venda_recibo_id uuid;
begin
  -- 1. Remover passageiros das viagens atuais
  select array_agg(id) into v_viagem_ids
    from viagens where venda_id = p_venda_id;

  if v_viagem_ids is not null then
    delete from viagem_passageiros where viagem_id = any(v_viagem_ids);
  end if;

  -- 2. Remover viagens, pagamentos e recibos existentes
  delete from viagens          where venda_id = p_venda_id;
  delete from vendas_pagamentos where venda_id = p_venda_id;
  delete from vendas_recibos    where venda_id = p_venda_id;

  -- 3. Inserir recibos e viagens
  for r in select * from jsonb_array_elements(p_recibos)
  loop
    -- Validar UUIDs obrigatorios
    if not ((r->>'produto_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') then
      raise exception 'RECIBO_INVALIDO';
    end if;

    v_numero_recibo := r->>'numero_recibo';

    insert into vendas_recibos (
      venda_id, produto_id, produto_resolvido_id,
      destino_cidade_id,
      numero_recibo, numero_recibo_normalizado, numero_reserva,
      tipo_pacote, valor_total, valor_taxas, valor_du, valor_rav,
      data_inicio, data_fim, contrato_path, contrato_url
    ) values (
      p_venda_id,
      (r->>'produto_id')::uuid,
      coalesce((r->>'produto_resolvido_id'), (r->>'produto_id'))::uuid,
      nullif(trim(coalesce(r->>'destino_cidade_id', '')), '')::uuid,
      v_numero_recibo,
      upper(regexp_replace(coalesce(v_numero_recibo, ''), '[^A-Z0-9]', '', 'gi')),
      nullif(trim(coalesce(r->>'numero_reserva', '')), ''),
      nullif(trim(coalesce(r->>'tipo_pacote', '')), ''),
      coalesce((r->>'valor_total')::numeric, 0),
      coalesce((r->>'valor_taxas')::numeric, 0),
      coalesce((r->>'valor_du')::numeric,    0),
      coalesce((r->>'valor_rav')::numeric,   0),
      nullif(trim(coalesce(r->>'data_inicio', '')), '')::date,
      nullif(trim(coalesce(r->>'data_fim', '')),    '')::date,
      nullif(trim(coalesce(r->>'contrato_path', '')), ''),
      nullif(trim(coalesce(r->>'contrato_url', '')),  '')
    )
    returning id, data_inicio::date, data_fim::date
      into v_recibo_id, v_data_inicio, v_data_fim;

    -- Registrar mapeamento recibo_ref -> recibo_id
    v_recibo_ref := coalesce(trim(r->>'recibo_ref'), '');
    if v_recibo_ref <> '' then
      v_recibo_map := jsonb_set(v_recibo_map, array[v_recibo_ref], to_jsonb(v_recibo_id::text));
    end if;

    -- Calcular status da viagem
    v_status := case
      when v_data_fim   is not null and v_data_fim   <  v_hoje then 'concluida'
      when v_data_inicio is not null and v_data_inicio > v_hoje then 'confirmada'
      when v_data_fim   is not null and v_hoje        > v_data_fim then 'concluida'
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

    -- Inserir passageiro principal
    insert into viagem_passageiros (viagem_id, cliente_id, company_id, papel, created_by)
    values (v_viagem_id, p_cliente_id, p_company_id, 'passageiro', p_user_id);
  end loop;

  -- 4. Inserir pagamentos
  for pg in select * from jsonb_array_elements(p_pagamentos)
  loop
    if (pg->>'forma_pagamento_id') is null and (pg->>'forma_nome') is null then
      continue;
    end if;

    v_recibo_ref     := coalesce(trim(pg->>'recibo_ref'), '');
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

end;
$$;

-- Permissao para a service role chamar a funcao
grant execute on function sync_venda_children(
  uuid, uuid, uuid, uuid, uuid, jsonb, jsonb
) to service_role;
