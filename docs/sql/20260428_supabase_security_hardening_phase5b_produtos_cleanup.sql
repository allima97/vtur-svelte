-- 2026-04-28 - Hardening de RLS (fase 5B)
-- Escopo: limpeza de sobreposicao de policies em public.produtos
-- Objetivo: manter somente as policies scoped da fase 5.

begin;

-- ==========================================================
-- 1) PRECHECK
-- ==========================================================

select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'produtos'
order by policyname;

-- ==========================================================
-- 2) REMOVER POLICIES LEGADAS/REDUNDANTES
-- ==========================================================

-- Policies antigas que mantem sobreposicao com as novas scoped
-- (if exists para suportar variacoes entre ambientes)
drop policy if exists admin_full_access_produtos on public.produtos;
drop policy if exists destinos_delete_admin on public.produtos;
drop policy if exists produtos_admin_select on public.produtos;
drop policy if exists produtos_dashboard_select on public.produtos;
drop policy if exists produtos_read on public.produtos;
drop policy if exists produtos_view on public.produtos;

-- Garantir estrutura RLS esperada
alter table public.produtos enable row level security;
alter table public.produtos force row level security;

-- ==========================================================
-- 3) CHECKS POS-LIMPEZA
-- ==========================================================

-- 3.1 Esperado: apenas 4 policies scoped
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'produtos'
order by policyname;

-- 3.2 Esperado: nenhuma policy com qual/with_check literal true
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'produtos'
  and (
    coalesce(trim(qual), '') = 'true'
    or coalesce(trim(with_check), '') = 'true'
  )
order by policyname;

-- 3.3 Confirmar RLS/force
select n.nspname as schema_name,
       c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'produtos';

commit;
