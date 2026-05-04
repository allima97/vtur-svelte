import { json } from '@sveltejs/kit';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { deletePasskey, listPasskeys, toPasskeyErrorResponse } from '$lib/server/passkeys';
import { isSameOriginRequest } from '$lib/server/requestGuards';
import type { RequestHandler } from './$types';

async function getCurrentUser(event: Parameters<RequestHandler>[0]) {
  const { session, user } = await event.locals.safeGetSession();
  if (!session || !user) {
    return null;
  }

  return user;
}

export const GET: RequestHandler = async (event) => {
  try {
    const user = await getCurrentUser(event);
    if (!user) {
      return json({ error: 'Sessao invalida.' }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const passkeys = await listPasskeys(user.id);
    return json({ ok: true, passkeys }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toPasskeyErrorResponse(err, 'Erro ao carregar passkeys.');
  }
};

export const DELETE: RequestHandler = async (event) => {
  try {
    if (!isSameOriginRequest(event.request)) {
      return json({ error: 'Origem inválida.' }, { status: 403, headers: NO_STORE_HEADERS });
    }

    const user = await getCurrentUser(event);
    if (!user) {
      return json({ error: 'Sessao invalida.' }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const contentLength = Number(event.request.headers.get('content-length') || 0);
    if (Number.isFinite(contentLength) && contentLength > 8 * 1024) {
      return json({ error: 'Payload muito grande.' }, { status: 413, headers: NO_STORE_HEADERS });
    }

    const body = await event.request.json().catch(() => ({}));
    const id = String(body?.id || '').trim();
    if (!id) {
      return json({ error: 'Passkey obrigatoria.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    await deletePasskey(user.id, id);
    return json({ ok: true }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toPasskeyErrorResponse(err, 'Erro ao remover passkey.');
  }
};
