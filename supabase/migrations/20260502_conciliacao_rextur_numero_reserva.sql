-- Persiste o localizador de importacoes REXTUR na conciliacao.
-- O documento fica canonico como "REXTUR"; o localizador fica em numero_reserva.

alter table public.conciliacao_recibos
  add column if not exists numero_reserva text;

comment on column public.conciliacao_recibos.numero_reserva is
  'Localizador/reserva associado ao documento da conciliacao. Para REXTUR, documento = REXTUR e numero_reserva = LOC.';

create index if not exists conciliacao_recibos_company_doc_reserva_idx
  on public.conciliacao_recibos(company_id, documento, numero_reserva, movimento_data desc)
  where numero_reserva is not null;
