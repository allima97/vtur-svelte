import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse, i as isUuid } from "../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    let query = client.from("consultorias_online").select(`
        id,
        cliente_id,
        cliente_nome,
        data_hora,
        lembrete,
        destino,
        quantidade_pessoas,
        orcamento_id,
        taxa_consultoria,
        notas,
        fechada,
        fechada_em,
        created_by,
        created_at,
        updated_at
      `).order("data_hora", { ascending: true }).limit(200);
    const status = event.url.searchParams.get("status");
    if (status === "fechada") query = query.eq("fechada", true);
    else if (status === "aberta") query = query.eq("fechada", false);
    if (!scope.isAdmin && !scope.isGestor && !scope.isMaster) {
      query = query.eq("created_by", user.id);
    }
    const { data, error } = await query;
    if (error) throw error;
    return json(data || []);
  } catch (err) {
    return toErrorResponse(err, "Erro ao listar consultorias.");
  }
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    await resolveUserScope(client, user.id);
    const body = await event.request.json().catch(() => ({}));
    const clienteNome = String(body.cliente_nome || body.clienteNome || "").trim();
    const dataHora = body.data_hora || body.dataHora;
    if (!clienteNome) {
      return json({ error: "cliente_nome é obrigatório." }, { status: 400 });
    }
    if (!dataHora) {
      return json({ error: "data_hora é obrigatória." }, { status: 400 });
    }
    const payload = {
      cliente_id: isUuid(body.cliente_id || body.clienteId) ? body.cliente_id || body.clienteId : null,
      cliente_nome: clienteNome,
      data_hora: new Date(dataHora).toISOString(),
      lembrete: String(body.lembrete || "15min").trim(),
      destino: String(body.destino || "").trim() || null,
      quantidade_pessoas: Math.max(1, Number(body.quantidade_pessoas ?? body.quantidadePessoas ?? 1) || 1),
      orcamento_id: isUuid(body.orcamento_id || body.orcamentoId) ? body.orcamento_id || body.orcamentoId : null,
      taxa_consultoria: Number.isFinite(Number(body.taxa_consultoria ?? body.taxaConsultoria ?? 0)) ? Number(body.taxa_consultoria ?? body.taxaConsultoria ?? 0) : 0,
      notas: String(body.notas || "").trim() || null,
      created_by: user.id
    };
    const { data, error } = await client.from("consultorias_online").insert(payload).select(`
        id, cliente_id, cliente_nome, data_hora, lembrete, destino,
        quantidade_pessoas, orcamento_id, taxa_consultoria, notas,
        fechada, created_at
      `).single();
    if (error) throw error;
    return json(data, { status: 201 });
  } catch (err) {
    return toErrorResponse(err, "Erro ao criar consultoria.");
  }
}
async function PATCH(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json().catch(() => ({}));
    const id = String(body.id || "").trim();
    if (!isUuid(id)) {
      return json({ error: "id da consultoria inválido." }, { status: 400 });
    }
    const { data: existing, error: checkErr } = await client.from("consultorias_online").select("id, created_by").eq("id", id).maybeSingle();
    if (checkErr) throw checkErr;
    if (!existing) return json({ error: "Consultoria não encontrada." }, { status: 404 });
    const podeEditar = scope.isAdmin || scope.isGestor || scope.isMaster || existing.created_by === user.id;
    if (!podeEditar) {
      return json({ error: "Sem permissão para editar esta consultoria." }, { status: 403 });
    }
    const payload = { updated_at: (/* @__PURE__ */ new Date()).toISOString() };
    if (body.cliente_id !== void 0 || body.clienteId !== void 0) {
      const val = body.cliente_id ?? body.clienteId;
      payload.cliente_id = isUuid(val) ? val : null;
    }
    if (body.cliente_nome !== void 0 || body.clienteNome !== void 0)
      payload.cliente_nome = String(body.cliente_nome ?? body.clienteNome ?? "").trim() || null;
    if (body.data_hora !== void 0 || body.dataHora !== void 0) {
      const raw = body.data_hora ?? body.dataHora;
      if (raw) payload.data_hora = new Date(raw).toISOString();
    }
    if (body.lembrete !== void 0) payload.lembrete = body.lembrete;
    if (body.destino !== void 0) payload.destino = String(body.destino || "").trim() || null;
    if (body.quantidade_pessoas !== void 0 || body.quantidadePessoas !== void 0)
      payload.quantidade_pessoas = Number(body.quantidade_pessoas ?? body.quantidadePessoas ?? 1) || 1;
    if (body.orcamento_id !== void 0 || body.orcamentoId !== void 0) {
      const val = body.orcamento_id ?? body.orcamentoId;
      payload.orcamento_id = isUuid(val) ? val : null;
    }
    if (body.taxa_consultoria !== void 0 || body.taxaConsultoria !== void 0)
      payload.taxa_consultoria = Number(body.taxa_consultoria ?? body.taxaConsultoria ?? 0) || 0;
    if (body.notas !== void 0) payload.notas = String(body.notas || "").trim() || null;
    if (body.fechada !== void 0) payload.fechada = Boolean(body.fechada);
    if (body.fechada_em !== void 0) payload.fechada_em = body.fechada_em || null;
    if (Object.keys(payload).length === 1) {
      return json({ error: "Nenhum campo para atualizar." }, { status: 400 });
    }
    const { error } = await client.from("consultorias_online").update(payload).eq("id", id);
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (err) {
    return toErrorResponse(err, "Erro ao atualizar consultoria.");
  }
}
export {
  GET,
  PATCH,
  POST
};
