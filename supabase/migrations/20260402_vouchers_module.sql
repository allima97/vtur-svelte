-- 2026-04-02: módulo Vouchers (Special Tours / Europamundo) + assets/logos

create extension if not exists "pgcrypto";

create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  provider text not null check (provider in ('special_tours', 'europamundo')),
  nome text not null,
  codigo_systur text,
  codigo_fornecedor text,
  reserva_online text,
  passageiros text,
  tipo_acomodacao text,
  operador text,
  resumo text,
  extra_data jsonb not null default '{}'::jsonb,
  data_inicio date,
  data_fim date,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.vouchers
  add column if not exists passageiros text,
  add column if not exists tipo_acomodacao text,
  add column if not exists extra_data jsonb not null default '{}'::jsonb;

create index if not exists idx_vouchers_company_provider
  on public.vouchers(company_id, provider, updated_at desc);

create table if not exists public.voucher_dias (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid not null references public.vouchers(id) on delete cascade,
  dia_numero integer not null,
  titulo text,
  descricao text not null,
  data_referencia date,
  cidade text,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_voucher_dias_unico
  on public.voucher_dias(voucher_id, dia_numero);

create index if not exists idx_voucher_dias_ordem
  on public.voucher_dias(voucher_id, ordem, dia_numero);

create table if not exists public.voucher_hoteis (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid not null references public.vouchers(id) on delete cascade,
  cidade text not null,
  hotel text not null,
  endereco text,
  data_inicio date,
  data_fim date,
  noites integer,
  telefone text,
  contato text,
  status text,
  observacao text,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_voucher_hoteis_ordem
  on public.voucher_hoteis(voucher_id, ordem, cidade);

create table if not exists public.voucher_assets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  provider text not null check (provider in ('cvc', 'special_tours', 'europamundo', 'generic')),
  asset_kind text not null check (asset_kind in ('logo', 'image', 'app_icon')),
  label text,
  storage_bucket text not null default 'voucher-assets',
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_voucher_assets_company_provider
  on public.voucher_assets(company_id, provider, asset_kind, ordem, created_at desc);

create unique index if not exists uq_voucher_assets_storage
  on public.voucher_assets(storage_bucket, storage_path);

alter table public.vouchers enable row level security;
alter table public.voucher_dias enable row level security;
alter table public.voucher_hoteis enable row level security;
alter table public.voucher_assets enable row level security;

drop policy if exists "vouchers_select" on public.vouchers;
create policy "vouchers_select" on public.vouchers
  for select using (
    is_admin(auth.uid())
    or company_id = public.current_company_id()
    or (is_master(auth.uid()) and public.master_can_access_company(auth.uid(), company_id))
  );

drop policy if exists "vouchers_insert" on public.vouchers;
create policy "vouchers_insert" on public.vouchers
  for insert with check (
    auth.uid() is not null
    and created_by = auth.uid()
    and (
      is_admin(auth.uid())
      or company_id = public.current_company_id()
      or (is_master(auth.uid()) and public.master_can_access_company(auth.uid(), company_id))
    )
  );

drop policy if exists "vouchers_update" on public.vouchers;
create policy "vouchers_update" on public.vouchers
  for update using (
    auth.uid() is not null
    and (
      is_admin(auth.uid())
      or company_id = public.current_company_id()
      or (is_master(auth.uid()) and public.master_can_access_company(auth.uid(), company_id))
    )
  )
  with check (
    auth.uid() is not null
    and updated_by = auth.uid()
    and (
      is_admin(auth.uid())
      or company_id = public.current_company_id()
      or (is_master(auth.uid()) and public.master_can_access_company(auth.uid(), company_id))
    )
  );

drop policy if exists "vouchers_delete" on public.vouchers;
create policy "vouchers_delete" on public.vouchers
  for delete using (
    auth.uid() is not null
    and (
      is_admin(auth.uid())
      or company_id = public.current_company_id()
      or (is_master(auth.uid()) and public.master_can_access_company(auth.uid(), company_id))
    )
  );

drop policy if exists "voucher_dias_select" on public.voucher_dias;
create policy "voucher_dias_select" on public.voucher_dias
  for select using (
    exists (
      select 1
      from public.vouchers v
      where v.id = voucher_id
        and (
          is_admin(auth.uid())
          or v.company_id = public.current_company_id()
          or (is_master(auth.uid()) and public.master_can_access_company(auth.uid(), v.company_id))
        )
    )
  );

drop policy if exists "voucher_dias_insert" on public.voucher_dias;
create policy "voucher_dias_insert" on public.voucher_dias
  for insert with check (
    exists (
      select 1
      from public.vouchers v
      where v.id = voucher_id
        and (
          is_admin(auth.uid())
          or v.company_id = public.current_company_id()
          or (is_master(auth.uid()) and public.master_can_access_company(auth.uid(), v.company_id))
        )
    )
  );

drop policy if exists "voucher_dias_update" on public.voucher_dias;
create policy "voucher_dias_update" on public.voucher_dias
  for update using (
    exists (
      select 1
      from public.vouchers v
      where v.id = voucher_id
        and (
          is_admin(auth.uid())
          or v.company_id = public.current_company_id()
          or (is_master(auth.uid()) and public.master_can_access_company(auth.uid(), v.company_id))
        )
    )
  )
  with check (
    exists (
      select 1
      from public.vouchers v
      where v.id = voucher_id
        and (
          is_admin(auth.uid())
          or v.company_id = public.current_company_id()
          or (is_master(auth.uid()) and public.master_can_access_company(auth.uid(), v.company_id))
        )
    )
  );

drop policy if exists "voucher_dias_delete" on public.voucher_dias;
create policy "voucher_dias_delete" on public.voucher_dias
  for delete using (
    exists (
      select 1
      from public.vouchers v
      where v.id = voucher_id
        and (
          is_admin(auth.uid())
          or v.company_id = public.current_company_id()
          or (is_master(auth.uid()) and public.master_can_access_company(auth.uid(), v.company_id))
        )
    )
  );

drop policy if exists "voucher_hoteis_select" on public.voucher_hoteis;
create policy "voucher_hoteis_select" on public.voucher_hoteis
  for select using (
    exists (
      select 1
      from public.vouchers v
      where v.id = voucher_id
        and (
          is_admin(auth.uid())
          or v.company_id = public.current_company_id()
          or (is_master(auth.uid()) and public.master_can_access_company(auth.uid(), v.company_id))
        )
    )
  );

drop policy if exists "voucher_hoteis_insert" on public.voucher_hoteis;
create policy "voucher_hoteis_insert" on public.voucher_hoteis
  for insert with check (
    exists (
      select 1
      from public.vouchers v
      where v.id = voucher_id
        and (
          is_admin(auth.uid())
          or v.company_id = public.current_company_id()
          or (is_master(auth.uid()) and public.master_can_access_company(auth.uid(), v.company_id))
        )
    )
  );

drop policy if exists "voucher_hoteis_update" on public.voucher_hoteis;
create policy "voucher_hoteis_update" on public.voucher_hoteis
  for update using (
    exists (
      select 1
      from public.vouchers v
      where v.id = voucher_id
        and (
          is_admin(auth.uid())
          or v.company_id = public.current_company_id()
          or (is_master(auth.uid()) and public.master_can_access_company(auth.uid(), v.company_id))
        )
    )
  )
  with check (
    exists (
      select 1
      from public.vouchers v
      where v.id = voucher_id
        and (
          is_admin(auth.uid())
          or v.company_id = public.current_company_id()
          or (is_master(auth.uid()) and public.master_can_access_company(auth.uid(), v.company_id))
        )
    )
  );

drop policy if exists "voucher_hoteis_delete" on public.voucher_hoteis;
create policy "voucher_hoteis_delete" on public.voucher_hoteis
  for delete using (
    exists (
      select 1
      from public.vouchers v
      where v.id = voucher_id
        and (
          is_admin(auth.uid())
          or v.company_id = public.current_company_id()
          or (is_master(auth.uid()) and public.master_can_access_company(auth.uid(), v.company_id))
        )
    )
  );

drop policy if exists "voucher_assets_select" on public.voucher_assets;
create policy "voucher_assets_select" on public.voucher_assets
  for select using (
    is_admin(auth.uid())
    or company_id = public.current_company_id()
    or (is_master(auth.uid()) and public.master_can_access_company(auth.uid(), company_id))
  );

drop policy if exists "voucher_assets_insert" on public.voucher_assets;
create policy "voucher_assets_insert" on public.voucher_assets
  for insert with check (
    auth.uid() is not null
    and created_by = auth.uid()
    and (
      is_admin(auth.uid())
      or company_id = public.current_company_id()
      or (is_master(auth.uid()) and public.master_can_access_company(auth.uid(), company_id))
    )
  );

drop policy if exists "voucher_assets_update" on public.voucher_assets;
create policy "voucher_assets_update" on public.voucher_assets
  for update using (
    auth.uid() is not null
    and (
      is_admin(auth.uid())
      or company_id = public.current_company_id()
      or (is_master(auth.uid()) and public.master_can_access_company(auth.uid(), company_id))
    )
  )
  with check (
    auth.uid() is not null
    and updated_by = auth.uid()
    and (
      is_admin(auth.uid())
      or company_id = public.current_company_id()
      or (is_master(auth.uid()) and public.master_can_access_company(auth.uid(), company_id))
    )
  );

drop policy if exists "voucher_assets_delete" on public.voucher_assets;
create policy "voucher_assets_delete" on public.voucher_assets
  for delete using (
    auth.uid() is not null
    and (
      is_admin(auth.uid())
      or company_id = public.current_company_id()
      or (is_master(auth.uid()) and public.master_can_access_company(auth.uid(), company_id))
    )
  );

insert into storage.buckets (id, name, public)
select 'voucher-assets', 'voucher-assets', false
where not exists (
  select 1 from storage.buckets where id = 'voucher-assets'
);

drop policy if exists "voucher_assets_storage_read" on storage.objects;
create policy "voucher_assets_storage_read" on storage.objects
  for select using (
    bucket_id = 'voucher-assets'
    and auth.uid() is not null
    and exists (
      select 1
      from public.voucher_assets a
      where a.storage_bucket = 'voucher-assets'
        and a.storage_path = name
        and (
          is_admin(auth.uid())
          or a.company_id = public.current_company_id()
          or (is_master(auth.uid()) and public.master_can_access_company(auth.uid(), a.company_id))
        )
    )
  );

drop policy if exists "voucher_assets_storage_insert" on storage.objects;
create policy "voucher_assets_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'voucher-assets'
    and auth.uid() = owner
  );

drop policy if exists "voucher_assets_storage_delete" on storage.objects;
create policy "voucher_assets_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'voucher-assets'
    and (
      auth.uid() = owner
      or is_admin(auth.uid())
      or exists (
        select 1
        from public.voucher_assets a
        where a.storage_bucket = 'voucher-assets'
          and a.storage_path = name
          and (
            is_admin(auth.uid())
            or a.company_id = public.current_company_id()
            or (is_master(auth.uid()) and public.master_can_access_company(auth.uid(), a.company_id))
          )
      )
    )
  );

create or replace function public.is_master_allowed_module(modulo text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select lower(coalesce(modulo, '')) in (
    -- chaves tecnicas
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

    -- labels legados (compatibilidade temporaria)
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
