-- Corrige o destino persistido no read model para usar cidade, nao produto.
do $$
begin
  if to_regclass('public.ranking_recibo_contribuicoes') is null then
    return;
  end if;

  update public.ranking_recibo_contribuicoes r
  set destino_nome = resolved.destino_nome
  from (
    select
      rc.source_key,
      coalesce(
        nullif(trim(cr.nome), ''),
        nullif(trim(cpr.nome), ''),
        nullif(trim(cv.nome), ''),
        nullif(trim(cpv.nome), ''),
        case when vr.id is not null or v.id is not null then 'Destino nao informado' end
      ) as destino_nome
    from public.ranking_recibo_contribuicoes rc
    left join public.vendas_recibos vr on vr.id = rc.recibo_id
    left join public.cidades cr on cr.id = vr.destino_cidade_id
    left join public.produtos pr on pr.id = vr.produto_resolvido_id
    left join public.cidades cpr on cpr.id = pr.cidade_id
    left join public.vendas v on v.id = coalesce(vr.venda_id, rc.venda_id)
    left join public.cidades cv on cv.id = v.destino_cidade_id
    left join public.produtos pv on pv.id = v.destino_id
    left join public.cidades cpv on cpv.id = pv.cidade_id
  ) resolved
  where r.source_key = resolved.source_key
    and resolved.destino_nome is not null
    and r.destino_nome is distinct from resolved.destino_nome;
end $$;
