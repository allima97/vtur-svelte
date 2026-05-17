import { json, error } from "@sveltejs/kit";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  logServerError,
  requireAuthenticatedUser,
  resolveScopedCompanyIds,
  resolveScopedVendedorIds,
  resolveUserScope,
  toErrorResponse,
} from "$lib/server/v1";
import {
  buildVendaPayload,
  ensureAssignableActiveSeller,
  ensureReciboReservaUnicos,
  syncVendaChildren,
} from "$lib/server/vendasSave";
import { NO_STORE_HEADERS } from "$lib/server/httpCache";
import { readJsonBodyLimited, rejectCrossOriginRequest, rejectLargePayload } from "$lib/server/requestGuards";
import { invalidateSalesReadModels } from "$lib/server/readModelCache";
import { fetchSaleForScope } from "$lib/server/salesScope";
import { chunkArray } from "$lib/utils/array";
import { toUserMessage } from "$lib/utils/errors";

const MAX_VENDA_UPDATE_BODY_BYTES = 512 * 1024;
const MAX_VENDA_DELETE_BODY_BYTES = 8 * 1024;

type SyncChildrenErrorLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
};

type VendaUpdateVendaPayload = Parameters<typeof buildVendaPayload>[0] & {
  vendedor_id?: string | null;
  cliente_id?: string | null;
  destino_id?: string | null;
};
type VendaUpdatePagamentosPayload = Parameters<
  typeof syncVendaChildren
>[0]["pagamentos"];

type VendaUpdateBody = {
  venda?: VendaUpdateVendaPayload;
  recibos?: VendaUpdateReciboPayload[];
  pagamentos?: VendaUpdatePagamentosPayload;
};

type VendaUpdateReciboPayload = {
  numero_recibo?: string | null;
  numero_reserva?: string | null;
  produto_id?: string | null;
  produto_resolvido_id?: string | null;
  destino_cidade_id?: string | null;
} & Record<string, unknown>;

type VendaReciboLookupRow = {
  numero_recibo?: string | null;
  numero_recibo_normalizado?: string | null;
  numero_reserva?: string | null;
  produto_id?: string | null;
  produto_resolvido_id?: string | null;
  destino_cidade_id?: string | null;
};

function logVendaError(context: string, err: unknown, extra?: Record<string, unknown>) {
  logServerError(context, err, extra);
}

async function fetchVendaLite(client: SupabaseClient, id: string) {
  const { data, error: vendaError } = await client
    .from("vendas")
    .select(
      "id, numero_venda, vendedor_id, cliente_id, company_id, data_lancamento, data_venda, data_embarque, data_final, valor_total, valor_total_bruto, valor_taxas, valor_total_pago, valor_nao_comissionado, status, cancelada, notas, created_at, updated_at, cliente:clientes!vendas_cliente_id_fkey(id,nome,cpf,telefone,email,whatsapp), vendedor:users!vendas_vendedor_id_fkey(id,nome_completo), destino_cidade:cidades!vendas_destino_cidade_id_fkey(id,nome)",
    )
    .eq("id", id)
    .maybeSingle();

  if (vendaError) throw vendaError;
  if (!data) return null;

  const [{ data: recibos, error: recibosError }, { data: pagamentos, error: pagamentosError }] =
    await Promise.all([
      client
        .from("vendas_recibos")
        .select(
          "id, venda_id, produto_id, produto_resolvido_id, destino_cidade_id, numero_recibo, numero_recibo_normalizado, numero_reserva, tipo_pacote, valor_total, valor_taxas, valor_du, valor_rav, data_inicio, data_fim, contrato_url, contrato_path",
        )
        .eq("venda_id", id)
        .limit(250),
      client
        .from("vendas_pagamentos")
        .select(
          "id, venda_id, forma_pagamento_id, forma_nome, operacao, plano, valor_bruto, desconto_valor, valor_total, parcelas, parcelas_qtd, parcelas_valor, vencimento_primeira, paga_comissao, observacoes, venda_recibo_id",
        )
        .eq("venda_id", id)
        .limit(250),
    ]);

  if (recibosError) throw recibosError;
  if (pagamentosError) throw pagamentosError;

  return {
    ...data,
    recibos: recibos || [],
    pagamentos: pagamentos || [],
    _lite: true,
  };
}

