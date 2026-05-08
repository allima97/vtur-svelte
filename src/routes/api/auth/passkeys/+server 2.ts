import { json } from '@sveltejs/kit';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { deletePasskey, listPasskeys, toPasskeyErrorResponse } from '$lib/server/passkeys';
import { readJsonBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';
import type { RequestHandler } from './$types';

const MAX_PASSKEY_DELETE_BODY_BYTES = 8 * 1024;

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
    const originError = rejectCrossOriginRequest(event.request, 'Origem inválida.');
    if (originError) return originError;

    const user = await getCurrentUser(event);
    if (!user) {
      return json({ error: 'Sessao invalida.' }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const bodyResult = await readJsonBodyLimited(event.request, MAX_PASSKEY_DELETE_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;
    const body = bodyResult.data && typeof bodyResult.data === 'object'
      ? (bodyResult.data as Record<string, any>)
      : {};
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
