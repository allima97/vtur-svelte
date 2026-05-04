import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';
import { checkPersistentRateLimit } from '$lib/server/persistentRateLimit';
import { logServerError } from '$lib/server/v1';

const MAX_BODY_BYTES = 8 * 1024;
const MAX_FIELD_CHARS = 1200;
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

function isSameOriginRequest(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      return new URL(origin).origin === requestUrl.origin;
    } catch {
      return false;
    }
  }

  const fetchSite = request.headers.get('sec-fetch-site');
  if (!fetchSite) return true;
  return ['same-origin', 'same-site', 'none'].includes(fetchSite);
}

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
    stack: dev ? trimField(payload.stack) : '',
    page: trimField(payload.page),
    source: trimField(payload.source),
    ts: trimField(payload.ts),
    ua: trimField(payload.ua)
  };
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  try {
    if (!isSameOriginRequest(request)) {
      return json({ error: 'Origem inválida.' }, { status: 403, headers: NO_STORE_HEADERS });
    }

    const clientAddress = getClientAddress();
    const rateLimit = await checkPersistentRateLimit('client-error', clientAddress || 'unknown', {
      max: 30,
      windowMs: 60_000
    });
    if (!rateLimit.allowed) {
      return json(
        { error: 'Muitas requisições.' },
        { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return json({ error: 'Payload muito grande.' }, { status: 413, headers: NO_STORE_HEADERS });
    }

    const payload = await request.json().catch(() => null);
    const url = new URL(request.url);
    const safePayload = sanitizePayload(payload);

    if (dev) {
      console.error('CLIENT_ERROR', {
        url: url.pathname,
        payload: safePayload
      });
    } else {
      console.warn('CLIENT_ERROR', {
        url: url.pathname,
        message: safePayload.message,
        page: safePayload.page,
        source: safePayload.source,
        ts: safePayload.ts
      });
    }
  } catch (err: any) {
    logServerError('CLIENT_ERROR_PARSE', err);
  }

  return json(null, { status: 204, headers: NO_STORE_HEADERS });
};
