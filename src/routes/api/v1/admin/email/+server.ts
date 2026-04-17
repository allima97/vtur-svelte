import { error as httpError, json } from '@sveltejs/kit';
import { buildFromEmails, loadEmailSettings } from '$lib/server/admin';
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

const MASKED = '••••••';

function ensureAdminOnly(scope: Awaited<ReturnType<typeof resolveUserScope>>) {
  if (!scope.isAdmin) {
    throw httpError(403, 'Somente ADMIN pode editar configuracoes globais.');
  }
}

function maskSettings(settings: any) {
  if (!settings) return settings;
  return {
    ...settings,
    smtp_pass: settings.smtp_pass ? MASKED : '',
    resend_api_key: settings.resend_api_key ? MASKED : ''
  };
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    ensureAdminOnly(scope);

    const settings = await loadEmailSettings(client);
    return json({
      settings: maskSettings(settings) || {
        singleton: true,
        smtp_host: '',
        smtp_port: 465,
        smtp_secure: true,
        smtp_user: '',
        smtp_pass: '',
        resend_api_key: '',
        alerta_from_email: '',
        admin_from_email: '',
        avisos_from_email: '',
        financeiro_from_email: '',
        suporte_from_email: ''
      },
      resolved_from: buildFromEmails(settings)
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar configuracoes de e-mail.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json().catch(() => ({}));

    ensureAdminOnly(scope);

    // Busca valores existentes para preservar credenciais se frontend enviar placeholder mascarado
    const existingCreds = await client
      .from('admin_email_settings')
      .select('id, smtp_pass, resend_api_key')
      .eq('singleton', true)
      .maybeSingle();

    const existingSmtpPass = existingCreds.data?.smtp_pass || null;
    const existingResendKey = existingCreds.data?.resend_api_key || null;

    const smtpPass = String(body.smtp_pass || '').trim();
    const resendKey = String(body.resend_api_key || '').trim();

    const payload = {
      singleton: true,
      smtp_host: String(body.smtp_host || '').trim() || null,
      smtp_port: body.smtp_port === '' || body.smtp_port == null ? null : Number(body.smtp_port),
      smtp_secure: body.smtp_secure !== false,
      smtp_user: String(body.smtp_user || '').trim() || null,
      smtp_pass: smtpPass === MASKED ? existingSmtpPass : smtpPass || null,
      resend_api_key: resendKey === MASKED ? existingResendKey : resendKey || null,
      alerta_from_email: String(body.alerta_from_email || '').trim() || null,
      admin_from_email: String(body.admin_from_email || '').trim() || null,
      avisos_from_email: String(body.avisos_from_email || '').trim() || null,
      financeiro_from_email: String(body.financeiro_from_email || '').trim() || null,
      suporte_from_email: String(body.suporte_from_email || '').trim() || null
    };

    if (existingCreds.data?.id) {
      const { error: updateError } = await client
        .from('admin_email_settings')
        .update(payload)
        .eq('id', existingCreds.data.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await client.from('admin_email_settings').insert(payload);
      if (insertError) throw insertError;
    }

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar configuracoes de e-mail.');
  }
}
