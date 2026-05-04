import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';

export const POST: RequestHandler = async () => {
  return json(
    {
      error:
        "Este endpoint foi descontinuado. Use a importação local na tela de Importar Vendas.",
    },
    { status: 410, headers: NO_STORE_HEADERS }
  );
};