function mapSyncChildrenError(err: unknown) {
  const errorLike =
    err && typeof err === "object" ? (err as SyncChildrenErrorLike) : null;
  const code = String(errorLike?.code || "").trim();
  const message = String(errorLike?.message || "").trim();
  const detail = String(errorLike?.details || "").trim();
  const lowered = `${message} ${detail}`.toLowerCase();

  if (message === "RECIBO_INVALIDO") {
    return {
      status: 400,
      body: {
        code: "RECIBO_INVALIDO",
        error: "Recibo invalido: selecione um tipo/produto valido.",
      },
    };
  }

  if (code === "22P02") {
    if (lowered.includes("uuid")) {
      return {
        status: 400,
        body: {
          code: "UUID_INVALIDO",
          error:
            "Dados invalidos no payload (UUID mal formatado em recibos ou pagamentos).",
        },
      };
    }
    return {
      status: 400,
      body: {
        code: "TIPO_INVALIDO",
        error:
          "Dados invalidos no payload (formato numerico ou de data incorreto). Verifique valores como valor_total, taxas, parcelas, etc.",
      },
    };
  }

  if (code === "23503") {
    return {
      status: 400,
      body: {
        code: "REFERENCIA_INVALIDA",
        error:
          "Algum item referencia cadastro inexistente (produto, forma de pagamento ou relacao associada).",
      },
    };
  }

  if (code === "23502") {
    return {
      status: 400,
      body: {
        code: "CAMPO_OBRIGATORIO_AUSENTE",
        error:
          "Faltam campos obrigatorios para salvar os recibos/pagamentos da venda.",
      },
    };
  }

  if (code === "23505") {
    return {
      status: 409,
      body: {
        code: "DUPLICIDADE",
        error: "Conflito de dados duplicados ao sincronizar a venda.",
      },
    };
  }

  if (code === "42883") {
    return {
      status: 500,
      body: {
        code: "RPC_NAO_ENCONTRADA",
        error:
          "Funcao sync_venda_children nao encontrada no banco. Verifique se a migration foi aplicada.",
      },
    };
  }

  if (code === "P0001") {
    return {
      status: 400,
      body: {
        code: "REGRA_VIOLADA",
        error:
          message || "Uma regra de negocio foi violada ao sincronizar a venda.",
      },
    };
  }

  return null;
}

