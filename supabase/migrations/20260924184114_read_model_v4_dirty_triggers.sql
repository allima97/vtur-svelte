-- =============================================================================
-- Read model v4: marcacao de "dirty" pelo BANCO (e nao so pela aplicacao)
--
-- Problema: o dashboard le ranking_recibo_contribuicoes, controlado por
-- ranking_read_model_status (modelo = 'recibo_contribuicoes_v4'). Ate aqui o v4
-- so era marcado dirty pela aplicacao (invalidateSalesReadModels). Qualquer
-- escrita que nao passe por esse codigo (outra versao do vturapp, script SQL,
-- ajuste manual no Supabase) deixava o dashboard servindo numeros antigos.
--
-- Solucao: triggers nas tabelas que alimentam o read model marcam o(s) mes(es)
-- afetado(s) da empresa como dirty. O rebuild continua sendo feito pela
-- aplicacao (dashboard/summary e cron), exatamente como hoje.
--
-- Nao altera nenhuma tabela de negocio nem nenhum dado de venda. So cria
-- funcoes/triggers e passa fn_mark_ranking_read_model_dirty a marcar o v4.
-- =============================================================================

-- 1) Helper unico: marca (empresa, mes) do v4 como dirty ----------------------
--    Se ja esta 'dirty' nao reescreve (evita N updates na mesma linha em lote).
create or replace function public.fn_rm_v4_mark_dirty(p_company_id uuid, p_date date)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if p_company_id is null or p_date is null then
    return;
  end if;

  insert into public.ranking_read_model_status as s (
    modelo, company_id, mes, status, dirty_at, last_error
  )
  values (
    'recibo_contribuicoes_v4', p_company_id, date_trunc('month', p_date)::date, 'dirty', now(), null
  )
  on conflict (modelo, company_id, mes) do update
    set status = 'dirty',
        dirty_at = now(),
        last_error = null,
        updated_at = now()
    where s.status is distinct from 'dirty';
end;
$$;

revoke all on function public.fn_rm_v4_mark_dirty(uuid, date) from public, anon, authenticated;
grant execute on function public.fn_rm_v4_mark_dirty(uuid, date) to service_role;

-- 2) RPC ja usada pela aplicacao (vendasSave.markRankingReadModelDirty) --------
--    Mantem a assinatura; antes marcava o v1 (que o dashboard nao usa).
create or replace function public.fn_mark_ranking_read_model_dirty(p_company_id uuid, p_date date)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform public.fn_rm_v4_mark_dirty(p_company_id, p_date);
end;
$$;

-- 3) Helpers de resolucao de mes ----------------------------------------------

-- Mes(es) de uma venda: data_venda da venda + data_venda de cada recibo dela.
create or replace function public.fn_rm_v4_mark_venda(p_venda_id uuid, p_company_id uuid, p_data_venda date)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r record;
begin
  if p_company_id is null then
    return;
  end if;
  perform public.fn_rm_v4_mark_dirty(p_company_id, p_data_venda);
  if p_venda_id is null then
    return;
  end if;
  for r in
    select distinct date_trunc('month', vr.data_venda)::date as mes
    from public.vendas_recibos vr
    where vr.venda_id = p_venda_id
      and vr.data_venda is not null
  loop
    perform public.fn_rm_v4_mark_dirty(p_company_id, r.mes);
  end loop;
end;
$$;

-- Mes de um recibo: data_venda do recibo (fallback: data_venda da venda).
create or replace function public.fn_rm_v4_mark_recibo(p_recibo_id uuid, p_company_id uuid default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_company uuid;
  v_data date;
begin
  if p_recibo_id is null then
    return;
  end if;
  select coalesce(p_company_id, v.company_id), coalesce(vr.data_venda, v.data_venda)
    into v_company, v_data
  from public.vendas_recibos vr
  left join public.vendas v on v.id = vr.venda_id
  where vr.id = p_recibo_id;
  perform public.fn_rm_v4_mark_dirty(v_company, v_data);
end;
$$;

revoke all on function public.fn_rm_v4_mark_venda(uuid, uuid, date) from public, anon, authenticated;
revoke all on function public.fn_rm_v4_mark_recibo(uuid, uuid) from public, anon, authenticated;
grant execute on function public.fn_rm_v4_mark_venda(uuid, uuid, date) to service_role;
grant execute on function public.fn_rm_v4_mark_recibo(uuid, uuid) to service_role;

-- 4) Funcoes de trigger -------------------------------------------------------

-- vendas: AFTER INSERT/UPDATE + BEFORE DELETE
-- (BEFORE DELETE porque o ON DELETE CASCADE remove os recibos antes de um
--  AFTER DELETE conseguir ler os meses deles)
create or replace function public.trg_rm_v4_vendas()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.fn_rm_v4_mark_venda(old.id, old.company_id, old.data_venda);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.fn_rm_v4_mark_venda(new.id, new.company_id, new.data_venda);
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return null;
end;
$$;

-- vendas_recibos: empresa vem da venda
create or replace function public.trg_rm_v4_vendas_recibos()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_company uuid;
  v_data date;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select v.company_id, v.data_venda into v_company, v_data
    from public.vendas v where v.id = old.venda_id;
    perform public.fn_rm_v4_mark_dirty(v_company, coalesce(old.data_venda, v_data));
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    select v.company_id, v.data_venda into v_company, v_data
    from public.vendas v where v.id = new.venda_id;
    perform public.fn_rm_v4_mark_dirty(v_company, coalesce(new.data_venda, v_data));
  end if;
  return null;
