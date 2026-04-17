-- =============================================================
-- Fix: campo "cliente" vazio ao incluir venda para usuários
--      da mesma empresa/equipe que possuem permissão.
-- =============================================================
-- Causa raiz:
--   O seed de user_type_default_perms insere modulo_acesso com
--   modulo = 'Vendas' (V maiúsculo). A função vendas_clientes_base()
--   verificava case-sensitive: modulo IN ('vendas_consulta', 'vendas',
--   'vendas_cadastro') — nenhum dos três bate com 'Vendas', então o
--   CTE allowed retorna vazio para qualquer usuário cujas permissões
--   vieram dos padrões de tipo, e a função devolve lista de clientes
--   vazia silenciosamente.
--
--   A checagem TypeScript (requireModuloView) normaliza via MODULO_ALIASES
--   ('Vendas' → 'vendas_consulta'), por isso o usuário passa pelo 403
--   mas recebe clientes = [] após a chamada ao RPC.
--
-- Correção:
--   1. Usar lower(ma.modulo) na verificação, tornando-a case-insensitive.
--   2. Expandir a lista de sinônimos para cobrir qualquer variante
--      armazenada historicamente.
--   3. Manter o fallback c.company_id para clientes sem entrada em
--      clientes_company (introduzido no fix 20260324 mas nem sempre aplicado).
-- =============================================================

create or replace function public.vendas_clientes_base()
returns table (id uuid, nome text, cpf text)
language sql stable security definer
set search_path = public
set row_security = off
as $$
  with ctx as (
    select
      auth.uid()                            as uid,
      public.current_company_id()           as company_id,
      public.is_uso_individual(auth.uid())  as uso_individual
  ),
  -- Permissão para acessar vendas — comparação case-insensitive.
  -- Módulos válidos (forma normalizada e variantes capitalizadas
  -- que o seed de user_type_default_perms pode ter inserido):
  --   'vendas'          → módulo raiz (MAPA_MODULOS: Vendas → vendas_consulta)
  --   'vendas_consulta' → alias normalizado de 'Vendas'
  --   'vendas_cadastro' → permissão explícita de cadastro
  allowed as (
    select 1
    from public.modulo_acesso ma
    where ma.usuario_id = (select uid from ctx)
      and ma.ativo = true
      and lower(ma.modulo) in ('vendas', 'vendas_consulta', 'vendas_cadastro')
      and coalesce(lower(ma.permissao), 'none') <> 'none'
    limit 1
  )
  select c.id, c.nome, c.cpf
  from public.clientes c
  where
    -- Somente quem tem permissão, é admin ou master
    (
      exists (select 1 from allowed)
      or public.is_admin(auth.uid())
      or public.is_master(auth.uid())
    )
    and (
      -- uso_individual: vê somente os clientes que ele mesmo criou
      (
        (select uso_individual from ctx)
        and c.created_by = (select uid from ctx)
      )
      or
      -- corporativo: vínculo em clientes_company OU company_id direto
      -- (fallback para clientes criados antes do trigger de link)
      (
        not (select uso_individual from ctx)
        and (
          exists (
            select 1
            from public.clientes_company cc
            where cc.cliente_id = c.id
              and cc.company_id = (select company_id from ctx)
          )
          or c.company_id = (select company_id from ctx)
        )
      )
    );
$$;

grant execute on function public.vendas_clientes_base() to authenticated;
