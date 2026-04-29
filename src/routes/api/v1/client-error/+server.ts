import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const MAX_BODY_BYTES = 8 * 1024;
const MAX_FIELD_CHARS = 1200;

function trimField(value: unknown) {
  const text = String(value ?? '').trim();
  return text.length <= MAX_FIELD_CHARS ? text : text.slice(0, MAX_FIELD_CHARS);
}

function sanitizePayload(payload: any) {
  if (!payload || typeof payload !== 'object') {
    return { message: '' };
  }

  return {
    message: trimField(payload.message),
    stack: trimField(payload.stack),
    page: trimField(payload.page),
    source: trimField(payload.source),
    ts: trimField(payload.ts),
    ua: trimField(payload.ua)
  };
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return json({ error: 'Payload muito grande.' }, { status: 413 });
    }

    const payload = await request.json().catch(() => null);
    const url = new URL(request.url);
    const safePayload = sanitizePayload(payload);

    console.error('CLIENT_ERROR', {
      url: url.pathname,
      payload: safePayload
    });
  } catch (err: any) {
    console.error('CLIENT_ERROR_PARSE', { message: err?.message ?? String(err) });
  }

  return json(null, { status: 204 });
};
