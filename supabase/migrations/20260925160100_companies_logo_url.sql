-- Logo da empresa. O código já lê companies.logo_url (parametros/empresa, crm/library,
-- clientes/templates-send, cards/_render) e trata a coluna ausente como "sem logo".
-- Coluna opcional: nada muda até alguém preencher o valor.
alter table public.companies add column if not exists logo_url text;

comment on column public.companies.logo_url is 'URL pública do logo da empresa (opcional). Lida por parâmetros da empresa, CRM e cartões.';
