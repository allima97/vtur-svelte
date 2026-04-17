import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async () => {
  return json({ error: 'Exclusao de cliente desabilitada.' }, { status: 403 });
};
