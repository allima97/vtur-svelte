import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { checkPersistentRateLimit } from '$lib/server/persistentRateLimit';
import { logServerError } from '$lib/server/v1';
import { readJsonBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';

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
    stack: dev ? trimField(payload.stack) : '',
    page: trimField(payload.page),
    source: trimField(payload.source),
    ts: trimField(payload.ts),
    ua: trimField(payload.ua)
  };
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  try {
    const originError = rejectCrossOriginRequest(request, 'Origem inválida.');
    if (originError) return originError;

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

    const payloadResult = await readJsonBodyLimited(request, MAX_BODY_BYTES);
    if (!payloadResult.ok) return payloadResult.response;
    const payload = payloadResult.data;
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
