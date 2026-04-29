-- 2026-04-28 - Hardening de RLS (fase 3)
-- Escopo conservador: tabelas administrativas e de configuracao
-- Objetivo: reduzir leitura/escrita ampla sem afetar fluxos operacionais.

begin;

-- ==========================================================
-- 1) PRECHECKS
-- ==========================================================

-- 1.1 Policies potencialmente amplas no schema public
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and (
    coalesce(trim(qual), '') = 'true'
    or coalesce(trim(with_check), '') = 'true'
  )
order by tablename, policyname;

-- 1.2 Estado de RLS para tabelas administrativas sensiveis
select n.nspname as schema_name,
       c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'companies',
    'admin_system_settings',
    'admin_email_settings',
    'admin_avisos_templates',
    'company_billing',
    'company_billing_events'
  )
order by c.relname;

-- ==========================================================
-- 2) CORRECAO DIRETA DE POLICY AMPLA (admin_system_settings)
-- ==========================================================
-- Remove select-all irrestrito e substitui por select admin-only.

alter table public.admin_system_settings enable row level security;

drop policy if exists admin_system_settings_select_all on public.admin_system_settings;

drop policy if exists admin_system_settings_select_admin on public.admin_system_settings;
create policy admin_system_settings_select_admin
on public.admin_system_settings
for select
to authenticated
using (
  is_admin(auth.uid())
);

-- Mantem policy ALL de admin (se ja existir, nao altera comportamento)
-- admin_system_settings_admin_all

-- ==========================================================
-- 3) FORCE RLS EM TABELAS CRITICAS DE CONFIG
-- ==========================================================

alter table public.companies force row level security;
alter table public.admin_system_settings force row level security;
alter table public.admin_email_settings force row level security;
alter table public.admin_avisos_templates force row level security;
alter table public.company_billing force row level security;
alter table public.company_billing_events force row level security;

-- ==========================================================
-- 4) CHECKS POS-APLICACAO
-- ==========================================================

-- 4.1 Policies finais de admin_system_settings
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'admin_system_settings'
order by policyname;

-- 4.2 Estado final de RLS/force nas tabelas alvo
select n.nspname as schema_name,
       c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'companies',
    'admin_system_settings',
    'admin_email_settings',
    'admin_avisos_templates',
    'company_billing',
    'company_billing_events'
  )
order by c.relname;

commit;
