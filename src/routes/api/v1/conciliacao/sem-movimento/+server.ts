import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      ensureModuloAccess(scope, ['operacao_conciliacao', 'conciliacao'], 3, 'Sem permissão.');
    }

    const url = new URL(event.request.url);
    const companyIds = resolveScopedCompanyIds(scope, url.searchParams.get('companyId'));
    const companyId = companyIds[0] || scope.companyId;

    if (!companyId) return json({ error: 'Empresa não identificada.' }, { status: 400 });

    const { data, error } = await client
      .from('conciliacao_dias_sem_movimento')
      .select('id, company_id, data, marcado_por, marcado_em, observacao')
      .eq('company_id', companyId)
      .order('data', { ascending: false })
      .limit(100);

    if (error) throw error;

    return json({ ok: true, dias: data || [] });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao listar dias sem movimento.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      ensureModuloAccess(scope, ['operacao_conciliacao', 'conciliacao'], 3, 'Sem permissão.');
    }

    const body = await event.request.json().catch(() => ({}));
    const companyIds = resolveScopedCompanyIds(scope, body?.companyId);
    const companyId = companyIds[0] || scope.companyId;
    const dataStr = String(body?.data || '').trim();
    const observacao = String(body?.observacao || '').trim() || null;

    if (!companyId) return json({ error: 'Empresa não identificada.' }, { status: 400 });
    if (!dataStr || !/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) {
      return json({ error: 'Data inválida. Use formato YYYY-MM-DD.' }, { status: 400 });
    }

    // Verifica se já existe importação para essa data
    const { data: existentes, error: errExistentes } = await client
      .from('conciliacao_recibos')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('movimento_data', dataStr);

    if (errExistentes) throw errExistentes;
    if ((existentes as any)?.count > 0) {
      return json(
        { error: `Não é possível marcar "sem movimento" para ${dataStr}, pois já existem registros importados para esta data.` },
        { status: 409 }
      );
    }

    const { data, error } = await client
      .from('conciliacao_dias_sem_movimento')
      .upsert({
        company_id: companyId,
        data: dataStr,
        marcado_por: user.id,
        marcado_em: new Date().toISOString(),
        observacao
      }, { onConflict: 'company_id,data' })
      .select()
      .single();

    if (error) throw error;

    return json({ ok: true, dia: data });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao marcar dia sem movimento.');
  }
}

export async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      ensureModuloAccess(scope, ['operacao_conciliacao', 'conciliacao'], 3, 'Sem permissão.');
    }

    const body = await event.request.json().catch(() => ({}));
    const companyIds = resolveScopedCompanyIds(scope, body?.companyId);
    const companyId = companyIds[0] || scope.companyId;
    const dataStr = String(body?.data || '').trim();

    if (!companyId) return json({ error: 'Empresa não identificada.' }, { status: 400 });
    if (!dataStr || !/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) {
      return json({ error: 'Data inválida.' }, { status: 400 });
    }

    const { error } = await client
      .from('conciliacao_dias_sem_movimento')
      .delete()
      .eq('company_id', companyId)
      .eq('data', dataStr);

    if (error) throw error;

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao remover dia sem movimento.');
  }
}
