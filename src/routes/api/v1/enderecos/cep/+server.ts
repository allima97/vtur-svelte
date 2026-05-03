import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

export const GET: RequestHandler = async ({ url, fetch }) => {
  const cep = String(url.searchParams.get('cep') || '').replace(/\D/g, '');

  if (cep.length !== 8) {
    return json({ error: 'CEP invalido.' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4_000);
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: controller.signal,
      headers: {
        accept: 'application/json'
      }
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return json({ error: 'CEP indisponivel.' }, { status: 502 });
    }

    const data = (await response.json()) as ViaCepResponse;
    if (data?.erro) {
      return json({ error: 'CEP nao encontrado.' }, { status: 404 });
    }

    return json(
      {
        cep: data.cep || cep,
        logradouro: data.logradouro || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        localidade: data.localidade || '',
        uf: data.uf || ''
      },
      {
        headers: {
          'cache-control': 'private, max-age=86400'
        }
      }
    );
  } catch (err) {
    console.error('[enderecos/cep] falha ao consultar CEP', err);
    return json({ error: 'Nao foi possivel consultar o CEP.' }, { status: 502 });
  }
};
