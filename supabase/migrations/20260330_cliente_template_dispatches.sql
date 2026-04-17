-- 2026-03-30: histórico leve de disparos de templates por cliente/dia

create table if not exists public.cliente_template_dispatches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  company_id uuid null references public.companies(id) on delete set null,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  template_id uuid null references public.user_message_templates(id) on delete set null,
  canal text not null check (canal in ('whatsapp', 'email')),
  categoria text not null default '',
  status text not null default 'sent' check (status in ('opened', 'sent')),
  recipient_name text null,
  recipient_contact text null,
  subject text null,
  sent_at timestamptz not null default now(),
  sent_day date not null default ((timezone('America/Sao_Paulo', now()))::date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cliente_template_dispatches_user_day_idx
  on public.cliente_template_dispatches (user_id, sent_day, categoria);

create index if not exists cliente_template_dispatches_cliente_day_idx
  on public.cliente_template_dispatches (cliente_id, sent_day);

create unique index if not exists cliente_template_dispatches_user_cliente_categoria_day_key
  on public.cliente_template_dispatches (user_id, cliente_id, categoria, sent_day);

drop trigger if exists trg_cliente_template_dispatches_updated_at on public.cliente_template_dispatches;
create trigger trg_cliente_template_dispatches_updated_at
before update on public.cliente_template_dispatches
for each row execute function public.set_updated_at();

alter table public.cliente_template_dispatches enable row level security;

drop policy if exists cliente_template_dispatches_select on public.cliente_template_dispatches;
create policy cliente_template_dispatches_select on public.cliente_template_dispatches
for select
using (
  is_admin(auth.uid())
  or user_id = auth.uid()
);

drop policy if exists cliente_template_dispatches_insert on public.cliente_template_dispatches;
create policy cliente_template_dispatches_insert on public.cliente_template_dispatches
for insert
with check (
  is_admin(auth.uid())
  or user_id = auth.uid()
);

drop policy if exists cliente_template_dispatches_update on public.cliente_template_dispatches;
create policy cliente_template_dispatches_update on public.cliente_template_dispatches
for update
using (
  is_admin(auth.uid())
  or user_id = auth.uid()
)
with check (
  is_admin(auth.uid())
  or user_id = auth.uid()
);

grant select, insert, update on public.cliente_template_dispatches to authenticated;
