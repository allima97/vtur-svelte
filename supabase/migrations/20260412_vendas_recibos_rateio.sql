-- Ajustes de vendas: rateio por recibo sem duplicar o recibo.
-- Suporta recibo de venda (vendas_recibos) e recibo vindo da conciliacao (conciliacao_recibos).

create table if not exists public.vendas_recibos_rateio (
  id uuid primary key default gen_random_uuid(),
  venda_recibo_id uuid null references public.vendas_recibos(id) on delete cascade,
  conciliacao_recibo_id uuid null references public.conciliacao_recibos(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  vendedor_origem_id uuid not null references public.users(id) on delete restrict,
  vendedor_destino_id uuid not null references public.users(id) on delete restrict,
  percentual_origem numeric(5,2) not null,
  percentual_destino numeric(5,2) not null,
  ativo boolean not null default true,
  observacao text null,
  created_by uuid null references public.users(id) on delete set null,
  updated_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendas_recibos_rateio_percentuais_chk check (
    percentual_origem >= 0
    and percentual_destino >= 0
    and round((percentual_origem + percentual_destino)::numeric, 2) = 100.00
  ),
  constraint vendas_recibos_rateio_vendedores_diff_chk check (
    vendedor_origem_id <> vendedor_destino_id
  )
);

alter table public.vendas_recibos_rateio
  add column if not exists conciliacao_recibo_id uuid null references public.conciliacao_recibos(id) on delete cascade;

-- Compat: ambientes que criaram a coluna como not null anteriormente.
alter table public.vendas_recibos_rateio
  alter column venda_recibo_id drop not null;

alter table public.vendas_recibos_rateio
  drop constraint if exists vendas_recibos_rateio_venda_recibo_uk;

-- Exatamente um tipo de recibo por linha de rateio.
alter table public.vendas_recibos_rateio
  drop constraint if exists vendas_recibos_rateio_source_chk;

alter table public.vendas_recibos_rateio
  add constraint vendas_recibos_rateio_source_chk check (
    ((venda_recibo_id is not null)::int + (conciliacao_recibo_id is not null)::int) = 1
  );

create unique index if not exists uq_vendas_recibos_rateio_venda_recibo
  on public.vendas_recibos_rateio(venda_recibo_id)
  where venda_recibo_id is not null;

create unique index if not exists uq_vendas_recibos_rateio_conciliacao_recibo
  on public.vendas_recibos_rateio(conciliacao_recibo_id)
  where conciliacao_recibo_id is not null;

create index if not exists idx_vendas_recibos_rateio_company
  on public.vendas_recibos_rateio(company_id);
create index if not exists idx_vendas_recibos_rateio_destino
  on public.vendas_recibos_rateio(vendedor_destino_id);
create index if not exists idx_vendas_recibos_rateio_origem
  on public.vendas_recibos_rateio(vendedor_origem_id);

create or replace function public.touch_vendas_recibos_rateio_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_vendas_recibos_rateio_updated_at on public.vendas_recibos_rateio;
create trigger trg_touch_vendas_recibos_rateio_updated_at
before update on public.vendas_recibos_rateio
for each row
execute function public.touch_vendas_recibos_rateio_updated_at();

alter table public.vendas_recibos_rateio enable row level security;

drop policy if exists "vendas_recibos_rateio_select_company" on public.vendas_recibos_rateio;
create policy "vendas_recibos_rateio_select_company"
on public.vendas_recibos_rateio
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.active = true
      and u.company_id = vendas_recibos_rateio.company_id
  )
);

drop policy if exists "vendas_recibos_rateio_insert_company" on public.vendas_recibos_rateio;
create policy "vendas_recibos_rateio_insert_company"
on public.vendas_recibos_rateio
for insert
to authenticated
with check (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.active = true
      and u.company_id = vendas_recibos_rateio.company_id
  )
);

drop policy if exists "vendas_recibos_rateio_update_company" on public.vendas_recibos_rateio;
create policy "vendas_recibos_rateio_update_company"
on public.vendas_recibos_rateio
for update
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.active = true
      and u.company_id = vendas_recibos_rateio.company_id
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.active = true
      and u.company_id = vendas_recibos_rateio.company_id
  )
);

drop policy if exists "vendas_recibos_rateio_delete_company" on public.vendas_recibos_rateio;
create policy "vendas_recibos_rateio_delete_company"
on public.vendas_recibos_rateio
for delete
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.active = true
      and u.company_id = vendas_recibos_rateio.company_id
  )
);
