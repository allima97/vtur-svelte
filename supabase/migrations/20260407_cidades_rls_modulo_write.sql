-- 2026-04-07: permite escrita em cidades para usuarios com permissao de modulo
-- Motivo: o front usa Supabase no browser para CRUD de cidades e a policy antiga
-- aceitava apenas is_admin(auth.uid()), gerando 403 para perfis com modulo ativo.

alter table if exists public.cidades enable row level security;

drop policy if exists "cidades_write" on public.cidades;
create policy "cidades_write" on public.cidades
  for all
  using (
    is_admin(auth.uid())
    or is_master(auth.uid())
    or exists (
      select 1
      from public.modulo_acesso ma
      where ma.usuario_id = auth.uid()
        and ma.ativo = true
        and coalesce(ma.permissao, 'none') in ('view', 'create', 'edit', 'delete', 'admin')
        and lower(coalesce(ma.modulo, '')) in ('cadastros_cidades', 'cidades', 'cadastros')
    )
  )
  with check (
    is_admin(auth.uid())
    or is_master(auth.uid())
    or exists (
      select 1
      from public.modulo_acesso ma
      where ma.usuario_id = auth.uid()
        and ma.ativo = true
        and coalesce(ma.permissao, 'none') in ('create', 'edit', 'delete', 'admin')
        and lower(coalesce(ma.modulo, '')) in ('cadastros_cidades', 'cidades', 'cadastros')
    )
  );
