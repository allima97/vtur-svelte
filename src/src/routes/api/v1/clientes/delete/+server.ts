import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { rejectCrossOriginRequest } from '$lib/server/requestGuards';

export const DELETE: RequestHandler = async ({ request }) => {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;

  return json({ error: 'Exclusao de cliente desabilitada.' }, { status: 403, headers: NO_STORE_HEADERS });
};
