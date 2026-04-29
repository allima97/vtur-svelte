import { json } from '@sveltejs/kit';
import { verifyTurnstileToken } from '$lib/server/turnstile';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	try {
		const body = await request.json().catch(() => ({}));
		const token = typeof body.token === 'string' ? body.token : '';

		const remoteIp = getClientAddress();
		const result = await verifyTurnstileToken(token, remoteIp);

		if (result.success) {
			return json({ success: true });
		}

		return json({ success: false, error: result.error || 'Verificação falhou.' }, { status: 400 });
	} catch (err) {
		console.error('[verify-turnstile] Erro inesperado:', err);
		return json({ success: false, error: 'Erro interno.' }, { status: 500 });
	}
};
