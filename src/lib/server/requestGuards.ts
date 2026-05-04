import { json } from '@sveltejs/kit';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';

export function isSameOriginRequest(request: Request) {
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

export function rejectCrossOriginRequest(
  request: Request,
  message = 'Origem invalida.'
): Response | null {
  if (isSameOriginRequest(request)) return null;
  return json({ error: message }, { status: 403, headers: NO_STORE_HEADERS });
}

export function rejectLargePayload(
  request: Request,
  maxBytes: number,
  message = 'Payload muito grande.'
): Response | null {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return json({ error: message }, { status: 413, headers: NO_STORE_HEADERS });
  }
  return null;
}
