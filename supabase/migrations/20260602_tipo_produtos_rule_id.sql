-- 2026-06-02: adiciona rule_id em tipo_produtos para vincular regra de comissão do Financeiro > Regras

alter table public.tipo_produtos
  add column if not exists rule_id uuid references public.commission_rule(id) on delete set null;

create index if not exists idx_tipo_produtos_rule_id
  on public.tipo_produtos(rule_id)
  where rule_id is not null;
