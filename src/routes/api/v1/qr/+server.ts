import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function clampInt(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export const GET: RequestHandler = async ({ url, fetch }) => {
  const text = String(url.searchParams.get('text') || '').trim();
  if (!text) {
    return json({ error: 'Texto obrigatorio.' }, { status: 400 });
  }

  if (text.length > 2048) {
    return json({ error: 'Texto muito longo para QR Code.' }, { status: 413 });
  }

  const size = clampInt(url.searchParams.get('size'), 200, 96, 512);
  const margin = clampInt(url.searchParams.get('margin'), 1, 0, 8);

  try {
    const upstream = new URL('https://quickchart.io/qr');
    upstream.searchParams.set('size', String(size));
    upstream.searchParams.set('margin', String(margin));
    upstream.searchParams.set('text', text);

    const response = await fetch(upstream, {
      headers: {
        accept: 'image/png'
      }
    });

    if (!response.ok) {
      return json({ error: 'QR Code indisponivel.' }, { status: 502 });
    }

    const image = await response.arrayBuffer();
    return new Response(image, {
      headers: {
        'content-type': response.headers.get('content-type') || 'image/png',
        'cache-control': 'private, max-age=86400'
      }
    });
  } catch (err) {
    console.error('[qr] falha ao gerar QR Code', err);
    return json({ error: 'Nao foi possivel gerar o QR Code.' }, { status: 502 });
  }
};
