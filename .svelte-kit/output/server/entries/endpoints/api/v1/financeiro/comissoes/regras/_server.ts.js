import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, i as isUuid, t as toErrorResponse } from "../../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["financeiro", "comissoes", "parametros"], 1, "Sem acesso às regras de comissão.");
    }
    const { searchParams } = event.url;
    const ativo = searchParams.get("ativo");
    const tipo = searchParams.get("tipo");
    let query = client.from("commission_rule").select("id, nome, descricao, tipo, meta_nao_atingida, meta_atingida, super_meta, ativo, created_at, updated_at, commission_tier(id, faixa, de_pct, ate_pct, inc_pct_meta, inc_pct_comissao, ativo)").order("nome", { ascending: true });
    if (ativo !== null && ativo !== "") query = query.eq("ativo", ativo === "true");
    if (tipo) query = query.eq("tipo", tipo);
    const { data, error: dbError } = await query;
    if (dbError) throw dbError;
    const items = (data || []).map((r) => ({
      ...r,
      tiers: r.commission_tier || []
    }));
    return json({ items, total: items.length });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar regras de comissão.");
  }
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["financeiro", "comissoes", "parametros"], 2, "Sem permissão para criar regras.");
    }
    const body = await event.request.json();
    const { nome, descricao, tipo = "GERAL", meta_nao_atingida = 0, meta_atingida = 0, super_meta = 0, ativo = true, tiers = [] } = body;
    if (!nome?.trim()) return json({ error: "Nome obrigatório." }, { status: 400 });
    const { data: regraData, error: regraError } = await client.from("commission_rule").insert({
      nome: nome.trim(),
      descricao: descricao?.trim() || null,
      tipo: tipo === "ESCALONAVEL" ? "ESCALONAVEL" : "GERAL",
      meta_nao_atingida: Number(meta_nao_atingida) || 0,
      meta_atingida: Number(meta_atingida) || 0,
      super_meta: Number(super_meta) || 0,
      ativo
    }).select().single();
    if (regraError) throw regraError;
    if (tipo === "ESCALONAVEL" && Array.isArray(tiers) && tiers.length > 0) {
      const tiersData = tiers.map((tier) => ({
        rule_id: regraData.id,
        faixa: tier.faixa === "POS" ? "POS" : "PRE",
        de_pct: Number(tier.de_pct) || 0,
        ate_pct: Number(tier.ate_pct) || 100,
        inc_pct_meta: Number(tier.inc_pct_meta) || 0,
        inc_pct_comissao: Number(tier.inc_pct_comissao) || 0,
        ativo: true
      }));
      await client.from("commission_tier").insert(tiersData);
    }
    return json({ success: true, data: regraData });
  } catch (err) {
    return toErrorResponse(err, "Erro ao criar regra de comissão.");
  }
}
async function PUT(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["financeiro", "comissoes", "parametros"], 3, "Sem permissão.");
    }
    const id = event.url.searchParams.get("id") || (await event.request.json().catch(() => ({}))).id;
    if (!id || !isUuid(id)) return json({ error: "ID inválido." }, { status: 400 });
    const body = await event.request.json().catch(() => ({}));
    const payload = {};
    if ("nome" in body) payload.nome = body.nome;
    if ("ativo" in body) payload.ativo = body.ativo;
    if ("meta_atingida" in body) payload.meta_atingida = body.meta_atingida;
    if ("meta_nao_atingida" in body) payload.meta_nao_atingida = body.meta_nao_atingida;
    if ("super_meta" in body) payload.super_meta = body.super_meta;
    const { error } = await client.from("commission_rule").update(payload).eq("id", id);
    if (error) throw error;
    return json({ success: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao atualizar regra.");
  }
}
async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["financeiro", "comissoes", "parametros"], 4, "Sem permissão.");
    }
    const id = event.url.searchParams.get("id");
    if (!id || !isUuid(id)) return json({ error: "ID inválido." }, { status: 400 });
    await client.from("commission_tier").delete().eq("rule_id", id);
    const { error } = await client.from("commission_rule").delete().eq("id", id);
    if (error) throw error;
    return json({ success: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao excluir regra.");
  }
}
export {
  DELETE,
  GET,
  POST,
  PUT
};
