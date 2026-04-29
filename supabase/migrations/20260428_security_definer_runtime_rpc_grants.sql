-- 2026-04-28: Regrant minimo de RPCs SECURITY DEFINER usados em runtime autenticado.
-- Contexto: hardening removeu EXECUTE de SECURITY DEFINER para PUBLIC/anon/authenticated.
-- Este ajuste reabre apenas o necessario para fluxos autenticados do app.

revoke execute on function public.mural_recados_mark_read(uuid) from public;
revoke execute on function public.mural_recados_mark_read(uuid) from anon;
revoke execute on function public.set_gestor_vendedor_relacao(uuid, uuid, boolean) from public;
revoke execute on function public.set_gestor_vendedor_relacao(uuid, uuid, boolean) from anon;

grant execute on function public.mural_recados_mark_read(uuid) to authenticated;
grant execute on function public.set_gestor_vendedor_relacao(uuid, uuid, boolean) to authenticated;
