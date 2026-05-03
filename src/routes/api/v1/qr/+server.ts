import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkRateLimit } from '$lib/server/rateLimit';
import { logServerError } from '$lib/server/v1';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const;

function clampInt(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export const GET: RequestHandler = async ({ url, fetch, getClientAddress }) => {
  const rateLimit = checkRateLimit(`qr:${getClientAddress() || 'unknown'}`, {
    max: 120,
    windowMs: 60_000
  });
  if (!rateLimit.allowed) {
    return json(
      { error: 'Muitas requisições. Tente novamente em instantes.' },
      {
        status: 429,
        headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rateLimit.retryAfterSeconds) }
      }
    );
  }

  const text = String(url.searchParams.get('text') || '').trim();
  if (!text) {
    return json({ error: 'Texto obrigatorio.' }, { status: 400, headers: NO_STORE_HEADERS });
  }

  if (text.length > 2048) {
    return json({ error: 'Texto muito longo para QR Code.' }, { status: 413, headers: NO_STORE_HEADERS });
  }

  const size = clampInt(url.searchParams.get('size'), 200, 96, 512);
  const margin = clampInt(url.searchParams.get('margin'), 1, 0, 8);

  try {
    const upstream = new URL('https://quickchart.io/qr');
    upstream.searchParams.set('size', String(size));
    upstream.searchParams.set('margin', String(margin));
    upstream.searchParams.set('text', text);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4_000);
    let response: Response;
    try {
      response = await fetch(upstream, {
        signal: controller.signal,
        headers: {
          accept: 'image/png'
        }
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return json({ error: 'QR Code indisponivel.' }, { status: 502, headers: NO_STORE_HEADERS });
    }

    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    if (!contentType.startsWith('image/')) {
      return json({ error: 'Resposta invalida do provedor de QR Code.' }, { status: 502, headers: NO_STORE_HEADERS });
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (Number.isFinite(contentLength) && contentLength > 1024 * 1024) {
      return json({ error: 'QR Code excede o tamanho permitido.' }, { status: 502, headers: NO_STORE_HEADERS });
    }

    const image = await response.arrayBuffer();
    if (!image.byteLength || image.byteLength > 1024 * 1024) {
      return json({ error: 'QR Code excede o tamanho permitido.' }, { status: 502, headers: NO_STORE_HEADERS });
    }

    return new Response(image, {
      headers: {
        'content-type': contentType || 'image/png',
        'cache-control': 'private, max-age=86400'
      }
    });
  } catch (err) {
    logServerError('[qr] falha ao gerar QR Code', err);
    return json({ error: 'Nao foi possivel gerar o QR Code.' }, { status: 502, headers: NO_STORE_HEADERS });
  }
};
