import { json } from '@sveltejs/kit';
import { getDefaultFollowUpRange, isIsoDate, resolveFollowUpFilters } from '$lib/server/agenda';
import { getAdminClient, requireAuthenticatedUser, resolveUserScope, toErrorResponse } from '$lib/server/v1';

function normalizeStatusFilter(value: string | null) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'fechados') return 'fechados';
  if (raw === 'todos') return 'todos';
  return 'abertos';
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    // Follow-up do dashboard é acessível a qualquer usuário autenticado
    // (a verificação de módulo detalhada fica nas rotas de operação completas)

    const defaults = getDefaultFollowUpRange();
    const inicio = String(event.url.searchParams.get('inicio') || defaults.inicio).trim();
    const fim = String(event.url.searchParams.get('fim') || defaults.fim).trim();
    const statusFilter = normalizeStatusFilter(event.url.searchParams.get('status'));

    if (!isIsoDate(inicio) || !isIsoDate(fim)) {
      return json({ error: 'inicio e fim devem estar no formato YYYY-MM-DD.' }, { status: 400 });
    }

    const { companyIds, vendedorIds } = await resolveFollowUpFilters(client, scope, event.url.searchParams);

    let candidatasQuery = client
      .from('viagens')
      .select(
        `
          id,
          venda_id,
          company_id,
          data_inicio,
          data_fim,
          follow_up_text,
          follow_up_fechado,
          updated_at,
          venda:vendas (
            id,
            data_embarque,
            data_final,
            vendedor_id,
            cancelada,
            cliente_id,
            clientes:clientes (id, nome, whatsapp, telefone),
            destino_cidade:cidades!destino_cidade_id (id, nome)
          )
        `
      )
      .not('data_fim', 'is', null)
      .gte('data_fim', inicio)
      .lte('data_fim', fim)
      .or('status.is.null,status.neq.Fechado')
      .eq('venda.cancelada', false)
      .order('data_fim', { ascending: false })
      .limit(500);

    if (statusFilter === 'abertos') {
      candidatasQuery = candidatasQuery.or('follow_up_fechado.is.null,follow_up_fechado.eq.false');
    } else if (statusFilter === 'fechados') {
      candidatasQuery = candidatasQuery.eq('follow_up_fechado', true);
    }

    if (companyIds.length > 0) {
      candidatasQuery = candidatasQuery.in('company_id', companyIds);
    }

    if (vendedorIds.length > 0) {
      candidatasQuery = candidatasQuery.in('venda.vendedor_id', vendedorIds);
    }

    const { data: candidatasData, error: candidatasError } = await candidatasQuery;
    if (candidatasError) throw candidatasError;

    const vendaIds = Array.from(
      new Set(
        (candidatasData || [])
          .map((row: any) => String(row?.venda_id || row?.venda?.id || '').trim())
          .filter(Boolean)
      )
    );

    const avulsas = (candidatasData || []).filter((row: any) => !row?.venda_id);

    let detalhadas: any[] = [];
    if (vendaIds.length > 0) {
      let detalhadasQuery = client
        .from('viagens')
        .select(
          `
            id,
            venda_id,
            company_id,
            data_inicio,
            data_fim,
            follow_up_text,
            follow_up_fechado,
            updated_at,
            venda:vendas (
              id,
              data_embarque,
              data_final,
              vendedor_id,
              cancelada,
              cliente_id,
              clientes:clientes (id, nome, whatsapp, telefone),
              destino_cidade:cidades!destino_cidade_id (id, nome)
            )
          `
        )
        .in('venda_id', vendaIds)
        .not('data_fim', 'is', null)
        .or('status.is.null,status.neq.Fechado')
        .eq('venda.cancelada', false)
        .order('data_fim', { ascending: false })
        .limit(5000);

      if (companyIds.length > 0) {
        detalhadasQuery = detalhadasQuery.in('company_id', companyIds);
      }

      if (vendedorIds.length > 0) {
        detalhadasQuery = detalhadasQuery.in('venda.vendedor_id', vendedorIds);
      }

      const { data: detalhadasData, error: detalhadasError } = await detalhadasQuery;
      if (detalhadasError) throw detalhadasError;
      detalhadas = detalhadasData || [];
    }

    const grupos = new Map<string, any>();

    for (const item of [...detalhadas, ...avulsas]) {
      const key = String(item?.venda_id || item?.venda?.id || item?.id || '').trim();
      if (!key) continue;

      const fechado = item?.follow_up_fechado === true;
      const existing = grupos.get(key);

      if (!existing) {
        grupos.set(key, {
          ...item,
          __allClosed: fechado
        });
        continue;
      }

      existing.__allClosed = Boolean(existing.__allClosed) && fechado;
      if (item?.data_inicio && (!existing.data_inicio || item.data_inicio < existing.data_inicio)) {
        existing.data_inicio = item.data_inicio;
      }
      if (item?.data_fim && (!existing.data_fim || item.data_fim > existing.data_fim)) {
        const savedStart = existing.data_inicio;
        const allClosed = existing.__allClosed;
        Object.assign(existing, item);
        existing.data_inicio = savedStart;
        existing.__allClosed = allClosed;
      }
      if (!existing.follow_up_text && item?.follow_up_text) {
        existing.follow_up_text = item.follow_up_text;
      }
      if (!existing.updated_at && item?.updated_at) {
        existing.updated_at = item.updated_at;
      }
    }

    const items = Array.from(grupos.values())
      .filter((item: any) => {
        if (statusFilter === 'abertos') return item.__allClosed !== true;
        if (statusFilter === 'fechados') return item.__allClosed === true;
        return true;
      })
      .filter((item: any) => {
        const retorno = String(item?.data_fim || item?.venda?.data_final || '').trim();
        return Boolean(retorno) && retorno >= inicio && retorno <= fim;
      })
      .sort((a: any, b: any) => String(b?.data_fim || '').localeCompare(String(a?.data_fim || '')))
      .map((item: any) => ({
        id: String(item.id),
        venda_id: item?.venda_id ? String(item.venda_id) : item?.venda?.id ? String(item.venda.id) : null,
        cliente_id: item?.venda?.cliente_id ? String(item.venda.cliente_id) : item?.venda?.clientes?.id ? String(item.venda.clientes.id) : null,
        cliente_nome: String(item?.venda?.clientes?.nome || 'Cliente sem nome'),
        cliente_whatsapp: item?.venda?.clientes?.whatsapp ? String(item.venda.clientes.whatsapp) : null,
        cliente_telefone: item?.venda?.clientes?.telefone ? String(item.venda.clientes.telefone) : null,
        destino_nome: item?.venda?.destino_cidade?.nome ? String(item.venda.destino_cidade.nome) : null,
        data_inicio: item?.data_inicio ? String(item.data_inicio) : null,
        data_fim: item?.data_fim ? String(item.data_fim) : null,
        data_embarque: item?.venda?.data_embarque ? String(item.venda.data_embarque) : null,
        data_final: item?.venda?.data_final ? String(item.venda.data_final) : null,
        vendedor_id: item?.venda?.vendedor_id ? String(item.venda.vendedor_id) : null,
        follow_up_fechado: item.__allClosed === true,
        follow_up_text: item?.follow_up_text ? String(item.follow_up_text) : null,
        updated_at: item?.updated_at ? String(item.updated_at) : null
      }));

    return json({ inicio, fim, items });
  } catch (err) {
    return toErrorResponse(err, 'Erro ao carregar follow-ups.');
  }
}
