-- 2026-04-28 - Hardening de RLS (vtur-svelte)
-- Objetivo: reduzir superfícies de acesso amplo sem quebrar funcionalidades.
-- Execucao sugerida: SQL Editor (staging primeiro, depois producao).

begin;

-- ==========================================================
-- 1) AUDITORIA RAPIDA (somente leitura)
-- ==========================================================

-- 1.1 Tabelas com RLS habilitado e sem nenhuma policy (foco em schema public)
-- Esperado no app: 0 linhas para schema public.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  coalesce(p.policy_count, 0) as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join (
  select schemaname, tablename, count(*) as policy_count
  from pg_policies
  group by schemaname, tablename
) p
  on p.schemaname = n.nspname
 and p.tablename = c.relname
where c.relkind = 'r'
  and c.relrowsecurity = true
  and n.nspname = 'public'
  and coalesce(p.policy_count, 0) = 0
order by 1, 2;

-- 1.2 Policies potencialmente amplas demais (qual/with_check = true)
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and (
    coalesce(trim(qual), '') = 'true'
    or coalesce(trim(with_check), '') = 'true'
  )
order by tablename, policyname;

-- ==========================================================
-- 2) CORRECAO DE ALTO IMPACTO: public.companies
-- ==========================================================
-- Motivo: existencia de policies redundantes/sobrepostas, incluindo regras
-- autenticadas muito amplas. Mantemos apenas o necessario:
-- - admin: acesso total
-- - master: somente empresas autorizadas
-- - usuario autenticado: somente propria empresa

alter table public.companies enable row level security;

-- Remocao de policies antigas/redundantes (if exists evita erro em ambientes diferentes)
drop policy if exists "Administradores podem ver todas as empresas" on public.companies;
drop policy if exists "Apenas administradores podem inserir empresas" on public.companies;
drop policy if exists "Usuários podem ver sua própria empresa" on public.companies;
drop policy if exists admin_full_access_companies on public.companies;
drop policy if exists companies_admin_select on public.companies;
drop policy if exists companies_dashboard_select on public.companies;
drop policy if exists companies_delete_authenticated on public.companies;
drop policy if exists companies_insert_authenticated on public.companies;
drop policy if exists companies_select on public.companies;
drop policy if exists companies_select_authenticated on public.companies;
drop policy if exists companies_update_authenticated on public.companies;
drop policy if exists companies_view on public.companies;
drop policy if exists companies_write_admin on public.companies;

-- SELECT: admin ve todas; master ve portfolio aprovado; demais veem somente a propria empresa
create policy companies_select_scoped
on public.companies
for select
to authenticated
using (
  is_admin(auth.uid())
  or id = current_company_id()
  or (is_master(auth.uid()) and master_can_access_company(auth.uid(), id))
);

-- INSERT: somente admin
create policy companies_insert_admin_only
on public.companies
for insert
to authenticated
with check (
  is_admin(auth.uid())
);

-- UPDATE: somente admin
create policy companies_update_admin_only
on public.companies
for update
to authenticated
using (
  is_admin(auth.uid())
)
with check (
  is_admin(auth.uid())
);

-- DELETE: somente admin
create policy companies_delete_admin_only
on public.companies
for delete
to authenticated
using (
  is_admin(auth.uid())
);

-- ==========================================================
-- 3) CHECKS POS-APLICACAO
-- ==========================================================

-- Deve listar apenas as 4 policies novas para public.companies
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'companies'
order by policyname;

commit;
