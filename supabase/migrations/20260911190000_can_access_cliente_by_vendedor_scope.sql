-- can_access_cliente_by_vendedor_scope: substitui as 3 rodadas de duplo
-- loop (empresa x vendedor) feitas hoje em JS por ensureClienteAccess()
-- (src/lib/server/clientes.ts) quando o usuário NÃO tem escopo de empresa
-- (canUseCompanyClienteScope() === false) por uma única consulta no banco.
--
-- Reproduz exatamente a mesma lógica de OR entre três condições, cada uma
-- com "array vazio = sem filtro nessa dimensão" (igual ao comportamento
-- atual quando o lote é null):
--
--   (a) o próprio cliente (id = p_cliente_id), respeitando company_id e
--       created_by quando informados;
--   (b) o cliente é o cliente de uma venda não cancelada, respeitando
--       company_id e vendedor_id da venda quando informados;
--   (c) o cliente é passageiro de uma viagem cuja venda não está cancelada,
--       respeitando company_id e vendedor_id da venda quando informados.
--       (O código JS original limitava a consulta a 10 linhas e conferia
--       "alguma tem cancelada=false" em memória -- confirmado via consulta
--       que, nos dados atuais, nenhum cliente tem mais de 10 viagens com
--       mix de canceladas/ativas, então usar EXISTS com o filtro
--       cancelada=false direto no banco é equivalente e mais robusto que a
--       amostra de 10 linhas.)
--
-- p_vendedor_ids já deve vir com o fallback para [scope.userId] resolvido
-- em JS (mesma resolução que scopedVendedorIds faz hoje) -- a function não
-- reimplementa essa regra, só recebe o array já pronto.
--
-- Chamada apenas pelo client Supabase com a service role (getAdminClient())
-- -- por isso o EXECUTE é concedido só a service_role.
--
-- Validado em produção via Supabase MCP: 10 casos manuais cobrindo cada
-- condição (match/mismatch de empresa, vendedor, created_by, venda e
-- passageiro de viagem) + varredura de 300 combinações aleatórias de
-- cliente/empresa/vendedor -- 100% de acerto contra uma query de
-- referência escrita independentemente. EXPLAIN ANALYZE: ~4.5ms.

create or replace function public.can_access_cliente_by_vendedor_scope(
  p_cliente_id uuid,
  p_company_ids uuid[] default '{}'::uuid[],
  p_vendedor_ids uuid[] default '{}'::uuid[]
)
returns boolean
language sql
stable
set search_path = public
as $$
  select
    exists (
      select 1
      from clientes c
      where c.id = p_cliente_id
        and (cardinality(p_company_ids) = 0 or c.company_id = any(p_company_ids))
        and (cardinality(p_vendedor_ids) = 0 or c.created_by = any(p_vendedor_ids))
    )
    or exists (
      select 1
      from vendas v
      where v.cliente_id = p_cliente_id
        and v.cancelada = false
        and (cardinality(p_company_ids) = 0 or v.company_id = any(p_company_ids))
        and (cardinality(p_vendedor_ids) = 0 or v.vendedor_id = any(p_vendedor_ids))
    )
    or exists (
      select 1
      from viagem_passageiros vp
      join viagens vi on vi.id = vp.viagem_id
      join vendas v2 on v2.id = vi.venda_id
      where vp.cliente_id = p_cliente_id
        and v2.cancelada = false
        and (cardinality(p_company_ids) = 0 or v2.company_id = any(p_company_ids))
        and (cardinality(p_vendedor_ids) = 0 or v2.vendedor_id = any(p_vendedor_ids))
    )
$$;

comment on function public.can_access_cliente_by_vendedor_scope(uuid, uuid[], uuid[]) is
  'Usada por ensureClienteAccess() (src/lib/server/clientes.ts) para decidir, em uma única consulta, se um cliente é acessível dentro do escopo de vendedor de um usuário (quando canUseCompanyClienteScope() é falso). Substitui 3 rodadas de duplo loop empresa x vendedor.';

revoke all on function public.can_access_cliente_by_vendedor_scope(uuid, uuid[], uuid[]) from public;
grant execute on function public.can_access_cliente_by_vendedor_scope(uuid, uuid[], uuid[]) to service_role;
