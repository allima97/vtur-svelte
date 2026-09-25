// Migrado para Hono de src/routes/api/v1/importar-vendas/+server.ts — corpo IDÊNTICO ao original
// (só nome/assinatura do handler e caminhos de import mudaram). Ver src/lib/server/api/app.ts.
import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { rejectCrossOriginRequest } from '$lib/server/requestGuards';

export const handleImportarVendasPost = async ({ request }: RequestEvent) => {
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