export async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin && !scope.isMaster)
      ensureModuloAccess(
        scope,
        ["vendas_consulta", "vendas", "vendas_importar", "Importar Contratos"],
        1,
        "Sem acesso a Vendas.",
      );

    const id = String(event.params.id || "").trim();
    if (!isUuid(id)) {
      return json({ error: "ID invalido." }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const companyIds = resolveScopedCompanyIds(
      scope,
      event.url.searchParams.get("empresa_id"),
    );
    const vendedorIds = await resolveScopedVendedorIds(
      client,
      scope,
      event.url.searchParams.get("vendedor_id"),
    );
    const scopedSale = await fetchSaleForScope({ client, scope, saleId: id, companyIds, vendedorIds });
    if (!scopedSale) throw error(404, "Venda não encontrada.");

    if (event.url.searchParams.get("lite") === "1") {
      const liteData = await fetchVendaLite(client, id);
      if (!liteData) throw error(404, "Venda não encontrada.");
      return json(liteData, { headers: NO_STORE_HEADERS });
    }

    const selectClauses = [
      `*, cliente:clientes!vendas_cliente_id_fkey(id,nome,cpf,telefone,email,whatsapp), vendedor:users!vendas_vendedor_id_fkey(id,nome_completo), destino:produtos!vendas_destino_id_fkey(id,nome,cidade_id,tipo_produto,todas_as_cidades), destino_cidade:cidades!vendas_destino_cidade_id_fkey(id,nome), recibos:vendas_recibos(*, destino_cidade:cidades!destino_cidade_id(id,nome), produto_resolvido:produtos!produto_resolvido_id(id,nome,cidade_id,tipo_produto,todas_as_cidades), tipo_produtos:tipo_produtos!produto_id(id,nome,tipo)), pagamentos:vendas_pagamentos!vendas_pagamentos_venda_id_fkey(*)`,
      `id, numero_venda, vendedor_id, cliente_id, company_id, data_lancamento, data_venda, data_embarque, data_final, valor_total, valor_total_bruto, valor_taxas, valor_total_pago, valor_nao_comissionado, desconto_comercial_aplicado, desconto_comercial_valor, status, cancelada, notas, cliente:clientes!vendas_cliente_id_fkey(id,nome,cpf,telefone,email,whatsapp), vendedor:users!vendas_vendedor_id_fkey(id,nome_completo), destino:produtos!vendas_destino_id_fkey(id,nome,cidade_id,tipo_produto,todas_as_cidades), destino_cidade:cidades!vendas_destino_cidade_id_fkey(id,nome), recibos:vendas_recibos(id, venda_id, produto_id, produto_resolvido_id, destino_cidade_id, numero_recibo, numero_recibo_normalizado, numero_reserva, tipo_pacote, valor_total, valor_taxas, valor_du, valor_rav, data_inicio, data_fim, contrato_url, contrato_path, destino_cidade:cidades!destino_cidade_id(id,nome), produto_resolvido:produtos!produto_resolvido_id(id,nome,cidade_id,tipo_produto,todas_as_cidades), tipo_produtos:tipo_produtos!produto_id(id,nome,tipo)), pagamentos:vendas_pagamentos!vendas_pagamentos_venda_id_fkey(*)`,
    ];

    let data: unknown = null;
    let lastError: unknown = null;

    for (const selectClause of selectClauses) {
      const result = await client.from("vendas").select(selectClause).eq("id", id).maybeSingle();
      if (!result.error) {
        data = result.data;
        lastError = null;
        break;
      }
      lastError = result.error;
    }

    if (lastError) throw lastError;
    if (!data) throw error(404, "Venda não encontrada.");
    return json(data, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar venda.");
  }
}

export async function PATCH(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(event.request, MAX_VENDA_UPDATE_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin && !scope.isMaster)
      ensureModuloAccess(
        scope,
        ["vendas_consulta", "vendas"],
        3,
        "Sem permissão para editar vendas.",
      );

    const id = String(event.params.id || "").trim();
    if (!isUuid(id)) {
      return json({ error: "ID invalido." }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const companyIds = resolveScopedCompanyIds(
      scope,
      event.url.searchParams.get("empresa_id"),
    );
    const vendedorIds = await resolveScopedVendedorIds(
      client,
      scope,
      event.url.searchParams.get("vendedor_id"),
    );
    const saleScopeData = await fetchSaleForScope({ client, scope, saleId: id, companyIds, vendedorIds });
    if (!saleScopeData?.id) throw error(404, "Venda não encontrada.");

    const targetCompanyId =
      String(
        (saleScopeData as { company_id?: string | null })?.company_id || "",
      ).trim() || null;
    if (!isUuid(targetCompanyId || "")) {
      return json(
        {
          code: "VENDA_SEM_EMPRESA",
          error:
            "Venda sem empresa vinculada. Atualize o cadastro da venda antes de editar recibos/pagamentos.",
        },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const body: VendaUpdateBody =
      bodyResult.data && typeof bodyResult.data === "object"
        ? (bodyResult.data as VendaUpdateBody)
        : {};
    const venda: VendaUpdateVendaPayload =
      body.venda && typeof body.venda === "object"
        ? body.venda
        : ((body as unknown) as VendaUpdateVendaPayload);
    const recibos = Array.isArray(body?.recibos) ? body.recibos : [];
    const pagamentos = Array.isArray(body?.pagamentos) ? body.pagamentos : [];

    const vendedorId = String(venda?.vendedor_id || "").trim() || scope.userId;
    const deniedSeller = await ensureAssignableActiveSeller(
      client,
      scope,
      vendedorId,
    );
    if (!isUuid(vendedorId) || deniedSeller) {
      return json(
        { error: deniedSeller || "Vendedor invalido." },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const clienteId = String(venda?.cliente_id || "").trim();
    if (!isUuid(clienteId)) {
      return json({ error: "Cliente invalido." }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const destinationId = String(venda?.destino_id || "").trim();
    if (!isUuid(destinationId)) {
      return json({ error: "Destino invalido." }, { status: 400, headers: NO_STORE_HEADERS });
    }

    if (!Array.isArray(recibos) || recibos.length === 0) {
      return json({ error: "Inclua ao menos um recibo." }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const normalizeReceiptKey = (value?: string | null) =>
      String(value || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
    const normalizeReservaKey = (value?: string | null) =>
      String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");

    const payloadReceiptKeys = Array.from(
      new Set(
        recibos
          .map((item: VendaUpdateReciboPayload) =>
            normalizeReceiptKey(item?.numero_recibo),
          )
          .filter(Boolean),
      ),
    ).sort();
    const payloadReservaKeys = Array.from(
      new Set(
        recibos
          .map((item: VendaUpdateReciboPayload) =>
            normalizeReservaKey(item?.numero_reserva),
          )
          .filter(Boolean),
      ),
    ).sort();

    const { data: currentRecibos, error: currentRecibosError } = await client
      .from("vendas_recibos")
      .select(
        "numero_recibo, numero_recibo_normalizado, numero_reserva, produto_id, produto_resolvido_id, destino_cidade_id",
      )
      .eq("venda_id", id);
    if (currentRecibosError) throw currentRecibosError;

    const currentReciboByReceipt = new Map<string, VendaReciboLookupRow>();
    const currentReciboByReserva = new Map<string, VendaReciboLookupRow>();
    for (const row of (currentRecibos || []) as VendaReciboLookupRow[]) {
      const receiptKey = normalizeReceiptKey(
        row?.numero_recibo_normalizado || row?.numero_recibo,
      );
      const reservaKey = normalizeReservaKey(row?.numero_reserva);
      if (receiptKey) currentReciboByReceipt.set(receiptKey, row);
      if (reservaKey) currentReciboByReserva.set(reservaKey, row);
    }

    const recibosForSync = recibos.map((item: VendaUpdateReciboPayload) => {
      const current =
        currentReciboByReceipt.get(normalizeReceiptKey(item?.numero_recibo)) ||
        currentReciboByReserva.get(normalizeReservaKey(item?.numero_reserva)) ||
        null;
      if (!current) return item;
      return {
        ...item,
        produto_id: item?.produto_id || current?.produto_id || null,
        produto_resolvido_id:
          item?.produto_resolvido_id || current?.produto_resolvido_id || null,
        destino_cidade_id:
          item?.destino_cidade_id || current?.destino_cidade_id || null,
      };
    });

    const currentReceiptKeys = Array.from(
      new Set(
        ((currentRecibos || []) as VendaReciboLookupRow[])
          .map((row) =>
            normalizeReceiptKey(
              row?.numero_recibo_normalizado || row?.numero_recibo,
            ),
          )
          .filter(Boolean),
      ),
    ).sort();
    const currentReservaKeys = Array.from(
      new Set(
        ((currentRecibos || []) as VendaReciboLookupRow[])
          .map((row) => normalizeReservaKey(row?.numero_reserva))
          .filter(Boolean),
      ),
    ).sort();

    const sameReceiptSet =
      payloadReceiptKeys.length === currentReceiptKeys.length &&
      payloadReceiptKeys.every(
        (value, index) => value === currentReceiptKeys[index],
      );
    const sameReservaSet =
      payloadReservaKeys.length === currentReservaKeys.length &&
      payloadReservaKeys.every(
        (value, index) => value === currentReservaKeys[index],
      );

    if (!sameReceiptSet || !sameReservaSet) {
      try {
        await ensureReciboReservaUnicos({
          client,
          companyId: targetCompanyId,
          clienteId,
          ignoreVendaId: id,
          recibos: recibosForSync,
        });
      } catch (err) {
        const code = toUserMessage(err, "Erro ao validar recibos.");
        if (code === "RECIBO_DUPLICADO") {
          return json(
            { code, error: "Recibo já utilizado em outra venda da empresa." },
            { status: 409, headers: NO_STORE_HEADERS },
          );
        }
        if (code === "RESERVA_DUPLICADA") {
          return json(
            { code, error: "Reserva já vinculada a outro recibo/venda." },
            { status: 409, headers: NO_STORE_HEADERS },
          );
        }
        throw err;
      }
    }

    let payload;
    try {
      payload = buildVendaPayload(
        venda,
        vendedorId,
        clienteId,
        destinationId,
        targetCompanyId,
      );
    } catch (err) {
      const code = toUserMessage(err, "");
      logVendaError("[PATCH venda] buildVendaPayload error:", err, { code });
      if (code === "DATA_VENDA_INVALIDA") {
        return json({ error: "Data da venda invalida." }, { status: 400, headers: NO_STORE_HEADERS });
      }
      throw err;
    }

    const query = client
      .from("vendas")
      .update(payload)
      .eq("id", id)
      .eq("company_id", targetCompanyId);
    const { data, error: updateError } = await query.select("id").maybeSingle();
    if (updateError) {
      logVendaError("[PATCH venda] update vendas error:", updateError);
      throw updateError;
    }
    if (!data?.id) throw error(404, "Venda não encontrada.");

    try {
      await syncVendaChildren({
        client,
        vendaId: data.id,
        companyId: targetCompanyId,
        clienteId,
        vendedorId,
        userId: user.id,
        dataVenda: String(payload.data_venda || ""),
        recibos: recibosForSync,
        pagamentos,
      });
    } catch (syncError) {
      logVendaError("[PATCH venda] syncVendaChildren error:", syncError);
      const mapped = mapSyncChildrenError(syncError);
      if (mapped) {
        return json(mapped.body, { status: mapped.status, headers: NO_STORE_HEADERS });
      }
      throw syncError;
    }

    invalidateSalesReadModels({
      companyIds: targetCompanyId ? [targetCompanyId] : companyIds,
      vendedorIds: [vendedorId],
      userId: user.id,
    });

    return json({ ok: true, venda_id: data.id }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    logVendaError("[PATCH venda] catch geral:", err);
    return toErrorResponse(err, "Erro ao atualizar venda.");
  }
}

export async function DELETE(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const payloadError = rejectLargePayload(event.request, MAX_VENDA_DELETE_BODY_BYTES);
    if (payloadError) return payloadError;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin && !scope.isMaster) {
      ensureModuloAccess(
        scope,
        ["vendas_consulta", "vendas"],
        4,
        "Sem permissão para excluir vendas.",
      );
    }

    const id = String(event.params.id || "").trim();
    if (!isUuid(id)) {
      return json({ error: "ID invalido." }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const companyIds = resolveScopedCompanyIds(
      scope,
      event.url.searchParams.get("empresa_id"),
    );
    const vendedorIds = await resolveScopedVendedorIds(
      client,
      scope,
      event.url.searchParams.get("vendedor_id"),
    );
    const saleScopeData = await fetchSaleForScope({ client, scope, saleId: id, companyIds, vendedorIds });
    if (!saleScopeData?.id) throw error(404, "Venda não encontrada.");

    const { data: recibosData, error: recibosError } = await client
      .from("vendas_recibos")
      .select("id")
      .eq("venda_id", id);
    if (recibosError) throw recibosError;

    const reciboIds = (recibosData || [])
      .map((row: { id?: string | null }) => String(row?.id || "").trim())
      .filter((value: string) => isUuid(value));

    const ignoreMissingTable = (err: unknown) => {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? String((err as { code?: unknown }).code || "").trim()
          : "";
      return code === "42P01" || code === "42703";
    };

    const clearConciliacaoPayload = {
      venda_id: null,
      venda_recibo_id: null,
      conciliado: false,
      conciliado_em: null,
      last_checked_at: null,
      sistema_valor_total: null,
      sistema_valor_taxas: null,
      match_total: false,
      match_taxas: false,
      diff_total: null,
      diff_taxas: null,
    };

    const clearConciliacaoByVendaQuery = client
      .from("conciliacao_recibos")
      .update(clearConciliacaoPayload)
      .eq("venda_id", id);
    const { error: clearConciliacaoByVendaError } = await clearConciliacaoByVendaQuery;
    if (clearConciliacaoByVendaError && !ignoreMissingTable(clearConciliacaoByVendaError))
      throw clearConciliacaoByVendaError;

    if (reciboIds.length > 0) {
      for (const batch of chunkArray(reciboIds)) {
        const { error: clearConciliacaoByReciboError } = await client
          .from("conciliacao_recibos")
          .update(clearConciliacaoPayload)
          .in("venda_recibo_id", batch);
        if (clearConciliacaoByReciboError && !ignoreMissingTable(clearConciliacaoByReciboError))
          throw clearConciliacaoByReciboError;
      }
    }

    if (reciboIds.length > 0) {
      for (const batch of chunkArray(reciboIds)) {
        const { error: rateioError } = await client
          .from("vendas_recibos_rateio")
          .delete()
          .in("venda_recibo_id", batch);
        if (rateioError && !ignoreMissingTable(rateioError)) throw rateioError;

        const { error: notasPorReciboError } = await client
          .from("vendas_recibos_notas")
          .delete()
          .in("recibo_id", batch);
        if (notasPorReciboError && !ignoreMissingTable(notasPorReciboError))
          throw notasPorReciboError;
      }
    }

    const { error: notasError } = await client
      .from("vendas_recibos_notas")
      .delete()
      .eq("venda_id", id);
    if (notasError && !ignoreMissingTable(notasError)) throw notasError;

    const { error: complementaresError } = await client
      .from("vendas_recibos_complementares")
      .delete()
      .eq("venda_id", id);
    if (complementaresError && !ignoreMissingTable(complementaresError))
      throw complementaresError;

    const { error: paymentsError } = await client
      .from("vendas_pagamentos")
      .delete()
      .eq("venda_id", id);
    if (paymentsError) throw paymentsError;

    const { error: receiptsError } = await client
      .from("vendas_recibos")
      .delete()
      .eq("venda_id", id);
    if (receiptsError) throw receiptsError;

    const { error: viagensError } = await client
      .from("viagens")
      .update({ venda_id: null })
      .eq("venda_id", id);
    if (viagensError && !ignoreMissingTable(viagensError)) throw viagensError;

    const { error: deleteError } = await client
      .from("vendas")
      .delete()
      .eq("id", id)
      .eq("company_id", String(saleScopeData.company_id || "").trim());
    if (deleteError) throw deleteError;

    invalidateSalesReadModels({
      companyIds: saleScopeData?.company_id
        ? [saleScopeData.company_id]
        : companyIds,
      vendedorIds: saleScopeData?.vendedor_id
        ? [saleScopeData.vendedor_id]
        : [],
      userId: user.id,
    });

    return json({ ok: true, deleted: true }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, "Erro ao excluir venda.");
  }
}
