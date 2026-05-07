-- 2026-05-07: rescue idempotente para ambientes sem public.user_convites.
-- Consolida:
-- - 20260211_user_convites.sql
-- - 20260311_user_convites_expiration.sql
-- - 20260504_invite_only_signup_guard.sql
-- - 20260506_user_convites_uso_individual.sql

create table if not exists public.user_convites (
  id uuid primary key default gen_random_uuid(),
  invited_user_id uuid references public.users(id) on delete set null,
  invited_email text not null,
  company_id uuid references public.companies(id) on delete cascade,
  user_type_id uuid references public.user_types(id),
  invited_by uuid not null references public.users(id) on delete cascade,
  invited_by_role text not null default 'GESTOR',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  cancelled_at timestamptz,
  expires_at timestamptz not null default (now() + interval '1 hour'),
  uso_individual boolean not null default false
);

alter table public.user_convites
  add column if not exists invited_user_id uuid references public.users(id) on delete set null,
  add column if not exists invited_email text,
  add column if not exists company_id uuid references public.companies(id) on delete cascade,
  add column if not exists user_type_id uuid references public.user_types(id),
  add column if not exists invited_by uuid references public.users(id) on delete cascade,
  add column if not exists invited_by_role text not null default 'GESTOR',
  add column if not exists status text not null default 'pending',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists accepted_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists uso_individual boolean not null default false;

update public.user_convites
   set expires_at = coalesce(expires_at, created_at + interval '1 hour')
 where expires_at is null;

alter table public.user_convites
  alter column invited_email set not null,
  alter column invited_by set not null,
  alter column invited_by_role set not null,
  alter column invited_by_role set default 'GESTOR',
  alter column status set not null,
  alter column status set default 'pending',
  alter column created_at set not null,
  alter column created_at set default now(),
  alter column expires_at set not null,
  alter column expires_at set default (now() + interval '1 hour'),
  alter column uso_individual set not null,
  alter column uso_individual set default false;

alter table public.user_convites
  alter column company_id drop not null;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conrelid = 'public.user_convites'::regclass
       and conname = 'user_convites_invited_by_role_chk'
  ) then
    alter table public.user_convites
      add constraint user_convites_invited_by_role_chk
      check (upper(invited_by_role) in ('ADMIN', 'MASTER', 'GESTOR'));
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conrelid = 'public.user_convites'::regclass
       and conname = 'user_convites_status_chk'
  ) then
    alter table public.user_convites
      add constraint user_convites_status_chk
      check (lower(status) in ('pending', 'accepted', 'cancelled'));
  end if;
end $$;

create index if not exists user_convites_company_status_idx
  on public.user_convites(company_id, status, created_at desc);

create index if not exists user_convites_invited_by_idx
  on public.user_convites(invited_by, status, created_at desc);

create index if not exists user_convites_expires_at_idx
  on public.user_convites(expires_at);

create unique index if not exists user_convites_pending_email_company_uidx
  on public.user_convites(lower(invited_email), company_id)
  where lower(status) = 'pending'
    and coalesce(uso_individual, false) = false
    and company_id is not null;

create unique index if not exists user_convites_pending_email_individual_uidx
  on public.user_convites(lower(invited_email))
  where lower(status) = 'pending'
    and coalesce(uso_individual, false) = true
    and company_id is null;

create or replace function public.user_profile_basico_completo(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.users u
    where u.id = uid
      and coalesce(trim(u.nome_completo), '') <> ''
      and coalesce(trim(u.telefone), '') <> ''
      and coalesce(trim(u.cidade), '') <> ''
      and coalesce(trim(u.estado), '') <> ''
      and u.uso_individual is not null
  );
$$;

create or replace function public.sync_user_convites_status()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if public.user_profile_basico_completo(new.id) then
    update public.user_convites
       set status = 'accepted',
           accepted_at = coalesce(accepted_at, now())
     where invited_user_id = new.id
       and lower(status) = 'pending';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_user_convites_status on public.users;
