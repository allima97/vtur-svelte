-- 2026-05-03: hardening de RPCs antigas e buckets sensiveis.
-- Mantem o app autenticado funcionando, mas reduz superficie anonima direta no PostgREST/Storage.

do $$
begin
  if to_regprocedure('public.is_admin(uuid)') is not null then
    execute 'alter function public.is_admin(uuid) set search_path = public';
  end if;

  if to_regprocedure('public.is_gestor(uuid)') is not null then
    execute 'alter function public.is_gestor(uuid) set search_path = public';
  end if;

  if to_regprocedure('public.mural_recados_hide_for_sender(uuid)') is not null then
    execute 'alter function public.mural_recados_hide_for_sender(uuid) set search_path = public';
    execute 'revoke execute on function public.mural_recados_hide_for_sender(uuid) from public';
    execute 'revoke execute on function public.mural_recados_hide_for_sender(uuid) from anon';
    execute 'grant execute on function public.mural_recados_hide_for_sender(uuid) to authenticated';
  end if;

  if to_regprocedure('public.mural_recados_mark_read(uuid)') is not null then
    execute 'alter function public.mural_recados_mark_read(uuid) set search_path = public';
    execute 'revoke execute on function public.mural_recados_mark_read(uuid) from public';
    execute 'revoke execute on function public.mural_recados_mark_read(uuid) from anon';
    execute 'grant execute on function public.mural_recados_mark_read(uuid) to authenticated';
  end if;

  if to_regprocedure('public.mural_recados_unread_count()') is not null then
    execute 'alter function public.mural_recados_unread_count() set search_path = public';
    execute 'revoke execute on function public.mural_recados_unread_count() from public';
    execute 'revoke execute on function public.mural_recados_unread_count() from anon';
    execute 'grant execute on function public.mural_recados_unread_count() to authenticated';
  end if;

  if to_regprocedure('public.mural_recados_delete_private_unread(uuid)') is not null then
    execute 'alter function public.mural_recados_delete_private_unread(uuid) set search_path = public';
    execute 'revoke execute on function public.mural_recados_delete_private_unread(uuid) from public';
    execute 'revoke execute on function public.mural_recados_delete_private_unread(uuid) from anon';
    execute 'grant execute on function public.mural_recados_delete_private_unread(uuid) to authenticated';
  end if;

  if to_regprocedure('public.get_visible_templates(uuid)') is not null then
    execute 'alter function public.get_visible_templates(uuid) set search_path = public';
    execute 'revoke execute on function public.get_visible_templates(uuid) from public';
    execute 'revoke execute on function public.get_visible_templates(uuid) from anon';
    execute 'grant execute on function public.get_visible_templates(uuid) to authenticated';
  end if;

  if to_regprocedure('public.rpc_vendas_kpis(uuid, uuid[], date, date)') is not null then
    execute 'revoke execute on function public.rpc_vendas_kpis(uuid, uuid[], date, date) from public';
    execute 'revoke execute on function public.rpc_vendas_kpis(uuid, uuid[], date, date) from anon';
    execute 'grant execute on function public.rpc_vendas_kpis(uuid, uuid[], date, date) to authenticated';
  end if;

  if to_regprocedure('public.rpc_dashboard_vendas_summary(uuid, uuid[], date, date)') is not null then
    execute 'revoke execute on function public.rpc_dashboard_vendas_summary(uuid, uuid[], date, date) from public';
    execute 'revoke execute on function public.rpc_dashboard_vendas_summary(uuid, uuid[], date, date) from anon';
    execute 'grant execute on function public.rpc_dashboard_vendas_summary(uuid, uuid[], date, date) to authenticated';
  end if;

  if to_regprocedure('public.rpc_vendas_kpis(uuid, date, date)') is not null then
    execute 'revoke execute on function public.rpc_vendas_kpis(uuid, date, date) from public';
    execute 'revoke execute on function public.rpc_vendas_kpis(uuid, date, date) from anon';
    execute 'grant execute on function public.rpc_vendas_kpis(uuid, date, date) to authenticated';
  end if;

  if to_regprocedure('public.rpc_dashboard_vendas_summary(uuid)') is not null then
    execute 'revoke execute on function public.rpc_dashboard_vendas_summary(uuid) from public';
    execute 'revoke execute on function public.rpc_dashboard_vendas_summary(uuid) from anon';
    execute 'grant execute on function public.rpc_dashboard_vendas_summary(uuid) to authenticated';
  end if;
end $$;

-- Buckets com dados de cliente/orcamento/mensagens devem usar URLs assinadas.
update storage.buckets
set public = false
where id in ('mural-recados', 'quotes', 'voucher-assets', 'viagens-documentos');
