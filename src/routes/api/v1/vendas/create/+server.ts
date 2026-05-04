import { json } from "@sveltejs/kit";
import {
  ensureModuloAccess,
  getAdminClient,
  isUuid,
  requireAuthenticatedUser,
  resolveScopedCompanyId,
  resolveUserScope,
  toErrorResponse,
} from "$lib/server/v1";
import {
  buildVendaPayload,
  closeQuoteIfNeeded,
  ensureAssignableActiveSeller,
  ensureReciboReservaUnicos,
  syncVendaChildren,
} from "$lib/server/vendasSave";
import { NO_STORE_HEADERS } from "$lib/server/httpCache";
import { readJsonBodyLimited, rejectCrossOriginRequest } from "$lib/server/requestGuards";
import { invalidateSalesReadModels } from "$lib/server/readModelCache";

const MAX_VENDA_CREATE_BODY_BYTES = 512 * 1024;

export async function POST(event) {
  try {
    const originError = rejectCrossOriginRequest(event.request);
    if (originError) return originError;
    const bodyResult = await readJsonBodyLimited(event.request, MAX_VENDA_CREATE_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;

    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(
        scope,
        ["vendas", "vendas_cadastro"],
        2,
        "Sem permissao para cadastrar vendas.",
      );
    }

    const body =
      bodyResult.data && typeof bodyResult.data === "object"
        ? (bodyResult.data as Record<string, any>)
        : {};
    const venda = body?.venda || {};
    const recibos = Array.isArray(body?.recibos) ? body.recibos : [];
    const pagamentos = Array.isArray(body?.pagamentos) ? body.pagamentos : [];

    const vendedorId = String(venda?.vendedor_id || scope.userId).trim();
    if (!isUuid(vendedorId)) {
      return json({ error: "Vendedor invalido." }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const deniedSeller = await ensureAssignableActiveSeller(
      client,
      scope,
      vendedorId,
    );
    if (deniedSeller) {
      return json(
        { error: deniedSeller },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const { data: sellerScope, error: sellerScopeError } = await client
      .from("users")
      .select("id, company_id")
      .eq("id", vendedorId)
      .maybeSingle();
    if (sellerScopeError) throw sellerScopeError;

    const sellerCompanyId =
      String((sellerScope as any)?.company_id || "").trim() || null;
    const requestedCompanyId = String(
      venda?.company_id || venda?.empresa_id || "",
    ).trim();
    const targetCompanyId = scope.isAdmin
      ? requestedCompanyId || sellerCompanyId || scope.companyId
      : resolveScopedCompanyId(
          scope,
          requestedCompanyId || sellerCompanyId || scope.companyId,
        );

    if (!targetCompanyId) {
      return json(
        { error: "Selecione uma empresa para cadastrar a venda." },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    if (sellerCompanyId && sellerCompanyId !== targetCompanyId) {
      return json(
        { error: "Vendedor fora da empresa selecionada." },
        { status: 403, headers: NO_STORE_HEADERS },
      );
    }

    const clienteId = String(venda?.cliente_id || "").trim();
    if (!isUuid(clienteId))
      return json({ error: "Cliente invalido." }, { status: 400, headers: NO_STORE_HEADERS });

    const destinoId = String(venda?.destino_id || "").trim();
    if (!isUuid(destinoId))
      return json({ error: "Destino invalido." }, { status: 400, headers: NO_STORE_HEADERS });

    if (!Array.isArray(recibos) || recibos.length === 0) {
      return json({ error: "Inclua ao menos um recibo." }, { status: 400, headers: NO_STORE_HEADERS });
    }

    try {
      await ensureReciboReservaUnicos({
        client,
        companyId: targetCompanyId,
        clienteId,
        recibos,
      });
    } catch (err) {
      const code =
        err instanceof Error ? err.message : "Erro ao validar recibos.";
      if (code === "RECIBO_DUPLICADO" || code === "RESERVA_DUPLICADA") {
        return json({ code }, { status: 409, headers: NO_STORE_HEADERS });
      }
      throw err;
    }

    let vendaPayload;
    try {
      vendaPayload = buildVendaPayload(
        venda,
        vendedorId,
        clienteId,
        destinoId,
        targetCompanyId,
      );
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "DATA_VENDA_INVALIDA") {
        return json({ error: "Data da venda invalida." }, { status: 400, headers: NO_STORE_HEADERS });
      }
      throw err;
    }
    const { data: insertedSale, error: saleError } = await client
      .from("vendas")
      .insert(vendaPayload)
      .select("id")
      .single();
    if (saleError || !insertedSale?.id)
      throw saleError || new Error("Erro ao criar venda.");

    await syncVendaChildren({
      client,
      vendaId: insertedSale.id,
      companyId: targetCompanyId,
      clienteId,
      vendedorId,
      userId: user.id,
      recibos,
      pagamentos,
    });

    await closeQuoteIfNeeded(client, body?.orcamento_id);
    invalidateSalesReadModels({
      companyIds: [targetCompanyId],
      vendedorIds: [vendedorId],
      userId: user.id,
    });

    return json({ ok: true, venda_id: insertedSale.id }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return toErrorResponse(err, "Erro ao salvar venda.");
  }
}
