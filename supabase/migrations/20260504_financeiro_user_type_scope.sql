-- 2026-05-04: tipo de usuario FINANCEIRO com escopo multiempresa

create extension if not exists "pgcrypto";

insert into public.user_types (id, name, description)
select gen_random_uuid(), 'FINANCEIRO', 'Usuario financeiro com acesso aos modulos de caixa, conciliacao, comissionamento, vendas financeiras e notas fiscais.'
where not exists (
  select 1
    from public.user_types t
   where upper(coalesce(t.name, '')) = 'FINANCEIRO'
);

create table if not exists public.financeiro_empresas (
  id uuid primary key default gen_random_uuid(),
  financeiro_id uuid not null references public.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  status text not null default 'approved' check (lower(status) in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  created_by uuid references public.users(id),
  unique (financeiro_id, company_id)
);

create index if not exists financeiro_empresas_financeiro_idx
  on public.financeiro_empresas(financeiro_id);

create index if not exists financeiro_empresas_company_idx
  on public.financeiro_empresas(company_id);

do $$
begin
  if to_regclass('public.commission_rule') is not null then
    alter table public.commission_rule
      add column if not exists company_id uuid references public.companies(id) on delete cascade;

    alter table public.commission_rule
      add column if not exists created_by uuid references public.users(id) on delete set null;

    create index if not exists commission_rule_company_idx
      on public.commission_rule(company_id);
  end if;
end $$;

alter table public.financeiro_empresas enable row level security;

create or replace function public.is_master_allowed_module(modulo text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select lower(coalesce(modulo, '')) in (
    'dashboard',
    'vendas_consulta',
    'vendas_importar',
    'orcamentos',
    'clientes',
    'consultoria_online',

    'cadastros',
    'cadastros_paises',
    'cadastros_estados',
    'cadastros_cidades',
    'cadastros_destinos',
    'cadastros_produtos',
    'circuitos',
    'cadastros_lote',
    'cadastros_fornecedores',

    'relatorios',
    'relatorios_vendas',
    'relatorios_destinos',
    'relatorios_produtos',
    'relatorios_clientes',
    'relatorios_ranking_vendas',

    'parametros',
    'parametros_tipo_produtos',
    'parametros_tipo_pacotes',
    'parametros_metas',
    'parametros_regras_comissao',
    'parametros_equipe',
    'parametros_escalas',
    'parametros_cambios',
    'parametros_orcamentos',
    'parametros_formas_pagamento',

    'financeiro',
    'financeiro_notas_fiscais',

    'operacao',
    'operacao_agenda',
    'operacao_todo',
    'operacao_chat',
    'operacao_documentos_viagens',
    'operacao_vouchers',
    'operacao_viagens',
    'operacao_controle_sac',
    'operacao_campanhas',
    'operacao_conciliacao',

    'comissionamento',

    -- labels legados e labels de UI
    'vendas',
    'orcamentos',
    'consultoria online',
    'paises',
    'subdivisoes',
    'cidades',
    'destinos',
    'produtos',
    'produtoslote',
    'fornecedores',
    'relatoriovendas',
    'relatoriodestinos',
    'relatorioprodutos',
    'relatorioclientes',
    'tipoprodutos',
    'tipopacotes',
    'metas',
    'regrascomissao',
    'equipe',
    'escalas',
    'cambios',
    'orcamentos (pdf)',
    'formas de pagamento',
    'notasfiscais',
    'notas fiscais',
    'agenda',
    'todo',
    'chat',
    'documentos viagens',
    'vouchers',
    'viagens',
    'controle de sac',
    'campanhas',
    'conciliação',
    'conciliacao',
    'ranking de vendas',
    'importar contratos'
  );
$$;

drop policy if exists "financeiro_empresas_select" on public.financeiro_empresas;
create policy "financeiro_empresas_select" on public.financeiro_empresas
  for select using (
    public.is_admin(auth.uid())
    or financeiro_id = auth.uid()
    or (
      public.is_master(auth.uid())
      and public.master_can_access_company(auth.uid(), company_id)
    )
  );

drop policy if exists "financeiro_empresas_insert" on public.financeiro_empresas;
create policy "financeiro_empresas_insert" on public.financeiro_empresas
  for insert with check (
    public.is_admin(auth.uid())
    or (
      public.is_master(auth.uid())
      and public.master_can_access_company(auth.uid(), company_id)
    )
  );

drop policy if exists "financeiro_empresas_update" on public.financeiro_empresas;
create policy "financeiro_empresas_update" on public.financeiro_empresas
  for update using (
    public.is_admin(auth.uid())
    or (
      public.is_master(auth.uid())
      and public.master_can_access_company(auth.uid(), company_id)
    )
  )
  with check (
    public.is_admin(auth.uid())
    or (
      public.is_master(auth.uid())
      and public.master_can_access_company(auth.uid(), company_id)
    )
  );

drop policy if exists "financeiro_empresas_delete" on public.financeiro_empresas;
create policy "financeiro_empresas_delete" on public.financeiro_empresas
  for delete using (
    public.is_admin(auth.uid())
    or (
      public.is_master(auth.uid())
      and public.master_can_access_company(auth.uid(), company_id)
    )
  );

insert into public.user_type_default_perms (user_type_id, modulo, permissao, ativo)
select t.id, m.modulo, m.permissao, true
from public.user_types t
cross join (
  values
    ('Dashboard', 'view'),
    ('Financeiro', 'edit'),
    ('NotasFiscais', 'view'),
    ('Vendas', 'view'),
    ('Conciliação', 'edit'),
    ('Comissionamento', 'edit'),
    ('Formas de Pagamento', 'edit'),
    ('RegrasComissao', 'view')
) as m(modulo, permissao)
where upper(coalesce(t.name, '')) = 'FINANCEIRO'
  and not exists (
    select 1
      from public.user_type_default_perms d
     where d.user_type_id = t.id
       and lower(d.modulo) = lower(m.modulo)
  );

insert into public.modulo_acesso (usuario_id, modulo, permissao, ativo)
select u.id, d.modulo, d.permissao, true
from public.users u
join public.user_types t on t.id = u.user_type_id
join public.user_type_default_perms d on d.user_type_id = t.id
where upper(coalesce(t.name, '')) = 'FINANCEIRO'
  and coalesce(d.ativo, true) = true
  and lower(coalesce(d.permissao, 'none')) <> 'none'
  and not exists (
    select 1
      from public.modulo_acesso ma
     where ma.usuario_id = u.id
       and lower(ma.modulo) = lower(d.modulo)
  );
