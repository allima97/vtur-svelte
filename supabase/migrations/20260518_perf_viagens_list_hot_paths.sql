-- 2026-05-18: índices para listagem de Viagens.
-- A tela de Viagens carrega escopos de gestor/master por empresa, ordenando por
-- embarque, retorno ou cadastro e enriquecendo passageiros por viagem.

do $$
begin
  if to_regclass('public.viagens') is not null then
    execute 'create index if not exists idx_viagens_company_created_at_desc on public.viagens (company_id, created_at desc) where company_id is not null and created_at is not null';
    execute 'create index if not exists idx_viagens_company_data_fim on public.viagens (company_id, data_fim) where company_id is not null and data_fim is not null';
    execute 'create index if not exists idx_viagens_company_status_data_inicio on public.viagens (company_id, status, data_inicio) where company_id is not null and data_inicio is not null';
  end if;

  if to_regclass('public.viagem_passageiros') is not null then
    execute 'create index if not exists idx_viagem_passageiros_viagem_id on public.viagem_passageiros (viagem_id) where viagem_id is not null';
  end if;
end $$;
