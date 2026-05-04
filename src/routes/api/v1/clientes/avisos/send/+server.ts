import { json } from '@sveltejs/kit';
import { buildFromEmails, loadEmailSettings } from '$lib/server/admin';
import { fetchWithTimeout } from '$lib/server/fetchWithTimeout';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { checkPersistentRateLimit } from '$lib/server/persistentRateLimit';
import { escapeHtml } from '$lib/utils/html';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  logServerError,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

function normalizePhone(value: string) {
  return String(value || '').replace(/\D+/g, '');
}

function applyVars(text: string, vars: Record<string, string>) {
  return String(text || '')
    .replace(/\{nome\}/gi, vars.nome || '')
    .replace(/\{nome_completo\}/gi, vars.nome_completo || '')
    .replace(/\{email\}/gi, vars.email || '');
}

function renderHtml(text: string) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => `<p>${line ? escapeHtml(line) : '&nbsp;'}</p>`)
    .join('');
}

async function tryInsertHistorico(client: ReturnType<typeof getAdminClient>, payload: Record<string, any>) {
  const { error } = await client.from('cliente_avisos_historico').insert(payload);
  if (!error) return true;

  const message = String(error.message || '').toLowerCase();
  if (message.includes('does not exist') || message.includes('schema cache')) {
    return false;
  }

  throw error;
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['clientes', 'vendas'], 1, 'Sem acesso ao historico de avisos.');
    }

    const clienteId = String(event.url.searchParams.get('cliente_id') || '').trim();
    if (!clienteId || !isUuid(clienteId)) {
      return json({ error: 'Cliente invalido.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const { data, error } = await client
      .from('cliente_avisos_historico')
      .select('id, cliente_id, template_id, canal, assunto, mensagem, status, provider, provider_id, destinatario, enviado_por, created_at')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      const message = String(error.message || '').toLowerCase();
      if (message.includes('does not exist') || message.includes('schema cache')) {
        return json({ items: [], unavailable: true }, { headers: NO_STORE_HEADERS });
      }
      throw error;
    }

    return json({ items: data || [] }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar historico de avisos.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const rateLimit = await checkPersistentRateLimit(
      'clientes-avisos-send',
      `${event.getClientAddress?.() || 'unknown'}:${user.id}`,
      { max: 20, windowMs: 60_000 }
    );
    if (!rateLimit.allowed) {
      return json(
        { error: 'Muitas tentativas de envio. Aguarde alguns segundos.' },
        { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json().catch(() => ({}));

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['clientes', 'vendas'], 2, 'Sem permissao para enviar avisos.');
    }

    const clienteId = String(body.cliente_id || '').trim();
    const canal = String(body.canal || '').trim().toLowerCase();
    const templateId = String(body.template_id || '').trim();
    const assuntoBruto = String(body.assunto || '').trim();
    const mensagemBruta = String(body.mensagem || '').trim();

    if (!clienteId || !isUuid(clienteId)) {
      return json({ error: 'Cliente invalido.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    if (!['email', 'whatsapp'].includes(canal)) {
      return json({ error: 'Canal invalido.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    if (!mensagemBruta) {
      return json({ error: 'Mensagem obrigatoria.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const { data: cliente, error: clienteError } = await client
      .from('clientes')
      .select('id, nome, email, telefone, whatsapp, nascimento')
      .eq('id', clienteId)
      .maybeSingle();

    if (clienteError) throw clienteError;
    if (!cliente) return json({ error: 'Cliente nao encontrado.' }, { status: 404, headers: NO_STORE_HEADERS });

    const vars = {
      nome: String(cliente.nome || '').trim().split(' ')[0] || '',
      nome_completo: String(cliente.nome || '').trim(),
      email: String(cliente.email || '').trim()
    };

    const assunto = applyVars(assuntoBruto || 'Aviso VTUR', vars);
    const mensagem = applyVars(mensagemBruta, vars);

    if (canal === 'email') {
      if (!cliente.email) {
        return json({ error: 'Cliente sem e-mail cadastrado.' }, { status: 400, headers: NO_STORE_HEADERS });
      }

      const settings = await loadEmailSettings(client);
      const apiKey = String(settings?.resend_api_key || '').trim();
      if (!apiKey) {
        return json({ error: 'Resend nao configurado para envio de e-mail.' }, { status: 400, headers: NO_STORE_HEADERS });
      }

      const fromEmails = buildFromEmails(settings);
      const response = await fetchWithTimeout('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromEmails.avisos,
          to: [cliente.email],
          subject: assunto,
          html: renderHtml(mensagem),
          text: mensagem
        })
      }, 12_000);

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        logServerError('[clientes/avisos/send] Falha no provedor de e-mail', {
          status: response.status,
          providerMessage: String(payload?.message || payload?.error || '')
        });
        return json({ error: 'Falha ao enviar e-mail.' }, { status: 502, headers: NO_STORE_HEADERS });
      }

      const historicoDisponivel = await tryInsertHistorico(client, {
        cliente_id: clienteId,
        template_id: templateId || null,
        canal: 'email',
        assunto,
        mensagem,
        status: 'enviado',
        provider: 'resend',
        provider_id: payload?.id || null,
        destinatario: cliente.email,
        enviado_por: user.id
      });

      return json({
        ok: true,
        canal: 'email',
        provider: 'resend',
        provider_id: payload?.id || null,
        cliente_id: clienteId,
        template_id: templateId || null,
        historico_disponivel: historicoDisponivel
      }, { headers: NO_STORE_HEADERS });
    }

    const phone = normalizePhone(String(cliente.whatsapp || cliente.telefone || ''));
    if (!phone) {
      return json({ error: 'Cliente sem telefone/WhatsApp cadastrado.' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(mensagem)}`;
    const historicoDisponivel = await tryInsertHistorico(client, {
      cliente_id: clienteId,
      template_id: templateId || null,
      canal: 'whatsapp',
      assunto,
      mensagem,
      status: 'preparado',
      provider: 'manual_link',
      provider_id: null,
      destinatario: phone,
      enviado_por: user.id
    });

    return json({
      ok: true,
      canal: 'whatsapp',
      mode: 'manual_link',
      whatsapp_url: whatsappUrl,
      cliente_id: clienteId,
      template_id: templateId || null,
      historico_disponivel: historicoDisponivel
    }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao enviar aviso ao cliente.');
  }
}
