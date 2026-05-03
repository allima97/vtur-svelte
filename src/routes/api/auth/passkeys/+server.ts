import { json } from '@sveltejs/kit';
import { deletePasskey, listPasskeys, toPasskeyErrorResponse } from '$lib/server/passkeys';
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
      return json({ error: 'Sessao invalida.' }, { status: 401 });
    }

    const passkeys = await listPasskeys(user.id);
    return json({ ok: true, passkeys });
  } catch (err) {
    return toPasskeyErrorResponse(err, 'Erro ao carregar passkeys.');
  }
};

export const DELETE: RequestHandler = async (event) => {
  try {
    const user = await getCurrentUser(event);
    if (!user) {
      return json({ error: 'Sessao invalida.' }, { status: 401 });
    }

    const body = await event.request.json().catch(() => ({}));
    const id = String(body?.id || '').trim();
    if (!id) {
      return json({ error: 'Passkey obrigatoria.' }, { status: 400 });
    }

    await deletePasskey(user.id, id);
    return json({ ok: true });
  } catch (err) {
    return toPasskeyErrorResponse(err, 'Erro ao remover passkey.');
  }
};
