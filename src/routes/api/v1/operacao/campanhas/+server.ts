import { json } from '@sveltejs/kit';
import { readJsonBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';
import {
  ensureModuloAccess,
  getAdminClient,
  hasModuloAccess,
  isUuid,
  requireAuthenticatedUser,
  NO_MATCH_COMPANY_ID,
  resolveScopedCompanyId,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

const MAX_CAMPANHA_BODY_BYTES = 128 * 1024;
const SUPABASE_IN_BATCH_SIZE = 100;

function chunkArray<T>(values: T[], size = SUPABASE_IN_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function canManageCampanhas(scope: Awaited<ReturnType<typeof resolveUserScope>>) {
  return Boolean(
    scope.isAdmin ||
      scope.isMaster ||
      scope.isGestor ||
      (scope.isFinanceiro && hasModuloAccess(scope, ['Campanhas'], 2))
  );
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Campanhas'], 1, 'Sem acesso a Campanhas.');
    }

    const { searchParams } = event.url;
    const status = String(searchParams.get('status') || '').trim();
    const companyIds = resolveScopedCompanyIds(
      scope,
      searchParams.get('company_id') || searchParams.get('empresa_id')
    );

    if (!scope.isAdmin && companyIds.length === 0) {
      return json({ items: [], can_write: false });
    }

    const buildQuery = (companyIdsFilter?: string[]) => {
      let query = client
        .from('campanhas')
        .select('id, company_id, titulo, imagem_url, imagem_path, link_url, link_instagram, link_facebook, data_campanha, validade_ate, regras, status, created_at, arquivada_em')
        .order('data_campanha', { ascending: false })
        .limit(200);

      if (!scope.isAdmin && companyIdsFilter && companyIdsFilter.length === 1) query = query.eq('company_id', companyIdsFilter[0]);
      else if (!scope.isAdmin && companyIdsFilter && companyIdsFilter.length > 1) query = query.in('company_id', companyIdsFilter);
      if (status) query = query.eq('status', status);

      return query;
    };

    const fetchItems = async () => {
      if (scope.isAdmin || companyIds.length <= SUPABASE_IN_BATCH_SIZE) {
        const { data, error: queryError } = await buildQuery(companyIds);
        if (queryError) throw queryError;
        return data || [];
      }

      const rows: any[] = [];
      for (const batch of chunkArray(companyIds)) {
        const { data, error: queryError } = await buildQuery(batch);
        if (queryError) throw queryError;
        rows.push(...(data || []));
      }

      return Array.from(new Map(rows.map((row: any) => [String(row?.id || ''), row])).values())
        .sort((left: any, right: any) =>
          String(right?.data_campanha || '').localeCompare(String(left?.data_campanha || ''))
        )
        .slice(0, 200);
    };

    return json({
      items: await fetchItems(),
      can_write: canManageCampanhas(scope) && (scope.isAdmin || hasModuloAccess(scope, ['Campanhas'], 2))
    });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar campanhas.');
  }
}

export async function POST(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(event.request, MAX_CAMPANHA_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Campanhas'], 2, 'Sem permissão para salvar campanhas.');
    }

    if (!canManageCampanhas(scope)) {
      return json({ error: 'Somente gestor/master podem gerenciar campanhas.' }, { status: 403 });
    }

    const body =
      bodyResult.data && typeof bodyResult.data === 'object'
        ? (bodyResult.data as Record<string, any>)
        : {};
    const { id, titulo, imagem_url, link_url, link_instagram, link_facebook, data_campanha, validade_ate, regras, status } = body;
    const requestedCompanyId = String(body?.company_id || body?.empresa_id || '').trim();
    const companyIds = resolveScopedCompanyIds(scope, requestedCompanyId || null);

    if (!String(titulo || '').trim()) return json({ error: 'Título obrigatório.' }, { status: 400 });
    if (!String(data_campanha || '').trim()) return json({ error: 'Data da campanha obrigatória.' }, { status: 400 });
    if (!scope.isAdmin && (companyIds.length === 0 || companyIds[0] === NO_MATCH_COMPANY_ID)) {
      return json({ error: 'Empresa fora do escopo.' }, { status: 403 });
    }
    if (!scope.isAdmin && !id && !requestedCompanyId && companyIds.length > 1) {
      return json({ error: 'Selecione a empresa para criar a campanha.' }, { status: 400 });
    }

    let companyId = scope.isAdmin
      ? requestedCompanyId || scope.companyId
      : resolveScopedCompanyId(scope, requestedCompanyId || null);

    if (!scope.isAdmin && id && isUuid(id)) {
      const { data: existing, error: existingError } = await client
        .from('campanhas')
        .select('id, company_id')
        .eq('id', id)
        .maybeSingle();
      if (existingError) throw existingError;
      if (!existing) return json({ error: 'Campanha não encontrada.' }, { status: 404 });
      const existingCompanyId = String((existing as any)?.company_id || '').trim();
      if (!existingCompanyId || !companyIds.includes(existingCompanyId)) {
        return json({ error: 'Campanha fora do escopo da empresa.' }, { status: 403 });
      }
      companyId = existingCompanyId;
    }

    if (!companyId) {
      return json({ error: 'Empresa obrigatória para salvar campanha.' }, { status: 400 });
    }

    const payload = {
      company_id: companyId,
      titulo: String(titulo).trim(),
      imagem_url: String(imagem_url || '').trim() || null,
      link_url: String(link_url || '').trim() || null,
      link_instagram: String(link_instagram || '').trim() || null,
      link_facebook: String(link_facebook || '').trim() || null,
      data_campanha: String(data_campanha).trim(),
      validade_ate: String(validade_ate || '').trim() || null,
      regras: String(regras || '').trim() || null,
      status: String(status || 'ativa').trim()
    };

    let result;
    if (id && isUuid(id)) {
      const { data, error: updateError } = await client.from('campanhas').update(payload).eq('id', id).select('id').single();
      if (updateError) throw updateError;
      result = data;
    } else {
      const { data, error: insertError } = await client.from('campanhas').insert(payload).select('id').single();
      if (insertError) throw insertError;
      result = data;
    }

    return json({ ok: true, id: result?.id });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar campanha.');
  }
}

export async function DELETE(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['Campanhas'], 4, 'Sem permissão para excluir campanhas.');
    }

    if (!canManageCampanhas(scope)) {
      return json({ error: 'Sem permissão.' }, { status: 403 });
    }

    const id = String(event.url.searchParams.get('id') || '').trim();
    if (!isUuid(id)) return json({ error: 'ID inválido.' }, { status: 400 });

    const companyIds = resolveScopedCompanyIds(
      scope,
      event.url.searchParams.get('company_id') || event.url.searchParams.get('empresa_id')
    );

    const { data: existing, error: existingError } = await client
      .from('campanhas')
      .select('id, company_id')
      .eq('id', id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing) return json({ error: 'Campanha não encontrada.' }, { status: 404 });

    const existingCompanyId = String((existing as any)?.company_id || '').trim();
    if (!scope.isAdmin && (!existingCompanyId || !companyIds.includes(existingCompanyId))) {
      return json({ error: 'Campanha fora do escopo da empresa.' }, { status: 403 });
    }

    const { error: deleteError } = await client.from('campanhas').delete().eq('id', id);
    if (deleteError) throw deleteError;

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir campanha.');
  }
}
