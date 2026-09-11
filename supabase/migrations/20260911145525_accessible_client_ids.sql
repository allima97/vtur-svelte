-- accessible_client_ids: substitui o cruzamento de lotes feito hoje em JS por
-- resolveAccessibleClientIds() (src/lib/server/v1.ts) por uma única consulta no
-- banco. Reproduz exatamente a mesma lógica de OR entre três condições:
--
--   (a) clientes.company_id nas empresas informadas, SOMENTE quando não há
--       nenhum vendedor no escopo (mesma regra do código atual);
--   (b) clientes.created_by em qualquer um dos vendedores informados,
--       SEM filtrar por empresa (assim já é hoje, mantido de propósito);
--   (c) clientes que são o cliente de uma venda não cancelada, cruzando
--       empresa e vendedor quando os dois filtros existem (array vazio =
--       "sem filtro nessa dimensão", igual ao comportamento atual quando o
--       lote é null) — mas SÓ quando pelo menos uma das duas dimensões tem
--       algum filtro; com as duas vazias, a função inteira deve retornar
--       zero linhas (mesmo comportamento do early-return em v1.ts:
--       "if (companyIds.length === 0 && vendedorIds.length === 0) return []").
--
-- Chamada apenas pelo client Supabase com a service role (getAdminClient()) --
-- a mesma superfície de acesso que as consultas que ela substitui já tinham.
-- Por isso o EXECUTE é concedido só a service_role, nunca a anon/authenticated.

create or replace function public.accessible_client_ids(
  p_company_ids uuid[] default '{}'::uuid[],
  p_vendedor_ids uuid[] default '{}'::uuid[]
)
returns table (cliente_id uuid)
language sql
stable
set search_path = public
as $$
  select id as cliente_id
  from clientes
  where cardinality(p_vendedor_ids) = 0
    and cardinality(p_company_ids) > 0
    and company_id = any(p_company_ids)

  union

  select id as cliente_id
  from clientes
  where cardinality(p_vendedor_ids) > 0
    and created_by = any(p_vendedor_ids)

  union

  select v.cliente_id
  from vendas v
  where v.cancelada = false
    and v.cliente_id is not null
    and (cardinality(p_company_ids) > 0 or cardinality(p_vendedor_ids) > 0)
    and (cardinality(p_company_ids) = 0 or v.company_id = any(p_company_ids))
    and (cardinality(p_vendedor_ids) = 0 or v.vendedor_id = any(p_vendedor_ids))
$$;

comment on function public.accessible_client_ids(uuid[], uuid[]) is
  'Usada por resolveAccessibleClientIds() (src/lib/server/v1.ts) para resolver, em uma única consulta, quais clientes um usuário pode acessar dado seu escopo de empresas/vendedores. Substitui um cruzamento de lotes feito em JS que gerava dezenas de requisições sequenciais ao Supabase. Com os dois escopos vazios, retorna zero linhas (mesmo comportamento do early-return em v1.ts).';

revoke all on function public.accessible_client_ids(uuid[], uuid[]) from public;
grant execute on function public.accessible_client_ids(uuid[], uuid[]) to service_role;
