import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, i as isUuid, e as ensureModuloAccess, t as toErrorResponse } from "../../../../../../chunks/v1.js";
import { e as ensureAssignableActiveSeller, a as ensureReciboReservaUnicos, b as buildVendaPayload, s as syncVendaChildren, c as closeQuoteIfNeeded } from "../../../../../../chunks/vendasSave.js";
async function POST(event) {
  try {
    const adminClient = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(adminClient, user.id);
    const body = await event.request.json();
    const { venda, recibos = [], pagamentos = [], orcamento_id } = body ?? {};
    if (!venda || typeof venda !== "object") {
      return json({ error: 'Payload inválido: campo "venda" obrigatório.' }, { status: 400 });
    }
    if (!isUuid(venda.cliente_id)) {
      return json({ error: "cliente_id inválido ou ausente." }, { status: 400 });
    }
    if (!isUuid(venda.destino_id)) {
      return json({ error: "destino_id inválido ou ausente." }, { status: 400 });
    }
    if (!Array.isArray(recibos) || recibos.length === 0) {
      return json({ error: "Pelo menos um recibo é obrigatório." }, { status: 400 });
    }
    const clienteId = String(venda.cliente_id).trim();
    const vendaId = String(venda.id || "").trim();
    const isEdit = isUuid(vendaId);
    if (!scope.isAdmin) {
      const moduloMin = isEdit ? 3 : 2;
      ensureModuloAccess(scope, ["vendas", "vendas_cadastro"], moduloMin, "Sem permissão para salvar vendas.");
    }
    const canAssign = scope.isGestor || scope.isMaster || scope.isAdmin;
    const vendedorId = canAssign && isUuid(venda.vendedor_id) ? String(venda.vendedor_id) : scope.userId;
    if (!scope.isAdmin) {
      const denied = await ensureAssignableActiveSeller(adminClient, scope, vendedorId);
      if (denied) {
        return json({ error: denied }, { status: 403 });
      }
    }
    await ensureReciboReservaUnicos({
      client: adminClient,
      companyId: scope.companyId,
      clienteId,
      ignoreVendaId: isEdit ? vendaId : null,
      recibos
    });
    let vendaPayload;
    try {
      vendaPayload = buildVendaPayload(
        venda,
        vendedorId,
        clienteId,
        String(venda.destino_id),
        scope.companyId
      );
    } catch (e) {
      if (e?.message === "DATA_VENDA_INVALIDA") {
        return json({ error: "data_venda inválida." }, { status: 400 });
      }
      throw e;
    }
    let vendaIdFinal;
    if (isEdit) {
      const { data: updated, error: updateError } = await adminClient.from("vendas").update(vendaPayload).eq("id", vendaId).select("id").maybeSingle();
      if (updateError) throw updateError;
      if (!updated?.id) {
        return json({ error: "Venda não encontrada ou sem permissão." }, { status: 403 });
      }
      vendaIdFinal = updated.id;
    } else {
      const { data: inserted, error: insertError } = await adminClient.from("vendas").insert(vendaPayload).select("id").single();
      if (insertError) throw insertError;
      vendaIdFinal = inserted.id;
    }
    if (!vendaIdFinal) {
      return json({ error: "Venda não foi gerada." }, { status: 500 });
    }
    await syncVendaChildren({
      client: adminClient,
      vendaId: vendaIdFinal,
      companyId: scope.companyId,
      clienteId,
      vendedorId,
      userId: user.id,
      recibos,
      pagamentos
    });
    await closeQuoteIfNeeded(adminClient, orcamento_id);
    return json({ ok: true, venda_id: vendaIdFinal }, { status: isEdit ? 200 : 201 });
  } catch (err) {
    const code = err?.message;
    if (code === "RECIBO_DUPLICADO" || code === "RESERVA_DUPLICADA" || code === "RECIBO_INVALIDO") {
      return json({ error: code }, { status: 409 });
    }
    return toErrorResponse(err, "Erro ao salvar cadastro de venda.");
  }
}
export {
  POST
};
