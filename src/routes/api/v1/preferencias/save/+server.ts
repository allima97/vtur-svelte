import { isUuid } from '$lib/server/v1';
import { buildNoStoreJsonResponse, buildNoStoreTextResponse, logServerError, requirePreferenciasScope, safeJsonParse } from '../_shared';

export async function POST(event) {
  try {
    const body = safeJsonParse(await event.request.text()) as any;
    const id = String(body?.id || '').trim();
    const isUpdate = Boolean(id);
    const { client, user, scope } = await requirePreferenciasScope(event, isUpdate ? 3 : 2);

    const companyId = scope.companyId;
    if (!companyId) return buildNoStoreTextResponse('Empresa inválida.', 400);

    const nome = String(body?.nome || '').trim();
    if (!nome) return buildNoStoreTextResponse('nome obrigatorio.', 400);

    const cidadeId = isUuid(body?.cidade_id) ? String(body?.cidade_id) : null;
    const tipoProdutoId = isUuid(body?.tipo_produto_id) ? String(body?.tipo_produto_id) : null;

    const payload: any = {
      tipo_produto_id: tipoProdutoId,
      cidade_id: cidadeId,
      nome,
      localizacao: String(body?.localizacao || '').trim() || null,
      classificacao: String(body?.classificacao || '').trim() || null,
      observacao: String(body?.observacao || '').trim() || null,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    };

    if (!isUpdate) {
      const insertPayload = {
        ...payload,
        company_id: companyId,
        created_by: user.id,
        updated_at: null,
        updated_by: null
      };
      const { data, error } = await client
        .from('minhas_preferencias')
        .insert(insertPayload)
        .select('id, company_id, created_by, tipo_produto_id, cidade_id, nome, localizacao, classificacao, observacao, created_at, updated_at')
        .single();
      if (error) throw error;

      return buildNoStoreJsonResponse({ ok: true, item: data });
    }

    if (!isUuid(id)) return buildNoStoreTextResponse('id invalido.', 400);

    let updateQuery = client
      .from('minhas_preferencias')
      .update(payload)
      .eq('id', id);
    if (!scope.isAdmin) updateQuery = updateQuery.eq('created_by', user.id);

    const { data, error } = await updateQuery
      .select('id, company_id, created_by, tipo_produto_id, cidade_id, nome, localizacao, classificacao, observacao, created_at, updated_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) return buildNoStoreTextResponse('Preferência não encontrada.', 404);

    return buildNoStoreJsonResponse({ ok: true, item: data });
  } catch (err) {
    logServerError('[preferencias/save] falha ao salvar preferencia', err);
    return buildNoStoreTextResponse('Erro ao salvar preferência.', 500);
  }
}
