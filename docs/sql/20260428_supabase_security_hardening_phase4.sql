-- 2026-04-28 - Hardening de RLS (fase 4)
-- Escopo: auditoria e endurecimento incremental de policies amplas no schema public
-- Foco: nao quebrar fluxos; aplicar apenas ajustes de baixo risco imediato.

begin;

-- ==========================================================
-- 1) AUDITORIA PRIORITARIA
-- ==========================================================

-- 1.1 Policies com qual/with_check = true (potencialmente amplas)
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and (
    coalesce(trim(qual), '') = 'true'
    or coalesce(trim(with_check), '') = 'true'
  )
order by tablename, policyname;

-- 1.2 Tabelas com muitas policies (sobreposicao aumenta risco de regra permissiva)
select schemaname, tablename, count(*) as total_policies
from pg_policies
where schemaname = 'public'
group by schemaname, tablename
having count(*) > 4
order by total_policies desc, tablename;

-- ==========================================================
-- 2) HARDENING IMEDIATO (baixo risco funcional)
-- ==========================================================

-- 2.1 Garantir FORCE RLS na tabela de consultorias (dados sensiveis)
alter table public.consultorias_online enable row level security;
alter table public.consultorias_online force row level security;

-- 2.2 Garantir FORCE RLS em tabelas de configuracao de CRM usadas por admin
alter table public.crm_template_categories enable row level security;
alter table public.crm_template_categories force row level security;

-- ==========================================================
-- 3) CHECKS POS-APLICACAO
-- ==========================================================

-- 3.1 Estado RLS das tabelas endurecidas nesta fase
select n.nspname as schema_name,
       c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('consultorias_online', 'crm_template_categories')
order by c.relname;

-- 3.2 Snapshot das policies de consultorias_online
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'consultorias_online'
order by policyname;

commit;
