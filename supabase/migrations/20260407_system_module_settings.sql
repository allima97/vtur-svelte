-- Global module toggles (enabled/disabled) with admin-only writes.

create table if not exists public.system_module_settings (
  module_key text primary key,
  enabled boolean not null default true,
  reason text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.system_module_settings enable row level security;

-- Leitura para usuários autenticados (o front aplica bypass para ADMIN).
drop policy if exists system_module_settings_select_authenticated on public.system_module_settings;
create policy system_module_settings_select_authenticated
on public.system_module_settings
for select
to authenticated
using (true);

-- Escrita permitida apenas para ADMIN do sistema.
drop policy if exists system_module_settings_write_admin on public.system_module_settings;
create policy system_module_settings_write_admin
on public.system_module_settings
for all
to authenticated
using (
  exists (
    select 1
    from public.users u
    left join public.user_types ut on ut.id = u.user_type_id
    where u.id = auth.uid()
      and upper(coalesce(ut.name, '')) like '%ADMIN%'
  )
)
with check (
  exists (
    select 1
    from public.users u
    left join public.user_types ut on ut.id = u.user_type_id
    where u.id = auth.uid()
      and upper(coalesce(ut.name, '')) like '%ADMIN%'
  )
);

create index if not exists idx_system_module_settings_enabled
  on public.system_module_settings (enabled);
