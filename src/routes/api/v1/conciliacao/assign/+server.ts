import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      ensureModuloAccess(scope, ['conciliacao'], 3, 'Sem permissão para atribuir conciliação.');
    }

    const body = await event.request.json();
    const companyIds = resolveScopedCompanyIds(scope, body?.companyId);
    const companyId = companyIds[0] || scope.companyId;

    const conciliacaoId = String(body?.conciliacaoId || '').trim();
    if (!isUuid(conciliacaoId)) return json({ error: 'ID de conciliação inválido.' }, { status: 400 });

    const rankingVendedorId = String(body?.rankingVendedorId || '').trim() || null;
    const rankingProdutoId = String(body?.rankingProdutoId || '').trim() || null;
    const vendaId = String(body?.vendaId || '').trim() || null;
    const vendaReciboId = String(body?.vendaReciboId || '').trim() || null;
    const isBaixaRac = Boolean(body?.isBaixaRac);

    // Verifica se o registro pertence à empresa
    const { data: registro, error: registroErr } = await client
      .from('conciliacao_recibos')
      .select('id, company_id')
      .eq('id', conciliacaoId)
      .maybeSingle();

    if (registroErr) throw registroErr;
    if (!registro) return json({ error: 'Registro não encontrado.' }, { status: 404 });
    if (!scope.isAdmin && registro.company_id !== companyId) {
      return json({ error: 'Registro fora do escopo.' }, { status: 403 });
    }

    const update: Record<string, any> = {
      ranking_assigned_at: new Date().toISOString()
    };

    if (rankingVendedorId !== undefined) update.ranking_vendedor_id = rankingVendedorId;
    if (rankingProdutoId !== undefined) update.ranking_produto_id = rankingProdutoId;
    if (vendaId !== undefined) update.venda_id = vendaId;
    if (vendaReciboId !== undefined) update.venda_recibo_id = vendaReciboId;
    if (body && 'isBaixaRac' in body) update.is_baixa_rac = isBaixaRac;
    if (body && 'conciliado' in body) update.conciliado = Boolean(body.conciliado);
    if (body && 'valorComissaoLoja' in body && body.valorComissaoLoja != null) {
      update.valor_comissao_loja = Number(body.valorComissaoLoja);
    }

    const { error: updateError } = await client
      .from('conciliacao_recibos')
      .update(update)
      .eq('id', conciliacaoId);

    if (updateError) throw updateError;

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao atribuir conciliação.');
  }
}
