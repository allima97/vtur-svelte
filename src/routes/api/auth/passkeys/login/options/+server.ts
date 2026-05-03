import { json } from '@sveltejs/kit';
import { buildAuthenticationOptions } from '$lib/server/passkeys';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
  const body = await event.request.json().catch(() => ({}));
  const email = String(body?.email || '').trim();

  const payload = await buildAuthenticationOptions(event, email || null);
  return json({ ok: true, ...payload });
};
