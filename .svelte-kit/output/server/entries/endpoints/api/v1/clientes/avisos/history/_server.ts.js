import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, i as isUuid, t as toErrorResponse } from "../../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["clientes", "vendas"], 1, "Sem acesso ao historico de avisos.");
    }
    const clienteId = String(event.url.searchParams.get("cliente_id") || "").trim();
    if (!clienteId || !isUuid(clienteId)) {
      return json({ error: "Cliente invalido." }, { status: 400 });
    }
    const { data, error } = await client.from("cliente_avisos_historico").select("id, cliente_id, template_id, canal, assunto, mensagem, status, provider, provider_id, destinatario, enviado_por, created_at").eq("cliente_id", clienteId).order("created_at", { ascending: false }).limit(10);
    if (error) {
      const message = String(error.message || "").toLowerCase();
      if (message.includes("does not exist") || message.includes("schema cache")) {
        return json({ items: [], unavailable: true });
      }
      throw error;
    }
    return json({ items: data || [] });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar historico de avisos.");
  }
}
export {
  GET
};
