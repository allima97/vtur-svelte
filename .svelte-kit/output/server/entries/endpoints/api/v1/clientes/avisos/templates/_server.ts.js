import { json } from "@sveltejs/kit";
import { a as loadAvisoTemplates } from "../../../../../../../chunks/admin.js";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, t as toErrorResponse } from "../../../../../../../chunks/v1.js";
function inferTipo(nome) {
  const value = String(nome || "").trim().toLowerCase();
  if (value.includes("anivers")) return "aniversario";
  if (value.includes("promo")) return "promocao";
  if (value.includes("confirm")) return "confirmacao";
  if (value.includes("follow")) return "follow_up";
  return "geral";
}
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["clientes", "vendas"], 1, "Sem acesso aos avisos do cliente.");
    }
    const templates = await loadAvisoTemplates(client);
    return json({
      items: templates.filter((item) => item.ativo !== false).map((item) => ({
        id: item.id,
        nome: item.nome,
        tipo: inferTipo(item.nome),
        assunto: item.assunto || "",
        conteudo: item.mensagem || "",
        sender_key: item.sender_key || "avisos"
      }))
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar templates de aviso.");
  }
}
export {
  GET
};
