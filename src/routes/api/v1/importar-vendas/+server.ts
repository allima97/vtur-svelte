import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { rejectCrossOriginRequest } from '$lib/server/requestGuards';

export const POST: RequestHandler = async ({ request }) => {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;

  return json(
    {
      error:
        "Este endpoint foi descontinuado. Use a importação local na tela de Importar Vendas.",
    },
    { status: 410, headers: NO_STORE_HEADERS }
  );
};
