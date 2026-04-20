import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, i as isUuid, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["parametros"], 1, "Sem acesso a Parâmetros.");
    }
    const { data, error: queryError } = await client.from("tipo_pacotes").select("id, nome, ativo, rule_id, fix_meta_nao_atingida, fix_meta_atingida, fix_super_meta").order("nome");
    if (queryError) throw queryError;
    const { data: regras } = await client.from("commission_rule").select("id, nome, tipo").eq("ativo", true).order("nome").limit(100);
    return json({ items: data || [], regras: regras || [] });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar tipos de pacote.");
  }
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["parametros"], 2, "Sem permissão para salvar tipos de pacote.");
    }
    const body = await event.request.json();
    const { id, nome, ativo, rule_id, fix_meta_nao_atingida, fix_meta_atingida, fix_super_meta } = body;
    const nomeTrimmed = String(nome || "").trim();
    if (!nomeTrimmed) return json({ error: "Nome obrigatório." }, { status: 400 });
    const { data: existing } = await client.from("tipo_pacotes").select("id").ilike("nome", nomeTrimmed).limit(1);
    if (existing && existing.length > 0 && existing[0].id !== id) {
      return json({ error: "Já existe um tipo de pacote com este nome." }, { status: 409 });
    }
    const toNum = (v) => v === null || v === void 0 || v === "" ? null : Number(v);
    const payload = {
      nome: nomeTrimmed,
      ativo: ativo !== false,
      rule_id: rule_id && isUuid(rule_id) ? rule_id : null,
      fix_meta_nao_atingida: toNum(fix_meta_nao_atingida),
      fix_meta_atingida: toNum(fix_meta_atingida),
      fix_super_meta: toNum(fix_super_meta)
    };
    let result;
    if (id && isUuid(id)) {
      const { data: updated, error: updateError } = await client.from("tipo_pacotes").update(payload).eq("id", id).select("id").single();
      if (updateError) throw updateError;
      result = updated;
    } else {
      const { data: inserted, error: insertError } = await client.from("tipo_pacotes").insert(payload).select("id").single();
      if (insertError) throw insertError;
      result = inserted;
    }
    return json({ ok: true, id: result?.id });
  } catch (err) {
    return toErrorResponse(err, "Erro ao salvar tipo de pacote.");
  }
}
async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["parametros"], 5, "Sem permissão para excluir tipos de pacote.");
    }
    const id = String(event.url.searchParams.get("id") || "").trim();
    if (!isUuid(id)) return json({ error: "ID inválido." }, { status: 400 });
    const { error: deleteError } = await client.from("tipo_pacotes").delete().eq("id", id);
    if (deleteError) throw deleteError;
    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao excluir tipo de pacote.");
  }
}
export {
  DELETE,
  GET,
  POST
};
