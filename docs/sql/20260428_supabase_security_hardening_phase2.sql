-- 2026-04-28 - Hardening de RLS (fase 2)
-- Escopo: vendas_pagamentos e documentos_viagens, com foco em consistencia multiempresa
-- sem quebrar funcionalidades do vtur-svelte.

begin;

-- ==========================================================
-- 1) PRECHECKS (somente leitura)
-- ==========================================================

-- 1.1 Policies atuais das tabelas alvo
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('vendas_pagamentos', 'documentos_viagens')
order by tablename, policyname;

-- 1.2 Verificar inconsistencia de company_id em pagamentos x venda pai
-- Esperado: 0 linhas
select
  vp.id as pagamento_id,
  vp.company_id as pagamento_company_id,
  v.company_id as venda_company_id
from public.vendas_pagamentos vp
join public.vendas v on v.id = vp.venda_id
where vp.company_id is distinct from v.company_id
limit 200;

-- ==========================================================
-- 2) CORRECAO DE DADOS E RESTRICOES
-- ==========================================================

-- 2.1 Corrigir dados legados para manter pagamentos alinhados com company da venda
update public.vendas_pagamentos vp
set company_id = v.company_id,
    updated_at = now()
from public.vendas v
where v.id = vp.venda_id
  and vp.company_id is distinct from v.company_id;

-- 2.2 Garantir NOT NULL e integridade de company_id em pagamentos
alter table public.vendas_pagamentos
  alter column company_id set not null;

-- Integridade referencial composta (venda_id + company_id) para impedir mismatch futuro
create unique index if not exists ux_vendas_id_company
  on public.vendas (id, company_id);

alter table public.vendas_pagamentos
  drop constraint if exists vendas_pagamentos_venda_company_fk;

alter table public.vendas_pagamentos
  add constraint vendas_pagamentos_venda_company_fk
  foreign key (venda_id, company_id)
  references public.vendas (id, company_id)
  on update cascade
  on delete cascade
  not valid;

alter table public.vendas_pagamentos
  validate constraint vendas_pagamentos_venda_company_fk;

-- ==========================================================
-- 3) RLS HARDENING (sem reduzir capacidades existentes)
-- ==========================================================

alter table public.vendas_pagamentos enable row level security;
alter table public.documentos_viagens enable row level security;

-- Ativa FORCE RLS para reduzir bypass acidental por owner em queries de app
-- (service_role ainda pode operar quando necessario no backend)
alter table public.vendas_pagamentos force row level security;
alter table public.documentos_viagens force row level security;

-- ==========================================================
-- 4) STORAGE PRIVADO DE DOCUMENTOS
-- ==========================================================

-- Garantir bucket de documentos como privado
update storage.buckets
set public = false
where id = 'viagens-documentos';

-- ==========================================================
-- 5) CHECKS POS-APLICACAO
-- ==========================================================

-- 5.1 Confirmar integridade de pagamentos x venda
select count(*) as pagamentos_company_mismatch
from public.vendas_pagamentos vp
join public.vendas v on v.id = vp.venda_id
where vp.company_id is distinct from v.company_id;

-- 5.2 Confirmar force RLS
select n.nspname as schema_name, c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('vendas_pagamentos', 'documentos_viagens')
order by c.relname;

-- 5.3 Confirmar bucket privado
select id, name, public
from storage.buckets
where id = 'viagens-documentos';

commit;
