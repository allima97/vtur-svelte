import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
  return json(
    {
      error:
        "Este endpoint foi descontinuado. Use a importação local na tela de Importar Vendas.",
    },
    { status: 410 }
  );
};
