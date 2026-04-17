import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const payload = await request.json().catch(() => null);
    const url = new URL(request.url);
    console.error('CLIENT_ERROR', {
      url: url.pathname,
      payload
    });
  } catch (err: any) {
    console.error('CLIENT_ERROR_PARSE', { message: err?.message ?? String(err) });
  }

  return json(null, { status: 204 });
};
