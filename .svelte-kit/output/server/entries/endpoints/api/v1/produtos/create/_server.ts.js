import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, t as toErrorResponse } from "../../../../../../chunks/v1.js";
import { s as sanitizeProdutoPayload, a as fetchProdutoById } from "../../../../../../chunks/cadastros-base.js";
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["produtos", "cadastros"], 2, "Sem permissão para criar produtos.");
    }
    const body = await event.request.json();
    const payload = sanitizeProdutoPayload(body);
    if (!payload.nome) {
      return json({ error: "Nome do produto é obrigatório." }, { status: 400 });
    }
    if (!payload.destino) {
      return json({ error: "Destino é obrigatório." }, { status: 400 });
    }
    if (!payload.tipo_produto) {
      return json({ error: "Tipo de produto é obrigatório." }, { status: 400 });
    }
    if (!payload.todas_as_cidades && !payload.cidade_id) {
      return json({ error: "Cidade é obrigatória para produtos não globais." }, { status: 400 });
    }
    const insertPayload = {
      ...payload,
      cidade_id: payload.todas_as_cidades ? null : payload.cidade_id
    };
    const { data, error: insertError } = await client.from("produtos").insert([insertPayload]).select("id").single();
    if (insertError) throw insertError;
    const produto = await fetchProdutoById(client, data.id);
    return json({ success: true, data: produto }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err, "Erro ao criar produto.");
  }
}
export {
  POST
};
