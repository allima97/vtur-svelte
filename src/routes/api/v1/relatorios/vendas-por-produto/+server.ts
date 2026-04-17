import type { RequestEvent } from '@sveltejs/kit';
import { GET as produtosGET } from '../produtos/+server';

function buildForwardUrl(event: RequestEvent) {
  const url = new URL(event.url);
  const inicio = url.searchParams.get('inicio');
  const fim = url.searchParams.get('fim');
  const companyId = url.searchParams.get('company_id');
  if (inicio && !url.searchParams.get('data_inicio')) url.searchParams.set('data_inicio', inicio);
  if (fim && !url.searchParams.get('data_fim')) url.searchParams.set('data_fim', fim);
  if (companyId && !url.searchParams.get('empresa_id')) url.searchParams.set('empresa_id', companyId);
  return url;
}

export async function GET(event: RequestEvent) {
  return produtosGET({ ...event, url: buildForwardUrl(event) } as any);
}
