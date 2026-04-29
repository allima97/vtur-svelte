-- Runtime compatibility after SECURITY DEFINER hardening
-- Run in Supabase SQL editor if app endpoints return:
--   "permission denied for function mural_recados_mark_read"
--   "permission denied for function set_gestor_vendedor_relacao"

revoke execute on function public.mural_recados_mark_read(uuid) from public;
revoke execute on function public.mural_recados_mark_read(uuid) from anon;
revoke execute on function public.set_gestor_vendedor_relacao(uuid, uuid, boolean) from public;
revoke execute on function public.set_gestor_vendedor_relacao(uuid, uuid, boolean) from anon;

grant execute on function public.mural_recados_mark_read(uuid) to authenticated;
grant execute on function public.set_gestor_vendedor_relacao(uuid, uuid, boolean) to authenticated;

-- Verification
select
  p.proname as function_name,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('public', p.oid, 'EXECUTE') as public_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('mural_recados_mark_read', 'set_gestor_vendedor_relacao')
order by 1;
