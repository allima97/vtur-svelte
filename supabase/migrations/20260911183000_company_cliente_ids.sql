-- company_cliente_ids: substitui o cruzamento de lotes feito hoje em JS por
-- resolveCompanyClienteIds() (src/lib/server/clientes.ts) por uma única
-- consulta no banco. Reproduz exatamente a mesma lógica de OR entre três
-- condições:
--
--   (a) clientes.company_id nas empresas informadas;
--   (b) clientes.created_by em qualquer usuário das empresas informadas
--       (users.company_id = any(p_company_ids)), desde que o próprio
--       cliente não tenha company_id preenchido com outra empresa fora do
--       escopo (mesma regra do código atual: "!rowCompanyId ||
--       scopedCompanySet.has(rowCompanyId)");
--   (c) clientes que são o cliente de uma venda não cancelada da(s)
--       empresa(s) informada(s).
--
-- Com p_company_ids vazio, retorna zero linhas (mesmo comportamento do
-- early-return em resolveCompanyClienteIds: "if (scopedCompanyIds.length
-- === 0) return [];").
--
-- Chamada apenas pelo client Supabase com a service role (getAdminClient())
-- -- por isso o EXECUTE é concedido só a service_role.
--
-- Validado em produção via Supabase MCP contra uma query de referência
-- escrita independentemente (1157 clientes para a empresa de teste, zero
-- divergências nos dois sentidos) e via EXPLAIN ANALYZE (~6.4ms).

create or replace function public.company_cliente_ids(
  p_company_ids uuid[] default '{}'::uuid[]
)
returns table (cliente_id uuid)
language sql
stable
set search_path = public
as $$
  select id as cliente_id
  from clientes
  where cardinality(p_company_ids) > 0
    and company_id = any(p_company_ids)

  union

  select c.id as cliente_id
  from clientes c
  where cardinality(p_company_ids) > 0
    and c.created_by in (
      select u.id from users u where u.company_id = any(p_company_ids)
    )
    and (c.company_id is null or c.company_id = any(p_company_ids))

  union

  select v.cliente_id
  from vendas v
  where cardinality(p_company_ids) > 0
    and v.company_id = any(p_company_ids)
    and v.cancelada = false
    and v.cliente_id is not null
$$;

comment on function public.company_cliente_ids(uuid[]) is
  'Usada por resolveCompanyClienteIds() (src/lib/server/clientes.ts) para resolver, em uma única consulta, quais clientes pertencem ao escopo de empresa(s) de um usuário. Substitui um cruzamento de lotes feito em JS (4 rodadas sequenciais) que gerava dezenas de requisições ao Supabase. Com o escopo de empresas vazio, retorna zero linhas.';

revoke all on function public.company_cliente_ids(uuid[]) from public;
grant execute on function public.company_cliente_ids(uuid[]) to service_role;