end;
$$;

-- vendas_recibos_rateio: mes do recibo e/ou do movimento da conciliacao
create or replace function public.trg_rm_v4_vendas_recibos_rateio()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_mov date;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.fn_rm_v4_mark_recibo(old.venda_recibo_id, old.company_id);
    if old.conciliacao_recibo_id is not null then
      select cr.movimento_data into v_mov from public.conciliacao_recibos cr where cr.id = old.conciliacao_recibo_id;
      perform public.fn_rm_v4_mark_dirty(old.company_id, v_mov);
    end if;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.fn_rm_v4_mark_recibo(new.venda_recibo_id, new.company_id);
    if new.conciliacao_recibo_id is not null then
      select cr.movimento_data into v_mov from public.conciliacao_recibos cr where cr.id = new.conciliacao_recibo_id;
      perform public.fn_rm_v4_mark_dirty(new.company_id, v_mov);
    end if;
  end if;
  return null;
end;
$$;

-- conciliacao_recibos: mes do movimento + mes do recibo/venda vinculados
create or replace function public.trg_rm_v4_conciliacao_recibos()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_data date;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.fn_rm_v4_mark_dirty(old.company_id, old.movimento_data);
    perform public.fn_rm_v4_mark_recibo(old.venda_recibo_id, old.company_id);
    if old.venda_id is not null then
      select v.data_venda into v_data from public.vendas v where v.id = old.venda_id;
      perform public.fn_rm_v4_mark_dirty(old.company_id, v_data);
    end if;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.fn_rm_v4_mark_dirty(new.company_id, new.movimento_data);
    perform public.fn_rm_v4_mark_recibo(new.venda_recibo_id, new.company_id);
    if new.venda_id is not null then
      select v.data_venda into v_data from public.vendas v where v.id = new.venda_id;
      perform public.fn_rm_v4_mark_dirty(new.company_id, v_data);
    end if;
  end if;
  return null;
end;
$$;

-- vendas_recibos_complementares: vinculo recibo complementar <-> venda
create or replace function public.trg_rm_v4_vendas_recibos_complementares()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_company uuid;
  v_data date;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select v.company_id, v.data_venda into v_company, v_data from public.vendas v where v.id = old.venda_id;
    perform public.fn_rm_v4_mark_dirty(v_company, v_data);
    perform public.fn_rm_v4_mark_recibo(old.recibo_id, v_company);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    select v.company_id, v.data_venda into v_company, v_data from public.vendas v where v.id = new.venda_id;
    perform public.fn_rm_v4_mark_dirty(v_company, v_data);
    perform public.fn_rm_v4_mark_recibo(new.recibo_id, v_company);
  end if;
  return null;
end;
$$;

-- 5) Triggers -----------------------------------------------------------------
drop trigger if exists trg_rm_v4_vendas_aiu on public.vendas;
create trigger trg_rm_v4_vendas_aiu
  after insert or update on public.vendas
  for each row execute function public.trg_rm_v4_vendas();

drop trigger if exists trg_rm_v4_vendas_bd on public.vendas;
create trigger trg_rm_v4_vendas_bd
  before delete on public.vendas
  for each row execute function public.trg_rm_v4_vendas();

drop trigger if exists trg_rm_v4_vendas_recibos on public.vendas_recibos;
create trigger trg_rm_v4_vendas_recibos
  after insert or update or delete on public.vendas_recibos
  for each row execute function public.trg_rm_v4_vendas_recibos();

drop trigger if exists trg_rm_v4_vendas_recibos_rateio on public.vendas_recibos_rateio;
create trigger trg_rm_v4_vendas_recibos_rateio
  after insert or update or delete on public.vendas_recibos_rateio
  for each row execute function public.trg_rm_v4_vendas_recibos_rateio();

drop trigger if exists trg_rm_v4_conciliacao_recibos on public.conciliacao_recibos;
create trigger trg_rm_v4_conciliacao_recibos
  after insert or update or delete on public.conciliacao_recibos
  for each row execute function public.trg_rm_v4_conciliacao_recibos();

drop trigger if exists trg_rm_v4_vendas_recibos_complementares on public.vendas_recibos_complementares;
create trigger trg_rm_v4_vendas_recibos_complementares
  after insert or update or delete on public.vendas_recibos_complementares
  for each row execute function public.trg_rm_v4_vendas_recibos_complementares();

-- Rollback (se necessario):
--   drop trigger if exists trg_rm_v4_vendas_aiu on public.vendas;
--   drop trigger if exists trg_rm_v4_vendas_bd on public.vendas;
--   drop trigger if exists trg_rm_v4_vendas_recibos on public.vendas_recibos;
--   drop trigger if exists trg_rm_v4_vendas_recibos_rateio on public.vendas_recibos_rateio;
--   drop trigger if exists trg_rm_v4_conciliacao_recibos on public.conciliacao_recibos;
--   drop trigger if exists trg_rm_v4_vendas_recibos_complementares on public.vendas_recibos_complementares;
--   (e recriar fn_mark_ranking_read_model_dirty com 'recibo_contribuicoes_v1')
