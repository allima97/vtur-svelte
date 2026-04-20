import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, i as isUuid, t as toErrorResponse } from "../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["cadastros"], 1, "Sem acesso a Países.");
    }
    const { searchParams } = event.url;
    const q = String(searchParams.get("q") || "").trim();
    const { data, error: queryError } = await client.from("paises").select("id, nome, codigo_iso, continente, created_at").order("nome").limit(300);
    if (queryError) throw queryError;
    let items = data || [];
    if (q) {
      const qLower = q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      items = items.filter(
        (item) => String(item.nome || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(qLower) || String(item.codigo_iso || "").toLowerCase().includes(qLower)
      );
    }
    return json({ items });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar países.");
  }
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["cadastros"], 2, "Sem permissão para salvar países.");
    }
    const body = await event.request.json();
    const { id, nome, codigo_iso, continente } = body;
    if (!String(nome || "").trim()) return json({ error: "Nome obrigatório." }, { status: 400 });
    const payload = {
      nome: String(nome).trim(),
      codigo_iso: String(codigo_iso || "").trim().toUpperCase() || null,
      continente: String(continente || "").trim() || null
    };
    let result;
    if (id && isUuid(id)) {
      const { data, error: updateError } = await client.from("paises").update(payload).eq("id", id).select("id").single();
      if (updateError) throw updateError;
      result = data;
    } else {
      const { data, error: insertError } = await client.from("paises").insert(payload).select("id").single();
      if (insertError) throw insertError;
      result = data;
    }
    return json({ ok: true, id: result?.id });
  } catch (err) {
    return toErrorResponse(err, "Erro ao salvar país.");
  }
}
async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["cadastros"], 4, "Sem permissão para excluir países.");
    }
    const id = String(event.url.searchParams.get("id") || "").trim();
    if (!isUuid(id)) return json({ error: "ID inválido." }, { status: 400 });
    const { error: deleteError } = await client.from("paises").delete().eq("id", id);
    if (deleteError) throw deleteError;
    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao excluir país.");
  }
}
export {
  DELETE,
  GET,
  POST
};
