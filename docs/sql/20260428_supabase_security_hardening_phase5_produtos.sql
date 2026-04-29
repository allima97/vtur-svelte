-- 2026-04-28 - Hardening de RLS (fase 5)
-- Escopo: public.produtos (cirurgico)
-- Objetivo:
-- 1) remover policies amplas com qual/with_check=true detectadas na auditoria
-- 2) preservar leitura intencional para usuarios autenticados
-- 3) restringir escrita por permissao de modulo/admin/master

begin;

-- ==========================================================
-- 1) PRECHECKS
-- ==========================================================

-- 1.1 Policies atuais de produtos
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'produtos'
order by policyname;

-- 1.2 Estado de RLS/force da tabela
select n.nspname as schema_name,
       c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'produtos';

-- ==========================================================
-- 2) HARDENING DE POLICIES
-- ==========================================================

alter table public.produtos enable row level security;
alter table public.produtos force row level security;

-- Remove regras amplas historicas identificadas na auditoria
-- (if exists para suportar variacao entre ambientes)
drop policy if exists destinos_insert_authenticated on public.produtos;
drop policy if exists destinos_select on public.produtos;
drop policy if exists destinos_select_authenticated on public.produtos;
drop policy if exists destinos_service_role_all on public.produtos;
drop policy if exists destinos_update_authenticated on public.produtos;

-- Remove aliases comuns para evitar sobreposicao residual
drop policy if exists produtos_insert_authenticated on public.produtos;
drop policy if exists produtos_select_authenticated on public.produtos;
drop policy if exists produtos_update_authenticated on public.produtos;
drop policy if exists produtos_delete_authenticated on public.produtos;

-- SELECT intencional: apenas usuarios autenticados (inclui app e dashboards)
-- (service_role continua operando para rotas backend quando necessario)
drop policy if exists produtos_select_scoped on public.produtos;
create policy produtos_select_scoped
on public.produtos
for select
to authenticated
using (
  auth.uid() is not null
);

-- INSERT: admin/master ou permissao de criacao em modulo de produtos
drop policy if exists produtos_insert_scoped on public.produtos;
create policy produtos_insert_scoped
on public.produtos
for insert
to authenticated
with check (
  is_admin(auth.uid())
  or is_master(auth.uid())
  or has_perm('cadastros_produtos', 'create')
  or has_perm('produtos', 'create')
  or has_perm('cadastros_produtos', 'edit')
  or has_perm('produtos', 'edit')
  or has_perm('cadastros_produtos', 'admin')
  or has_perm('produtos', 'admin')
);

-- UPDATE: admin/master ou permissao de edicao em modulo de produtos
drop policy if exists produtos_update_scoped on public.produtos;
create policy produtos_update_scoped
on public.produtos
for update
to authenticated
using (
  is_admin(auth.uid())
  or is_master(auth.uid())
  or has_perm('cadastros_produtos', 'edit')
  or has_perm('produtos', 'edit')
  or has_perm('cadastros_produtos', 'admin')
  or has_perm('produtos', 'admin')
)
with check (
  is_admin(auth.uid())
  or is_master(auth.uid())
  or has_perm('cadastros_produtos', 'edit')
  or has_perm('produtos', 'edit')
  or has_perm('cadastros_produtos', 'admin')
  or has_perm('produtos', 'admin')
);

-- DELETE: admin/master ou permissao de exclusao
drop policy if exists produtos_delete_scoped on public.produtos;
create policy produtos_delete_scoped
on public.produtos
for delete
to authenticated
using (
  is_admin(auth.uid())
  or is_master(auth.uid())
  or has_perm('cadastros_produtos', 'delete')
  or has_perm('produtos', 'delete')
  or has_perm('cadastros_produtos', 'admin')
  or has_perm('produtos', 'admin')
);

-- ==========================================================
-- 3) CHECKS POS-APLICACAO
-- ==========================================================

-- 3.1 Policies finais de produtos
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'produtos'
order by policyname;

-- 3.2 Confirmar que produtos nao aparece mais como policy ampla em true
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'produtos'
  and (
    coalesce(trim(qual), '') = 'true'
    or coalesce(trim(with_check), '') = 'true'
  )
order by policyname;

-- 3.3 Estado final de RLS/force
select n.nspname as schema_name,
       c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'produtos';

commit;
