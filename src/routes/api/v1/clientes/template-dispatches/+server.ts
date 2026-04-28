import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

export const GET: RequestHandler = async ({ locals, url }) => {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser({ locals } as any);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['parametros_crm', 'crm', 'clientes'], 1, 'Sem acesso a envios de templates.');
    }

    const clienteId = String(url.searchParams.get('cliente_id') || '').trim();
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 50)));

    let query = client
      .from('cliente_template_dispatches')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (clienteId && isUuid(clienteId)) {
      query = query.eq('cliente_id', clienteId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return json({ items: data || [] });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar envios de templates.');
  }
};

export const POST: RequestHandler = async ({ locals, request }) => {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser({ locals } as any);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['parametros_crm', 'crm', 'clientes'], 2, 'Sem acesso a enviar templates.');
    }

    const body = await request.json();

    const clienteId = String(body.clienteId || body.cliente_id || '').trim();
    const templateId = String(body.templateId || body.template_id || '').trim();
    const canal = String(body.canal || 'email').toLowerCase();
    const recipientName = String(body.recipientName || body.nomeDestinatario || '').trim();
    const recipientContact = String(body.recipientContact || body.emailDestinatario || '').trim();
    const subject = String(body.subject || body.assunto || '').trim();
    const categoria = String(body.categoria || '').trim();

    if (!clienteId || !isUuid(clienteId)) {
      return json({ error: 'clienteId invalido.' }, { status: 400 });
    }

    if (!recipientContact) {
      return json({ error: 'recipientContact obrigatorio.' }, { status: 400 });
    }

    const payload = {
      user_id: user.id,
      company_id: scope.companyId || null,
      cliente_id: clienteId,
      template_id: templateId || null,
      canal,
      categoria: categoria || '',
      status: 'sent',
      recipient_name: recipientName || null,
      recipient_contact: recipientContact,
      subject: subject || null,
    };

    const { data, error } = await client
      .from('cliente_template_dispatches')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return json({ success: true, dispatch: data }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao registrar envio de template.');
  }
};