create trigger trg_sync_user_convites_status
after insert or update of nome_completo, telefone, cidade, estado, uso_individual
on public.users
for each row
execute function public.sync_user_convites_status();

create or replace function public.ensure_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  convite public.user_convites%rowtype;
  raw_nome text;
  convite_uso_individual boolean;
begin
  perform set_config('row_security', 'off', true);

  raw_nome := coalesce(
    nullif(trim(new.raw_user_meta_data->>'nome_completo'), ''),
    nullif(trim(new.raw_user_meta_data->>'nome'), '')
  );

  select uc.*
    into convite
    from public.user_convites uc
   where lower(trim(uc.invited_email)) = lower(trim(new.email))
     and lower(coalesce(uc.status, '')) = 'pending'
     and (uc.expires_at is null or uc.expires_at > now())
   order by uc.created_at desc
   limit 1;

  convite_uso_individual := coalesce(convite.uso_individual, false);

  insert into public.users (
    id,
    email,
    nome_completo,
    uso_individual,
    company_id,
    user_type_id,
    active,
    created_by_gestor,
    created_at,
    updated_at
  )
  values (
    new.id,
    lower(new.email),
    raw_nome,
    case when convite.id is not null then convite_uso_individual else true end,
    case when convite.id is not null and not convite_uso_individual then convite.company_id else null end,
    case when convite.id is not null then convite.user_type_id else null end,
    case when convite.id is not null then true else false end,
    case when upper(coalesce(convite.invited_by_role, '')) = 'GESTOR' then true else false end,
    timezone('UTC', now()),
    timezone('UTC', now())
  )
  on conflict (id) do update
    set
      email = excluded.email,
      nome_completo = coalesce(nullif(excluded.nome_completo, ''), users.nome_completo),
      updated_at = timezone('UTC', now()),
      uso_individual = case
        when convite.id is not null then convite_uso_individual
        else coalesce(users.uso_individual, excluded.uso_individual, true)
      end,
      company_id = case
        when convite.id is not null and not convite_uso_individual then convite.company_id
        when convite.id is not null and convite_uso_individual then null
        else users.company_id
      end,
      user_type_id = case
        when convite.id is not null then convite.user_type_id
        else users.user_type_id
      end,
      active = case
        when convite.id is not null then true
        else coalesce(users.active, excluded.active, false)
      end,
      created_by_gestor = case
        when convite.id is not null then upper(coalesce(convite.invited_by_role, '')) = 'GESTOR'
        else coalesce(users.created_by_gestor, excluded.created_by_gestor, false)
      end;

  if convite.id is not null then
    update public.user_convites
       set invited_user_id = coalesce(invited_user_id, new.id)
     where id = convite.id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ensure_user_profile on auth.users;
create trigger trg_ensure_user_profile
  after insert on auth.users
  for each row
  execute function public.ensure_user_profile();

alter table public.user_convites enable row level security;

drop policy if exists "user_convites_select" on public.user_convites;
create policy "user_convites_select" on public.user_convites
for select using (
  is_admin(auth.uid())
  or invited_by = auth.uid()
  or (company_id is not null and is_master(auth.uid()) and public.master_can_access_company(auth.uid(), company_id))
  or (company_id is not null and is_gestor(auth.uid()) and company_id = public.current_company_id())
);

drop policy if exists "user_convites_insert" on public.user_convites;
create policy "user_convites_insert" on public.user_convites
for insert with check (
  is_admin(auth.uid())
  or (
    invited_by = auth.uid()
    and company_id is not null
    and (
      (is_master(auth.uid()) and public.master_can_access_company(auth.uid(), company_id))
      or (is_gestor(auth.uid()) and company_id = public.current_company_id())
    )
  )
);

drop policy if exists "user_convites_update" on public.user_convites;
create policy "user_convites_update" on public.user_convites
for update using (
  is_admin(auth.uid())
  or invited_by = auth.uid()
)
with check (
  is_admin(auth.uid())
  or invited_by = auth.uid()
);
