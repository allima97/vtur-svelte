import { json } from '@sveltejs/kit';
import { ensureCanManageCompanies, getAccessibleCompanyIds } from '$lib/server/admin';
import { DYNAMIC_READ_HEADERS, NO_STORE_HEADERS } from '$lib/server/httpCache';
import { rejectCrossOriginRequest, rejectLargePayload } from '$lib/server/requestGuards';
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

const MAX_MASTER_EMPRESAS_BODY_BYTES = 16 * 1024;

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    ensureCanManageCompanies(scope);

    const companyId = String(event.url.searchParams.get('company_id') || '').trim();
    let query = client
      .from('master_empresas')
      .select('id, master_id, company_id, status, created_at, approved_at')
      .order('created_at', { ascending: false });

    if (companyId) query = query.eq('company_id', companyId);
    if (!scope.isAdmin) {
      const accessible = getAccessibleCompanyIds(scope);
      if (!accessible.length) return json({ items: [] }, { headers: DYNAMIC_READ_HEADERS });
      query = query.in('company_id', accessible);
    }

    const { data, error: queryError } = await query;
    if (queryError) throw queryError;

    return json({ items: data || [] }, { headers: DYNAMIC_READ_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar vinculos master.');
  }
}

export async function POST(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const payloadError = rejectLargePayload(event.request, MAX_MASTER_EMPRESAS_BODY_BYTES);
    if (payloadError) return payloadError;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json().catch(() => ({}));

    ensureCanManageCompanies(scope);

    const action = String(body.action || 'save').trim().toLowerCase();
    const id = String(body.id || '').trim();
    const masterId = String(body.master_id || '').trim();
    const companyId = String(body.company_id || '').trim();
    const status = String(body.status || 'approved').trim() || 'approved';
    const accessible = scope.isAdmin ? null : getAccessibleCompanyIds(scope);

    if (action === 'delete') {
      if (!id) return new Response('Vinculo nao informado.', { status: 400, headers: NO_STORE_HEADERS });

      // ✅ Verifica ownership antes de deletar
      if (!scope.isAdmin) {
        const { data: vinculo } = await client
          .from('master_empresas')
          .select('company_id')
          .eq('id', id)
          .maybeSingle();
        if (!vinculo || !accessible?.includes(String(vinculo.company_id || ''))) {
          return new Response('Vinculo fora do escopo.', { status: 403, headers: NO_STORE_HEADERS });
        }
      }

      const { error: deleteError } = await client.from('master_empresas').delete().eq('id', id);
      if (deleteError) throw deleteError;
      return json({ id, deleted: true }, { headers: NO_STORE_HEADERS });
    }

    if (action === 'update') {
      if (!id) return new Response('Vinculo nao informado.', { status: 400, headers: NO_STORE_HEADERS });

      // ✅ Verifica ownership antes de atualizar
      if (!scope.isAdmin) {
        const { data: vinculo } = await client
          .from('master_empresas')
          .select('company_id')
          .eq('id', id)
          .maybeSingle();
        if (!vinculo || !accessible?.includes(String(vinculo.company_id || ''))) {
          return new Response('Vinculo fora do escopo.', { status: 403, headers: NO_STORE_HEADERS });
        }
      }

      const { error: updateError } = await client
        .from('master_empresas')
        .update({
          status,
          approved_at: status === 'approved' ? new Date().toISOString() : null
        })
        .eq('id', id);
      if (updateError) throw updateError;
      return json({ id, updated: true }, { headers: NO_STORE_HEADERS });
    }

    // action === 'save' (insert)
    if (!masterId || !companyId) {
      return new Response('Master e empresa sao obrigatorios.', { status: 400, headers: NO_STORE_HEADERS });
    }

    if (!scope.isAdmin && !accessible?.includes(companyId)) {
      return new Response('Empresa fora do escopo permitido.', { status: 403, headers: NO_STORE_HEADERS });
    }

    const { error: insertError } = await client.from('master_empresas').insert({
      master_id: masterId,
      company_id: companyId,
      status,
      approved_at: status === 'approved' ? new Date().toISOString() : null
    });
    if (insertError) throw insertError;

    return json({ created: true }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar vinculo master.');
  }
}
