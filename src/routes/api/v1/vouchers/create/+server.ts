import { json } from '@sveltejs/kit';
import { getAdminClient, requireAuthenticatedUser, resolveUserScope, toErrorResponse } from '$lib/server/v1';

// Cria um voucher usando as colunas reais da tabela vouchers
export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    const body = await event.request.json();

    const { data, error } = await client
      .from('vouchers')
      .insert([{
        company_id: scope.companyId,
        created_by: user.id,
        provider: body.provider || 'generic',
        nome: body.nome || 'Voucher',
        codigo_systur: body.codigo_systur || null,
        codigo_fornecedor: body.codigo_fornecedor || null,
        reserva_online: body.reserva_online || null,
        operador: body.operador || null,
        resumo: body.resumo || null,
        data_inicio: body.data_inicio || null,
        data_fim: body.data_fim || null,
        ativo: body.ativo !== false,
        passageiros: body.passageiros || null,
        tipo_acomodacao: body.tipo_acomodacao || null,
        extra_data: body.extra_data || {}
      }])
      .select()
      .single();

    if (error) throw error;

    return json({ success: true, item: data });
  } catch (err: any) {
    return toErrorResponse(err, 'Erro ao criar voucher.');
  }
}
