import { json } from '@sveltejs/kit';
import { buildFromEmails, loadEmailSettings } from '$lib/server/admin';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
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
    .map((line) => `<p>${line || '&nbsp;'}</p>`)
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
      return json({ error: 'Cliente invalido.' }, { status: 400 });
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
        return json({ items: [], unavailable: true });
      }
      throw error;
    }

    return json({ items: data || [] });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar historico de avisos.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
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
      return json({ error: 'Cliente invalido.' }, { status: 400 });
    }

    if (!['email', 'whatsapp'].includes(canal)) {
      return json({ error: 'Canal invalido.' }, { status: 400 });
    }

    if (!mensagemBruta) {
      return json({ error: 'Mensagem obrigatoria.' }, { status: 400 });
    }

    const { data: cliente, error: clienteError } = await client
      .from('clientes')
      .select('id, nome, email, telefone, whatsapp, nascimento')
      .eq('id', clienteId)
      .maybeSingle();

    if (clienteError) throw clienteError;
    if (!cliente) return json({ error: 'Cliente nao encontrado.' }, { status: 404 });

    const vars = {
      nome: String(cliente.nome || '').trim().split(' ')[0] || '',
      nome_completo: String(cliente.nome || '').trim(),
      email: String(cliente.email || '').trim()
    };

    const assunto = applyVars(assuntoBruto || 'Aviso VTUR', vars);
    const mensagem = applyVars(mensagemBruta, vars);

    if (canal === 'email') {
      if (!cliente.email) {
        return json({ error: 'Cliente sem e-mail cadastrado.' }, { status: 400 });
      }

      const settings = await loadEmailSettings(client);
      const apiKey = String(settings?.resend_api_key || '').trim();
      if (!apiKey) {
        return json({ error: 'Resend nao configurado para envio de e-mail.' }, { status: 400 });
      }

      const fromEmails = buildFromEmails(settings);
      const response = await fetch('https://api.resend.com/emails', {
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
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return json({ error: String(payload?.message || payload?.error || 'Falha ao enviar e-mail.') }, { status: response.status });
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
      });
    }

    const phone = normalizePhone(String(cliente.whatsapp || cliente.telefone || ''));
    if (!phone) {
      return json({ error: 'Cliente sem telefone/WhatsApp cadastrado.' }, { status: 400 });
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
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao enviar aviso ao cliente.');
  }
}
