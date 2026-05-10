-- 2026-05-09: Permite que gestores com participa_ranking = true tenham metas
-- A constraint anterior só aceitava usuários do tipo VENDEDOR como vendedor_id.
-- Agora também aceita usuários do tipo GESTOR.

-- Remove constraint/trigger existente que valida tipo VENDEDOR (se existir)
drop trigger if exists check_metas_vendedor_tipo on public.metas_vendedor;
drop function if exists public.check_metas_vendedor_tipo();

-- Recria a função aceitando VENDEDOR e GESTOR
create or replace function public.check_metas_vendedor_tipo()
returns trigger
language plpgsql
security definer
as $$
declare
  v_tipo text;
begin
  select upper(coalesce(ut.name, ''))
  into v_tipo
  from public.users u
  left join public.user_types ut on ut.id = u.user_type_id
  where u.id = new.vendedor_id;

  if v_tipo is null then
    raise exception 'vendedor_id must reference an existing user';
  end if;

  if v_tipo not like '%VENDEDOR%' and v_tipo not like '%GESTOR%' then
    raise exception 'vendedor_id must reference a user of type VENDEDOR or GESTOR';
  end if;

  return new;
end;
$$;

-- Recria o trigger
create trigger check_metas_vendedor_tipo
  before insert or update on public.metas_vendedor
  for each row execute function public.check_metas_vendedor_tipo();
