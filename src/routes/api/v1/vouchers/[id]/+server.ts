import { json } from '@sveltejs/kit';
import {
  ensureModuloAccess,
  getAdminClient,
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
      ensureModuloAccess(scope, ['operacao_vouchers', 'vouchers', 'operacao'], 1, 'Sem acesso a Vouchers.');
    }

    const { data, error } = await client
      .from('vouchers')
      .select(`
        id, company_id, provider, nome, codigo_systur, codigo_fornecedor,
        reserva_online, passageiros, tipo_acomodacao, operador, resumo,
        data_inicio, data_fim, ativo, extra_data, created_at, updated_at,
        voucher_dias(id, dia_numero, titulo, descricao, data_referencia, cidade, ordem),
        voucher_hoteis(id, cidade, hotel, endereco, data_inicio, data_fim, noites, telefone, contato, status, observacao, ordem)
      `)
      .eq('id', event.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return json({ success: false, error: 'Voucher não encontrado' }, { status: 404 });

    return json({ success: true, item: data });
  } catch (err: any) {
    return toErrorResponse(err, 'Erro ao carregar voucher.');
  }
}

export async function PATCH(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['operacao_vouchers', 'vouchers', 'operacao'], 3, 'Sem permissão para editar vouchers.');
    }

    const body = await event.request.json();
    const id = event.params.id;

    // Verifica escopo
    const { data: existing } = await client.from('vouchers').select('id, company_id').eq('id', id).maybeSingle();
    if (!existing) return json({ error: 'Voucher não encontrado.' }, { status: 404 });
    if (!scope.isAdmin && existing.company_id !== scope.companyId) {
      return json({ error: 'Voucher fora do escopo.' }, { status: 403 });
    }

    const { error: voucherError } = await client
      .from('vouchers')
      .update({
        updated_by: user.id,
        provider: body.provider,
        nome: String(body.nome || '').trim() || undefined,
        codigo_systur: body.codigo_systur ?? undefined,
        codigo_fornecedor: body.codigo_fornecedor ?? undefined,
        reserva_online: body.reserva_online ?? undefined,
        passageiros: body.passageiros ?? undefined,
        tipo_acomodacao: body.tipo_acomodacao ?? undefined,
        operador: body.operador ?? undefined,
        resumo: body.resumo ?? undefined,
        extra_data: body.extra_data ?? undefined,
        data_inicio: body.data_inicio ?? undefined,
        data_fim: body.data_fim ?? undefined,
        ativo: body.ativo ?? undefined
      })
      .eq('id', id);

    if (voucherError) throw voucherError;

    // Rebuild dias
    await client.from('voucher_dias').delete().eq('voucher_id', id);
    if (Array.isArray(body.dias) && body.dias.length > 0) {
      const diasPayload = body.dias.map((dia: any, index: number) => ({
        voucher_id: id,
        dia_numero: dia.dia_numero || index + 1,
        titulo: dia.titulo || null,
        descricao: String(dia.descricao || ''),
        data_referencia: dia.data_referencia || null,
        cidade: dia.cidade || null,
        ordem: index
      }));
      await client.from('voucher_dias').insert(diasPayload);
    }

    // Rebuild hoteis
    await client.from('voucher_hoteis').delete().eq('voucher_id', id);
    if (Array.isArray(body.hoteis) && body.hoteis.length > 0) {
      const hoteisPayload = body.hoteis.map((hotel: any, index: number) => ({
        voucher_id: id,
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
      await client.from('voucher_hoteis').insert(hoteisPayload);
    }

    return json({ success: true });
  } catch (err: any) {
    return toErrorResponse(err, 'Erro ao atualizar voucher.');
  }
}

export async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['operacao_vouchers', 'vouchers', 'operacao'], 4, 'Sem permissão para excluir vouchers.');
    }

    const id = event.params.id;

    const { data: existing } = await client.from('vouchers').select('id, company_id').eq('id', id).maybeSingle();
    if (!existing) return json({ error: 'Voucher não encontrado.' }, { status: 404 });
    if (!scope.isAdmin && existing.company_id !== scope.companyId) {
      return json({ error: 'Voucher fora do escopo.' }, { status: 403 });
    }

    await client.from('voucher_dias').delete().eq('voucher_id', id);
    await client.from('voucher_hoteis').delete().eq('voucher_id', id);

    const { error } = await client.from('vouchers').delete().eq('id', id);
    if (error) throw error;

    return json({ success: true });
  } catch (err: any) {
    return toErrorResponse(err, 'Erro ao excluir voucher.');
  }
}
