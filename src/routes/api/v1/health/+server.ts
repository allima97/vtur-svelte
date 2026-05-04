import { json } from '@sveltejs/kit';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  return json({ ok: true, ts: new Date().toISOString() }, { headers: NO_STORE_HEADERS });
};
