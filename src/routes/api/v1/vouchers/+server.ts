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

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['vouchers', 'operacao'], 1, 'Sem acesso a Vouchers.');
    }

    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get('company_id'));

    let query = client
      .from('vouchers')
      .select(`
        id, company_id, provider, nome, codigo_systur, codigo_fornecedor,
        reserva_online, passageiros, tipo_acomodacao, operador, resumo,
        data_inicio, data_fim, ativo, extra_data, created_at, updated_at,
        voucher_dias(id, dia_numero, titulo, descricao, data_referencia, cidade, ordem),
        voucher_hoteis(id, cidade, hotel, endereco, data_inicio, data_fim, noites, telefone, contato, status, observacao, ordem)
      `)
      .order('updated_at', { ascending: false })
      .limit(500);

    if (companyIds.length > 0) query = query.in('company_id', companyIds);

    const { data, error } = await query;
    if (error) throw error;

    return json({ success: true, items: data || [] });
  } catch (err: any) {
    return toErrorResponse(err, 'Erro ao carregar vouchers.');
  }
}

export async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['vouchers', 'operacao'], 2, 'Sem permissão para criar vouchers.');
    }

    const body = await event.request.json();

    const { data: voucher, error: voucherError } = await client
      .from('vouchers')
      .insert([{
        company_id: scope.companyId,
        created_by: user.id,
        provider: body.provider || 'special_tours',
        nome: String(body.nome || '').trim(),
        codigo_systur: body.codigo_systur || null,
        codigo_fornecedor: body.codigo_fornecedor || null,
        reserva_online: body.reserva_online || null,
        passageiros: body.passageiros || null,
        tipo_acomodacao: body.tipo_acomodacao || null,
        operador: body.operador || null,
        resumo: body.resumo || null,
        extra_data: body.extra_data || {},
        data_inicio: body.data_inicio || null,
        data_fim: body.data_fim || null,
        ativo: body.ativo !== false
      }])
      .select('id')
      .single();

    if (voucherError) throw voucherError;

    if (Array.isArray(body.dias) && body.dias.length > 0) {
      const diasPayload = body.dias.map((dia: any, index: number) => ({
        voucher_id: voucher.id,
        dia_numero: dia.dia_numero || index + 1,
        titulo: dia.titulo || null,
        descricao: String(dia.descricao || ''),
        data_referencia: dia.data_referencia || null,
        cidade: dia.cidade || null,
        ordem: index
      }));
      const { error: diasError } = await client.from('voucher_dias').insert(diasPayload);
      if (diasError) console.warn('[vouchers POST] Erro ao inserir dias:', diasError.message);
    }

    if (Array.isArray(body.hoteis) && body.hoteis.length > 0) {
      const hoteisPayload = body.hoteis.map((hotel: any, index: number) => ({
        voucher_id: voucher.id,
        cidade: String(hotel.cidade || ''),
        hotel: String(hotel.hotel || ''),
        endereco: hotel.endereco || null,
        data_inicio: hotel.data_inicio || null,
        data_fim: hotel.data_fim || null,
        noites: hotel.noites ?? null,
        telefone: hotel.telefone || null,
        contato: hotel.contato || null,
        status: hotel.status || null,
        observacao: hotel.observacao || null,
        ordem: index
      }));
      const { error: hoteisError } = await client.from('voucher_hoteis').insert(hoteisPayload);
      if (hoteisError) console.warn('[vouchers POST] Erro ao inserir hoteis:', hoteisError.message);
    }

    return json({ success: true, item: { id: voucher.id } });
  } catch (err: any) {
    return toErrorResponse(err, 'Erro ao criar voucher.');
  }
}
