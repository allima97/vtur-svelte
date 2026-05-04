import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  logServerError,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveUserScope,
  toErrorResponse
} from '$lib/server/v1';
import { DYNAMIC_READ_HEADERS, NO_STORE_HEADERS } from '$lib/server/httpCache';
import { readJsonBodyLimited, rejectCrossOriginRequest } from '$lib/server/requestGuards';

const MAX_VOUCHER_BODY_BYTES = 512 * 1024;
const SUPABASE_IN_BATCH_SIZE = 100;

function chunkArray<T>(values: T[], size = SUPABASE_IN_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['operacao_vouchers', 'vouchers', 'operacao'], 1, 'Sem acesso a Vouchers.');
    }

    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get('company_id'));

    const buildQuery = (companyIdsFilter?: string[]) => {
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

      if (companyIdsFilter && companyIdsFilter.length > 0) query = query.in('company_id', companyIdsFilter);
      return query;
    };

    const fetchItems = async () => {
      if (companyIds.length <= SUPABASE_IN_BATCH_SIZE) {
        const { data, error } = await buildQuery(companyIds);
        if (error) throw error;
        return data || [];
      }

      const rows: any[] = [];
      for (const batch of chunkArray(companyIds)) {
        const { data, error } = await buildQuery(batch);
        if (error) throw error;
        rows.push(...(data || []));
      }

      return Array.from(new Map(rows.map((row: any) => [String(row?.id || ''), row])).values())
        .sort((left: any, right: any) =>
          String(right?.updated_at || '').localeCompare(String(left?.updated_at || ''))
        )
        .slice(0, 500);
    };

    return json({ success: true, items: await fetchItems() }, { headers: DYNAMIC_READ_HEADERS });
  } catch (err: any) {
    return toErrorResponse(err, 'Erro ao carregar vouchers.');
  }
}

export async function POST(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(event.request, MAX_VOUCHER_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['operacao_vouchers', 'vouchers', 'operacao'], 2, 'Sem permissão para criar vouchers.');
    }

    const body =
      bodyResult.data && typeof bodyResult.data === 'object'
        ? (bodyResult.data as Record<string, any>)
        : {};

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
      if (diasError) logServerError('[vouchers POST] Erro ao inserir dias', diasError);
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
      if (hoteisError) logServerError('[vouchers POST] Erro ao inserir hoteis', hoteisError);
    }

    return json({ success: true, item: { id: voucher.id } }, { headers: NO_STORE_HEADERS });
  } catch (err: any) {
    return toErrorResponse(err, 'Erro ao criar voucher.');
  }
}
