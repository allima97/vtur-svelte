-- Tabela para registrar dias em que NÃO HOUVE MOVIMENTO de caixa.
-- Isso permite que a conciliação avance mesmo quando há buracos de datas,
-- desde que o usuário confirme explicitamente que não houve movimento naquele dia.
-- Uma vez marcado, não é possível importar arquivo para essa data.

create table if not exists public.conciliacao_dias_sem_movimento (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  data date not null,
  marcado_por uuid references public.users(id) on delete set null,
  marcado_em timestamptz not null default now(),
  observacao text,
  unique (company_id, data)
);

comment on table public.conciliacao_dias_sem_movimento is 'Dias confirmados pelo usuário como sem movimento de caixa. Usado para liberar a sequência cronológica de conciliação.';
comment on column public.conciliacao_dias_sem_movimento.company_id is 'Empresa à qual o dia sem movimento pertence.';
comment on column public.conciliacao_dias_sem_movimento.data is 'Data (YYYY-MM-DD) em que não houve movimento.';
comment on column public.conciliacao_dias_sem_movimento.marcado_por is 'Usuário que confirmou o dia sem movimento.';
comment on column public.conciliacao_dias_sem_movimento.observacao is 'Observação opcional (ex: feriado, fechamento).'
