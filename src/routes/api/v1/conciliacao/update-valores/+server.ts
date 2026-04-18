import { json, type RequestEvent } from '@sveltejs/kit';
import {
  getAdminClient,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse,
  isUuid
} from '$lib/server/v1';

// Espelha: vtur-app/src/pages/api/v1/conciliacao/update-valores.ts
// Permite que Gestor/Master atualizem campos de valor de um registro de conciliacao_recibos.

const ALLOWED_FIELDS = [
  'valor_lancamentos',
  'valor_taxas',
  'valor_descontos',
  'valor_abatimentos',
  'valor_calculada_loja',
  'valor_visao_master',
  'valor_opfax',
  'valor_saldo',
  'valor_nao_comissionavel'
] as const;

export async function POST(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    // Apenas Gestor, Master ou Admin podem editar valores de conciliação
    if (!scope.isAdmin && scope.papel !== 'GESTOR' && scope.papel !== 'MASTER') {
      return json(
        { error: 'Sem permissão. Apenas Gestor ou Master podem editar valores.' },
        { status: 403 }
      );
    }

    const body = await event.request.json().catch(() => null);

    // Resolver company_id: admin pode passar qualquer um; demais usam o próprio
    const requestedCompanyId = String(body?.companyId || '').trim();
    const companyId = scope.isAdmin
      ? (isUuid(requestedCompanyId) ? requestedCompanyId : null)
      : scope.companyId;

    if (!companyId) {
      return json({ error: 'Company inválida.' }, { status: 400 });
    }

    const conciliacaoId = String(body?.conciliacaoId || '').trim();
    if (!isUuid(conciliacaoId)) {
      return json({ error: 'Registro de conciliação inválido.' }, { status: 400 });
    }

    const valores = body?.valores;
    if (!valores || typeof valores !== 'object') {
      return json({ error: 'Nenhum valor fornecido para atualizar.' }, { status: 400 });
    }

    // Construir payload seguro — apenas campos numéricos conhecidos
    const updatePayload: Record<string, number | null> = {};
    for (const field of ALLOWED_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(valores, field)) {
        const raw = (valores as any)[field];
        if (raw === null || raw === undefined) {
          updatePayload[field] = null;
        } else {
          const num = Number(raw);
          if (!Number.isFinite(num)) {
            return json({ error: `Valor inválido para o campo ${field}.` }, { status: 400 });
          }
          updatePayload[field] = num;
        }
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return json({ error: 'Nenhum campo editável encontrado no payload.' }, { status: 400 });
    }

    // Verificar que o registro pertence à empresa
    const { data: existing, error: existErr } = await client
      .from('conciliacao_recibos')
      .select('id, company_id')
      .eq('id', conciliacaoId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (existErr) throw existErr;
    if (!existing) {
      return json({ error: 'Registro não encontrado ou sem permissão.' }, { status: 404 });
    }

    const { data: updated, error: updateErr } = await client
      .from('conciliacao_recibos')
      .update({ ...updatePayload, updated_at: new Date().toISOString() })
      .eq('id', conciliacaoId)
      .eq('company_id', companyId)
      .select()
      .maybeSingle();

    if (updateErr) throw updateErr;

    return json({ ok: true, item: updated });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao atualizar valores da conciliação.');
  }
}
