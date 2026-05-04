import type { RequestEvent } from '@sveltejs/kit';
import { readJsonBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';
import {
  requireAuthenticatedUser,
  resolveUserScope,
  ensureModuloAccess,
  getAdminClient,
  resolveScopedCompanyId,
  toErrorResponse
} from '$lib/server/v1';
import { titleCaseNome } from '$lib/normalizeText';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { invalidateClientReadModels } from '$lib/server/readModelCache';

const MAX_ORCAMENTO_CLIENTE_CREATE_BODY_BYTES = 32 * 1024;

export async function POST(event: RequestEvent) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(event.request, MAX_ORCAMENTO_CLIENTE_CREATE_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

    const user = await requireAuthenticatedUser(event);
    const client = getAdminClient();
    const scope = await resolveUserScope(client, user.id);

    ensureModuloAccess(scope, ['Orcamentos'], 2, 'Sem acesso para criar Orcamentos.');

    const body =
      bodyResult.data && typeof bodyResult.data === 'object'
        ? (bodyResult.data as Record<string, any>)
        : null;
    const nome = titleCaseNome(String(body?.nome || '').trim());
    const telefone = String(body?.telefone || '').trim();
    if (!nome || !telefone) return new Response('Nome e telefone obrigatorios.', { status: 400 });

    const requestedCompanyId = String(body?.company_id || '').trim();
    const companyId = scope.isAdmin ? requestedCompanyId || null : resolveScopedCompanyId(scope, requestedCompanyId || null);
    if (!scope.isAdmin && !companyId) {
      return new Response(requestedCompanyId ? 'Empresa fora do escopo.' : 'Empresa nao identificada.', {
        status: requestedCompanyId ? 403 : 400,
        headers: NO_STORE_HEADERS
      });
    }

    const payload: Record<string, any> = {
      nome,
      telefone,
      whatsapp: telefone,
      ativo: true,
      active: true
    };
    if (companyId) payload.company_id = companyId;

    const { data, error } = await client
      .from('clientes')
      .insert(payload)
      .select('id, nome, cpf, whatsapp, email')
      .single();
    if (error || !data) throw error || new Error('Falha ao criar cliente.');

    invalidateClientReadModels({
      companyIds: companyId ? [companyId] : [],
      userId: user.id
    });

    return new Response(JSON.stringify({ item: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...NO_STORE_HEADERS }
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao criar cliente.');
  }
}
