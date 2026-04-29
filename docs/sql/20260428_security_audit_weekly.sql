-- Auditoria semanal de seguranca (vtur-svelte)
-- Rodar em producao e staging. Nao altera dados.

-- ==========================================================
-- A) Tabelas public com RLS habilitado e sem policy
-- ==========================================================
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
) p on p.schemaname = n.nspname and p.tablename = c.relname
where c.relkind = 'r'
  and n.nspname = 'public'
  and c.relrowsecurity = true
  and coalesce(p.policy_count, 0) = 0
order by 1, 2;

-- ==========================================================
-- B) Policies amplas (qual/with_check = true)
-- ==========================================================
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and (
    coalesce(trim(qual), '') = 'true'
    or coalesce(trim(with_check), '') = 'true'
  )
  and not (
    (tablename = 'cidades' and policyname in ('Public read', 'cidades_select', 'cidades_select_public'))
    or (tablename = 'comissionamento_geral' and policyname = 'Enable read access for all users')
    or (tablename = 'paises' and policyname = 'paises_select')
    or (tablename = 'subdivisoes' and policyname = 'subdivisoes_select')
    or (tablename = 'tipo_produtos' and policyname = 'Public read')
    or (tablename = 'system_module_settings' and policyname = 'system_module_settings_select_authenticated')
    or (tablename = 'users' and policyname = 'users_insert_service_only')
  )
order by tablename, policyname;

-- ==========================================================
-- C) Tabelas com excesso de sobreposicao de policy
-- ==========================================================
select schemaname, tablename, count(*) as total_policies
from pg_policies
where schemaname = 'public'
group by schemaname, tablename
having count(*) > 4
order by total_policies desc, tablename;

-- ==========================================================
-- D) Estado RLS/Force em tabelas criticas
-- ==========================================================
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
    'company_billing_events',
    'documentos_viagens',
    'vendas_pagamentos',
    'consultorias_online',
    'crm_template_categories'
  )
order by c.relname;

-- ==========================================================
-- E) Integridade multiempresa (pagamentos x venda)
-- ==========================================================
select count(*) as pagamentos_company_mismatch
from public.vendas_pagamentos vp
join public.vendas v on v.id = vp.venda_id
where vp.company_id is distinct from v.company_id;

-- ==========================================================
-- F) Storage de documentos sensiveis
-- ==========================================================
select id, name, public
from storage.buckets
where id = 'viagens-documentos';
