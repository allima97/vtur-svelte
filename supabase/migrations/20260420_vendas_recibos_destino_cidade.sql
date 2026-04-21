alter table public.vendas_recibos
  add column if not exists destino_cidade_id uuid references public.cidades(id) on delete set null;

update public.vendas_recibos vr
set destino_cidade_id = v.destino_cidade_id
from public.vendas v
where v.id = vr.venda_id
  and vr.destino_cidade_id is null
  and v.destino_cidade_id is not null;

create index if not exists idx_vendas_recibos_destino_cidade
  on public.vendas_recibos (destino_cidade_id);

comment on column public.vendas_recibos.destino_cidade_id is
  'Cidade de destino do recibo. Quando nulo, o sistema pode usar a cidade padrao da venda como fallback.';
