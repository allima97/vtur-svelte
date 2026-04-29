-- RESCUE: cria/atualiza auditoria semanal de seguranca + cron
-- Use este script no SQL Editor quando a funcao public.security_audit_weekly_run()
-- ainda nao existir.

create extension if not exists pgcrypto;
create extension if not exists pg_cron;

create table if not exists public.security_audit_weekly_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  status text not null check (status in ('ok', 'attention', 'blocking')),
  missing_policy_count integer not null,
  broad_policy_count integer not null,
  overlapping_table_count integer not null,
  unforced_critical_count integer not null,
  pagamentos_company_mismatch integer not null,
  bucket_public boolean not null,
  details jsonb not null default '{}'::jsonb
);

create index if not exists idx_security_audit_weekly_runs_ran_at
  on public.security_audit_weekly_runs (ran_at desc);

create index if not exists idx_security_audit_weekly_runs_status
  on public.security_audit_weekly_runs (status, ran_at desc);

alter table public.security_audit_weekly_runs enable row level security;

drop policy if exists security_audit_weekly_runs_admin_select on public.security_audit_weekly_runs;
create policy security_audit_weekly_runs_admin_select
on public.security_audit_weekly_runs
for select
to authenticated
using (
  is_admin(auth.uid())
);

create or replace function public.security_audit_weekly_run()
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  result_id uuid;

  v_missing_policy_count integer := 0;
  v_broad_policy_count integer := 0;
  v_overlapping_table_count integer := 0;
  v_unforced_critical_count integer := 0;
  v_pagamentos_company_mismatch integer := 0;
  v_bucket_public boolean := true;

  v_missing_policy_rows jsonb := '[]'::jsonb;
  v_broad_policy_rows jsonb := '[]'::jsonb;
  v_overlapping_rows jsonb := '[]'::jsonb;
  v_critical_rows jsonb := '[]'::jsonb;

  v_status text := 'ok';
begin
  with missing as (
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
  )
  select count(*), coalesce(jsonb_agg(to_jsonb(missing)), '[]'::jsonb)
    into v_missing_policy_count, v_missing_policy_rows
  from missing;

  with broad as (
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
  )
  select count(*), coalesce(jsonb_agg(to_jsonb(broad)), '[]'::jsonb)
    into v_broad_policy_count, v_broad_policy_rows
  from broad;

  with overlapping as (
    select schemaname, tablename, count(*) as total_policies
    from pg_policies
    where schemaname = 'public'
    group by schemaname, tablename
    having count(*) > 4
  )
  select count(*), coalesce(jsonb_agg(to_jsonb(overlapping)), '[]'::jsonb)
    into v_overlapping_table_count, v_overlapping_rows
  from overlapping;

  with critical as (
    select
      n.nspname as schema_name,
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
      and (c.relrowsecurity is distinct from true or c.relforcerowsecurity is distinct from true)
  )
  select count(*), coalesce(jsonb_agg(to_jsonb(critical)), '[]'::jsonb)
    into v_unforced_critical_count, v_critical_rows
  from critical;

  select count(*)
    into v_pagamentos_company_mismatch
  from public.vendas_pagamentos vp
  join public.vendas v on v.id = vp.venda_id
  where vp.company_id is distinct from v.company_id;

  select coalesce((select b.public from storage.buckets b where b.id = 'viagens-documentos'), true)
    into v_bucket_public;

  if v_missing_policy_count > 0
     or v_unforced_critical_count > 0
     or v_pagamentos_company_mismatch > 0
     or v_bucket_public = true then
    v_status := 'blocking';
  elsif v_broad_policy_count > 0 or v_overlapping_table_count > 0 then
    v_status := 'attention';
  else
    v_status := 'ok';
  end if;

  insert into public.security_audit_weekly_runs (
    status,
    missing_policy_count,
    broad_policy_count,
    overlapping_table_count,
    unforced_critical_count,
    pagamentos_company_mismatch,
    bucket_public,
    details
  )
  values (
    v_status,
    v_missing_policy_count,
    v_broad_policy_count,
    v_overlapping_table_count,
    v_unforced_critical_count,
    v_pagamentos_company_mismatch,
    v_bucket_public,
    jsonb_build_object(
      'missing_policy_rows', v_missing_policy_rows,
      'broad_policy_rows', v_broad_policy_rows,
      'overlapping_rows', v_overlapping_rows,
      'critical_rows', v_critical_rows
    )
  )
  returning id into result_id;

  return result_id;
end;
$fn$;

-- Recria o agendamento de forma idempotente
-- segunda-feira 06:00 UTC
DO $do$
declare
  v_jobid bigint;
begin
  select jobid into v_jobid
  from cron.job
  where jobname = 'security_audit_weekly'
  order by jobid desc
  limit 1;

  if v_jobid is not null then
    perform cron.unschedule(v_jobid);
  end if;

  perform cron.schedule(
    'security_audit_weekly',
    '0 6 * * 1',
    $cmd$select public.security_audit_weekly_run();$cmd$
  );
end;
$do$;

-- Validacao rapida
select public.security_audit_weekly_run() as run_id;

select id, ran_at, status, missing_policy_count, broad_policy_count,
       overlapping_table_count, unforced_critical_count,
       pagamentos_company_mismatch, bucket_public
from public.security_audit_weekly_runs
order by ran_at desc
limit 5;

select jobid, jobname, schedule, command, active
from cron.job
where jobname = 'security_audit_weekly';
