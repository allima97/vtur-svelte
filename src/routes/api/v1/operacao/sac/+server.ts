import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['operacao_controle_sac', 'controle_sac', 'operacao'], 1, 'Sem acesso ao Controle SAC.');
    }

    const { searchParams } = event.url;
    const status = String(searchParams.get('status') || '').trim();
    const inicio = String(searchParams.get('inicio') || '').trim();
    const fim = String(searchParams.get('fim') || '').trim();
    const q = String(searchParams.get('q') || '').trim();

    let query = client
      .from('sac_controle')
      .select('id, company_id, recibo, tour, data_solicitacao, motivo, contratante_pax, ok_quando, status, responsavel, prazo, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (scope.companyId && !scope.isAdmin) query = query.eq('company_id', scope.companyId);
    if (status && status !== 'all') query = query.eq('status', status);
    if (inicio) query = query.gte('data_solicitacao', inicio);
    if (fim) query = query.lte('data_solicitacao', fim);

    const { data, error: queryError } = await query;
    if (queryError) throw queryError;

    let items = data || [];
    if (q) {
      const qLower = q.toLowerCase();
      items = items.filter((item: any) =>
        [item.recibo, item.tour, item.motivo, item.contratante_pax, item.responsavel]
          .join(' ').toLowerCase().includes(qLower)
      );
    }

    return json({ items });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar registros SAC.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['operacao_controle_sac', 'controle_sac', 'operacao'], 2, 'Sem permissão para salvar SAC.');
    }

    const body = await event.request.json();
    const { id, recibo, tour, data_solicitacao, motivo, contratante_pax, ok_quando, status, responsavel, prazo } = body;

    const payload = {
      company_id: scope.companyId,
      recibo: String(recibo || '').trim() || null,
      tour: String(tour || '').trim() || null,
      data_solicitacao: String(data_solicitacao || '').trim() || null,
      motivo: String(motivo || '').trim() || null,
      contratante_pax: String(contratante_pax || '').trim() || null,
      ok_quando: String(ok_quando || '').trim() || null,
      status: String(status || 'aberto').trim(),
      responsavel: String(responsavel || '').trim() || null,
      prazo: String(prazo || '').trim() || null
    };

    let result;
    if (id && isUuid(id)) {
      const { data, error: updateError } = await client.from('sac_controle').update(payload).eq('id', id).select('id').single();
      if (updateError) throw updateError;
      result = data;
    } else {
      const { data, error: insertError } = await client.from('sac_controle').insert({ ...payload, created_by: scope.userId }).select('id').single();
      if (insertError) throw insertError;
      result = data;
    }

    return json({ ok: true, id: result?.id });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao salvar registro SAC.');
  }
}

export async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['operacao_controle_sac', 'controle_sac', 'operacao'], 4, 'Sem permissão para excluir SAC.');
    }

    const id = String(event.url.searchParams.get('id') || '').trim();
    if (!isUuid(id)) return json({ error: 'ID inválido.' }, { status: 400 });

    const { error: deleteError } = await client.from('sac_controle').delete().eq('id', id);
    if (deleteError) throw deleteError;

    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao excluir registro SAC.');
  }
}
