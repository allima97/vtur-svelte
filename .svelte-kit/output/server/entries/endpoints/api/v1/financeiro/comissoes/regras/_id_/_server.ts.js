import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, t as toErrorResponse } from "../../../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["financeiro", "comissoes", "parametros"], 1, "Sem acesso.");
    }
    const { id } = event.params;
    const { data, error } = await client.from("commission_rule").select("id, nome, descricao, tipo, meta_nao_atingida, meta_atingida, super_meta, ativo, created_at, updated_at, commission_tier(id, faixa, de_pct, ate_pct, inc_pct_meta, inc_pct_comissao, ativo)").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) return json({ error: "Regra não encontrada." }, { status: 404 });
    return json({ ...data, tiers: data.commission_tier || [] });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar regra.");
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
    const { id } = event.params;
    const body = await event.request.json();
    const updateData = {};
    if ("nome" in body) updateData.nome = body.nome;
    if ("descricao" in body) updateData.descricao = body.descricao;
    if ("tipo" in body) updateData.tipo = body.tipo;
    if ("meta_nao_atingida" in body) updateData.meta_nao_atingida = Number(body.meta_nao_atingida);
    if ("meta_atingida" in body) updateData.meta_atingida = Number(body.meta_atingida);
    if ("super_meta" in body) updateData.super_meta = Number(body.super_meta);
    if ("ativo" in body) updateData.ativo = body.ativo;
    const { data, error } = await client.from("commission_rule").update(updateData).eq("id", id).select().single();
    if (error) throw error;
    if (body.tiers !== void 0) {
      await client.from("commission_tier").delete().eq("rule_id", id);
      if (Array.isArray(body.tiers) && body.tiers.length > 0) {
        await client.from("commission_tier").insert(
          body.tiers.map((t) => ({
            rule_id: id,
            faixa: t.faixa === "POS" ? "POS" : "PRE",
            de_pct: Number(t.de_pct) || 0,
            ate_pct: Number(t.ate_pct) || 100,
            inc_pct_meta: Number(t.inc_pct_meta) || 0,
            inc_pct_comissao: Number(t.inc_pct_comissao) || 0,
            ativo: true
          }))
        );
      }
    }
    return json({ success: true, data });
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
    const { id } = event.params;
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
  PUT
};
