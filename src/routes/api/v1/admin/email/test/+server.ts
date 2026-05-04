import { json } from '@sveltejs/kit';
import { buildFromEmails, loadEmailSettings } from '$lib/server/admin';
import { fetchWithTimeout } from '$lib/server/fetchWithTimeout';
import { checkPersistentRateLimit } from '$lib/server/persistentRateLimit';
import {
  getAdminClient,
  logServerError,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const rateLimit = await checkPersistentRateLimit(
      'admin-email-test',
      `${event.getClientAddress?.() || 'unknown'}:${user.id}`,
      { max: 10, windowMs: 60_000 }
    );
    if (!rateLimit.allowed) {
      return new Response('Muitas tentativas de envio. Aguarde alguns segundos.', {
        status: 429,
        headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rateLimit.retryAfterSeconds) }
      });
    }

    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json().catch(() => ({}));

    if (!scope.isAdmin) {
      return new Response('Somente ADMIN pode enviar teste de e-mail.', { status: 403, headers: NO_STORE_HEADERS });
    }

    const to = String(body.to || '').trim();
    if (!to) {
      return new Response('Informe o e-mail de destino.', { status: 400, headers: NO_STORE_HEADERS });
    }

    const settings = await loadEmailSettings(client);
    const apiKey = String(settings?.resend_api_key || '').trim();
    if (!apiKey) {
      return new Response('Resend nao configurado.', { status: 400, headers: NO_STORE_HEADERS });
    }

    const fromEmails = buildFromEmails(settings);
    const response = await fetchWithTimeout('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmails.admin || fromEmails.default,
        to: [to],
        subject: 'Teste de configuracao VTUR',
        html: '<p>Configuracao de e-mail validada com sucesso.</p>',
        text: 'Configuracao de e-mail validada com sucesso.'
      })
    }, 12_000);

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      logServerError('[admin/email/test] falha no provedor de e-mail', new Error('Resend provider error'), {
        status: response.status,
        message: String(payload?.message || payload?.error || '')
      });
      return new Response('Falha ao enviar teste.', { status: 502, headers: NO_STORE_HEADERS });
    }

    return json({
      ok: true,
      provider: 'resend',
      id: payload?.id || null
    }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao enviar teste de e-mail.');
  }
}
