import { json } from '@sveltejs/kit';
import { buildFromEmails, loadEmailSettings } from '$lib/server/admin';
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json().catch(() => ({}));

    if (!scope.isAdmin) {
      return new Response('Somente ADMIN pode enviar teste de e-mail.', { status: 403 });
    }

    const to = String(body.to || '').trim();
    if (!to) {
      return new Response('Informe o e-mail de destino.', { status: 400 });
    }

    const settings = await loadEmailSettings(client);
    const apiKey = String(settings?.resend_api_key || '').trim();
    if (!apiKey) {
      return new Response('Resend nao configurado.', { status: 400 });
    }

    const fromEmails = buildFromEmails(settings);
    const response = await fetch('https://api.resend.com/emails', {
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
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return new Response(String(payload?.message || payload?.error || 'Falha ao enviar teste.'), {
        status: response.status
      });
    }

    return json({
      ok: true,
      provider: 'resend',
      id: payload?.id || null
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao enviar teste de e-mail.');
  }
}
