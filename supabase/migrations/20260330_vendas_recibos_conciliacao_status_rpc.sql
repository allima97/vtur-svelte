-- 2026-03-30: expõe somente o status de conciliação dos recibos visíveis ao usuário
-- sem abrir acesso direto aos dados financeiros de public.conciliacao_recibos.

create or replace function public.vendas_recibos_conciliacao_status(p_recibo_ids uuid[])
returns table (recibo_id uuid, conciliado boolean)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  with ctx as (
    select
      auth.uid() as uid,
      public.current_company_id() as company_id,
      coalesce(
        (select u.uso_individual from public.users u where u.id = auth.uid()),
        false
      ) as uso_individual,
      exists (
        select 1
        from public.modulo_acesso ma
        where ma.usuario_id = auth.uid()
          and coalesce(ma.ativo, true) = true
          and lower(coalesce(ma.modulo, '')) in ('vendas', 'vendas_consulta')
          and coalesce(ma.permissao, 'none') <> 'none'
      ) as has_vendas_access
  ),
  allowed as (
    select *
    from ctx
    where uid is not null
      and (
        has_vendas_access
        or public.is_admin(uid)
        or public.is_master(uid)
      )
  ),
  visible_receipts as (
    select distinct vr.id as recibo_id
    from allowed a
    join public.vendas_recibos vr
      on vr.id = any(coalesce(p_recibo_ids, array[]::uuid[]))
    join public.vendas v
      on v.id = vr.venda_id
    where
      public.is_admin(a.uid)
      or (
        public.is_master(a.uid)
        and public.master_can_access_company(a.uid, v.company_id)
      )
      or (
        a.uso_individual = true
        and v.company_id = a.company_id
        and v.vendedor_id = a.uid
      )
      or (
        public.is_gestor(a.uid)
        and v.company_id = a.company_id
        and (
          v.vendedor_id = a.uid
          or v.vendedor_id in (
            select gv.vendedor_id
            from public.gestor_equipe_vendedor_ids(a.uid) gv
          )
        )
      )
  ),
  conc as (
    select distinct c.venda_recibo_id as recibo_id
    from public.conciliacao_recibos c
    join visible_receipts vr
      on vr.recibo_id = c.venda_recibo_id
    where coalesce(c.conciliado, false) = true
  )
  select
    vr.recibo_id,
    (conc.recibo_id is not null) as conciliado
  from visible_receipts vr
  left join conc
    on conc.recibo_id = vr.recibo_id;
$$;

grant execute on function public.vendas_recibos_conciliacao_status(uuid[]) to authenticated;
