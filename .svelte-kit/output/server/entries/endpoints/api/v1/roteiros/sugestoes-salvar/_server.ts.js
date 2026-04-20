import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json().catch(() => null);
    if (!body || !body.tipo || !body.valor) {
      return new Response("Dados invalidos.", { status: 400 });
    }
    const tipo = String(body.tipo).trim();
    const valor = String(body.valor).trim();
    if (!tipo || !valor) return new Response("Dados invalidos.", { status: 400 });
    const companyId = scope.companyId;
    const { data: existing } = await client.from("roteiro_sugestoes").select("id, uso_count").eq("company_id", companyId).eq("tipo", tipo).ilike("valor", valor).maybeSingle();
    if (existing) {
      await client.from("roteiro_sugestoes").update({
        uso_count: (existing.uso_count || 1) + 1,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", existing.id);
      return json({ ok: true, novo: false });
    }
    const { error } = await client.from("roteiro_sugestoes").insert({
      company_id: companyId,
      tipo,
      valor,
      uso_count: 1
    });
    if (error) throw error;
    return json({ ok: true, novo: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao salvar sugestao.");
  }
}
export {
  POST
};
