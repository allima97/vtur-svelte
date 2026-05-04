import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';

export const DELETE: RequestHandler = async () => {
  return json({ error: 'Exclusao de cliente desabilitada.' }, { status: 403, headers: NO_STORE_HEADERS });
};
