-- Adiciona o vínculo real entre vouchers (Special Tours/Europamundo/Sato Tours)
-- e a viagem à qual pertencem. Até aqui a tabela `vouchers` não tinha nenhuma
-- coluna que ligasse um voucher a uma viagem específica, então a seção
-- "Vouchers" da tela de detalhe da viagem (/operacao/viagens/[id]) mostrava
-- até 20 vouchers quaisquer da empresa, sem relação nenhuma com a viagem aberta.
--
-- Nullable: vouchers continuam podendo ser criados de forma avulsa (sem viagem)
-- pela tela principal de Vouchers, mantendo o comportamento atual para esse fluxo.
alter table public.vouchers
  add column if not exists viagem_id uuid references public.viagens(id) on delete set null;

create index if not exists idx_vouchers_viagem_id
  on public.vouchers(viagem_id)
  where viagem_id is not null;
