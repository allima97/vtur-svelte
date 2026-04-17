-- 2026-04-08: Gestores da mesma empresa podem visualizar as vendas uns dos outros.
-- Regra de negocio: a visibilidade de gestor nao pode ocultar vendas registradas por
-- outros gestores ativos da mesma company em relatorios, dashboards e telas que usam
-- o escopo public.gestor_equipe_vendedor_ids(...).

create or replace function public.gestor_equipe_gestor_ids(uid uuid)
returns table (gestor_id uuid)
language sql stable security definer
set search_path = public
as $$
  with recursive allowed as (
    select
      (
        uid = auth.uid()
        or is_admin(auth.uid())
        or (is_master(auth.uid()) and public.master_can_access_user(auth.uid(), uid))
      ) as ok
  ),
  recursive_links as (
    select l.gestor_id, l.gestor_base_id, array[l.gestor_id] as path
    from public.gestor_equipe_compartilhada l
    join allowed a on a.ok
    where l.gestor_id = uid
    union all
    select l2.gestor_id, l2.gestor_base_id, rl.path || l2.gestor_id
    from public.gestor_equipe_compartilhada l2
    join recursive_links rl on l2.gestor_id = rl.gestor_base_id
    where not (l2.gestor_id = any(rl.path))
      and array_length(rl.path, 1) < 10
  ),
  base as (
    select coalesce(
      (
        select rl.gestor_base_id
        from recursive_links rl
        order by array_length(rl.path, 1) desc
        limit 1
      ),
      uid
    ) as gestor_base_id
  ),
  tree as (
    select b.gestor_base_id as gestor_id, array[b.gestor_base_id] as path
    from base b
    union all
    select l.gestor_id, t.path || l.gestor_id
    from public.gestor_equipe_compartilhada l
    join tree t on l.gestor_base_id = t.gestor_id
    where not (l.gestor_id = any(t.path))
      and array_length(t.path, 1) < 50
  ),
  target_company as (
    select u.company_id
    from public.users u
    join allowed a on a.ok
    where u.id = uid
  ),
  same_company_gestores as (
    select distinct u.id as gestor_id
    from public.users u
    join public.user_types ut on ut.id = u.user_type_id
    join target_company tc on tc.company_id is not null and u.company_id = tc.company_id
    join allowed a on a.ok
    where upper(coalesce(ut.name, '')) like '%GESTOR%'
      and coalesce(u.active, true) = true
  )
  select distinct gestor_id
  from (
    select t.gestor_id
    from tree t
    join allowed a on a.ok

    union

    select scg.gestor_id
    from same_company_gestores scg
  ) scope;
$$;

create or replace function public.gestor_equipe_vendedor_ids(uid uuid)
returns table (vendedor_id uuid)
language sql stable security definer
set search_path = public
as $$
  with recursive allowed as (
    select
      (
        uid = auth.uid()
        or is_admin(auth.uid())
        or (is_master(auth.uid()) and public.master_can_access_user(auth.uid(), uid))
      ) as ok
  ),
  recursive_links as (
    select l.gestor_id, l.gestor_base_id, array[l.gestor_id] as path
    from public.gestor_equipe_compartilhada l
    join allowed a on a.ok
    where l.gestor_id = uid
    union all
    select l2.gestor_id, l2.gestor_base_id, rl.path || l2.gestor_id
    from public.gestor_equipe_compartilhada l2
    join recursive_links rl on l2.gestor_id = rl.gestor_base_id
    where not (l2.gestor_id = any(rl.path))
      and array_length(rl.path, 1) < 10
  ),
  base as (
    select coalesce(
      (
        select rl.gestor_base_id
        from recursive_links rl
        order by array_length(rl.path, 1) desc
        limit 1
      ),
      uid
    ) as gestor_base_id
  ),
  target_company as (
    select u.company_id
    from public.users u
    join allowed a on a.ok
    where u.id = uid
  ),
  explicit_team as (
    select distinct gv.vendedor_id
    from public.gestor_vendedor gv
    join base b on true
    join allowed a on a.ok
    where gv.gestor_id = b.gestor_base_id
      and coalesce(gv.ativo, true) = true
  ),
  same_company_gestores as (
    select distinct u.id as vendedor_id
    from public.users u
    join public.user_types ut on ut.id = u.user_type_id
    join target_company tc on tc.company_id is not null and u.company_id = tc.company_id
    join allowed a on a.ok
    where upper(coalesce(ut.name, '')) like '%GESTOR%'
      and coalesce(u.active, true) = true
  )
  select distinct vendedor_id
  from (
    select et.vendedor_id from explicit_team et

    union

    select scg.vendedor_id from same_company_gestores scg

    union

    select uid as vendedor_id
    from allowed a
    where a.ok
  ) scope;
$$;

grant execute on function public.gestor_equipe_gestor_ids(uuid) to authenticated;
grant execute on function public.gestor_equipe_vendedor_ids(uuid) to authenticated;