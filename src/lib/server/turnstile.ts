import { env } from '$env/dynamic/private';
import { shouldUseMock } from '$lib/db/supabase-mock';

interface TurnstileVerifyResponse {
	success: boolean;
	'error-codes'?: string[];
	challenge_ts?: string;
	hostname?: string;
	action?: string;
	cdata?: string;
}

/**
 * Verifica um token Cloudflare Turnstile no servidor.
 * Em modo mock, sempre retorna sucesso.
 */
export async function verifyTurnstileToken(
	token: string,
	remoteIp?: string
): Promise<{ success: boolean; error?: string }> {
	// Em mock mode, bypassa a validação
	if (shouldUseMock()) {
		return { success: true };
	}

	const secretKey = env['TURNSTILE_SECRET_KEY'];

	if (!secretKey) {
		console.warn('[Turnstile] TURNSTILE_SECRET_KEY não configurada. Permitindo acesso.');
		return { success: true };
	}

	if (!token || token.trim().length === 0) {
		return { success: false, error: 'Token Turnstile não fornecido.' };
	}

	const body = new URLSearchParams();
	body.append('secret', secretKey);
	body.append('response', token);
	if (remoteIp) {
		body.append('remoteip', remoteIp);
	}

	try {
		const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body
		});

		const data: TurnstileVerifyResponse = await response.json();

		if (data.success) {
			return { success: true };
		}

		const errorCodes = data['error-codes'] || ['unknown-error'];
		console.warn('[Turnstile] Verificação falhou:', errorCodes);
		return { success: false, error: formatTurnstileErrors(errorCodes) };
	} catch (err) {
		console.error('[Turnstile] Erro ao verificar token:', err);
		return { success: false, error: 'Erro ao verificar desafio de segurança. Tente novamente.' };
	}
}

function formatTurnstileErrors(codes: string[]): string {
	const map: Record<string, string> = {
		'missing-input-secret': 'Configuração interna incompleta (secret).',
		'invalid-input-secret': 'Configuração interna inválida (secret).',
		'missing-input-response': 'Desafio de segurança não completado.',
		'invalid-input-response': 'Desafio de segurança inválido.',
		'bad-request': 'Requisição malformada.',
		'timeout-or-duplicate': 'Desafio expirado ou duplicado. Recarregue a página.',
		'internal-error': 'Erro interno do Cloudflare. Tente novamente.'
	};

	const messages = codes.map((c) => map[c] || `Erro desconhecido (${c})`);
	return messages.join(' ');
}
