import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, i as isUuid, t as toErrorResponse } from "../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["cadastros"], 1, "Sem acesso a Cidades.");
    }
    const { searchParams } = event.url;
    const q = String(searchParams.get("q") || "").trim();
    const subdivisaoId = String(searchParams.get("subdivisao_id") || "").trim();
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(100, Number(searchParams.get("pageSize") || 50));
    let query = client.from("cidades").select(`
        id, nome, subdivisao_id, descricao, created_at,
        subdivisao:subdivisoes!subdivisao_id(id, nome, pais_id, pais:paises!pais_id(id, nome))
      `).order("nome").limit(5e3);
    if (subdivisaoId) query = query.eq("subdivisao_id", subdivisaoId);
    const { data, error: queryError } = await query;
    if (queryError) throw queryError;
    let items = data || [];
    if (q) {
      const qLower = q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      items = items.filter(
        (item) => String(item.nome || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(qLower)
      );
    }
    const total = items.length;
    const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);
    return json({ items: paginatedItems, total, page, pageSize });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar cidades.");
  }
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["cadastros"], 2, "Sem permissão para salvar cidades.");
    }
    const body = await event.request.json();
    const { id, nome, subdivisao_id, descricao } = body;
    if (!String(nome || "").trim()) return json({ error: "Nome obrigatório." }, { status: 400 });
    if (!subdivisao_id || !isUuid(subdivisao_id)) return json({ error: "Estado/Subdivisão obrigatório." }, { status: 400 });
    const payload = {
      nome: String(nome).trim(),
      subdivisao_id,
      descricao: String(descricao || "").trim() || null
    };
    let result;
    if (id && isUuid(id)) {
      const { data, error: updateError } = await client.from("cidades").update(payload).eq("id", id).select("id").single();
      if (updateError) throw updateError;
      result = data;
    } else {
      const { data, error: insertError } = await client.from("cidades").insert(payload).select("id").single();
      if (insertError) throw insertError;
      result = data;
    }
    return json({ ok: true, id: result?.id });
  } catch (err) {
    return toErrorResponse(err, "Erro ao salvar cidade.");
  }
}
async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["cadastros"], 4, "Sem permissão para excluir cidades.");
    }
    const id = String(event.url.searchParams.get("id") || "").trim();
    if (!isUuid(id)) return json({ error: "ID inválido." }, { status: 400 });
    const { error: deleteError } = await client.from("cidades").delete().eq("id", id);
    if (deleteError) throw deleteError;
    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao excluir cidade.");
  }
}
export {
  DELETE,
  GET,
  POST
};
