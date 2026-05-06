-- 2026-05-06: permite convites ADMIN para usuarios de uso individual.

alter table public.user_convites
  add column if not exists uso_individual boolean not null default false;

alter table public.user_convites
  alter column company_id drop not null;

create unique index if not exists user_convites_pending_email_individual_uidx
  on public.user_convites(lower(invited_email))
  where lower(status) = 'pending'
    and uso_individual = true
    and company_id is null;

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
