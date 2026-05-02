create or replace function public.vtur_resolve_viagem_status(
  p_status text,
  p_data_inicio date,
  p_data_fim date
)
returns text
language plpgsql
stable
as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_status text := lower(trim(coalesce(p_status, '')));
begin
  if v_status in ('cancelada', 'cancelado') then
    return 'cancelada';
  end if;

  if p_data_fim is not null and p_data_fim < v_hoje then
    return 'concluida';
  end if;

  if p_data_inicio is null then
    return 'pendente';
  end if;

  if p_data_inicio > v_hoje then
    return 'confirmada';
  end if;

  if p_data_fim is null or p_data_fim >= v_hoje then
    return 'em_viagem';
  end if;

  return 'concluida';
end;
$$;

create or replace function public.vtur_set_viagem_status_periodo()
returns trigger
language plpgsql
as $$
begin
  new.status := public.vtur_resolve_viagem_status(new.status, new.data_inicio, new.data_fim);
  return new;
end;
$$;

drop trigger if exists viagens_set_status_periodo on public.viagens;

create trigger viagens_set_status_periodo
before insert or update of status, data_inicio, data_fim
on public.viagens
for each row
execute function public.vtur_set_viagem_status_periodo();

with resolvidas as (
  select
    id,
    public.vtur_resolve_viagem_status(status, data_inicio, data_fim) as status_resolvido
  from public.viagens
)
update public.viagens v
set
  status = r.status_resolvido,
  updated_at = now()
from resolvidas r
where v.id = r.id
  and coalesce(v.status, '') is distinct from r.status_resolvido;
