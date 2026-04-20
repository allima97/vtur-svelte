import { error, json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, t as toErrorResponse } from "../../../../../../chunks/v1.js";
import { a as fetchProdutoById, s as sanitizeProdutoPayload } from "../../../../../../chunks/cadastros-base.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["produtos", "cadastros"], 1, "Sem acesso a Produtos.");
    }
    const id = String(event.params.id || "").trim();
    if (!id) throw error(400, "ID do produto é obrigatório.");
    const produto = await fetchProdutoById(client, id);
    if (!produto) throw error(404, "Produto não encontrado.");
    return json(produto);
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar produto.");
  }
}
async function PATCH(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["produtos", "cadastros"], 3, "Sem permissão para editar produtos.");
    }
    const id = String(event.params.id || "").trim();
    if (!id) throw error(400, "ID do produto é obrigatório.");
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
    const updatePayload = {
      ...payload,
      cidade_id: payload.todas_as_cidades ? null : payload.cidade_id
    };
    const { data, error: updateError } = await client.from("produtos").update(updatePayload).eq("id", id).select("id").maybeSingle();
    if (updateError) throw updateError;
    if (!data) throw error(404, "Produto não encontrado.");
    const produto = await fetchProdutoById(client, id);
    return json({ success: true, data: produto });
  } catch (err) {
    return toErrorResponse(err, "Erro ao atualizar produto.");
  }
}
async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["produtos", "cadastros"], 4, "Sem permissão para excluir produtos.");
    }
    const id = String(event.params.id || "").trim();
    if (!id) throw error(400, "ID do produto é obrigatório.");
    const { error: tarifasError } = await client.from("produtos_tarifas").delete().eq("produto_id", id);
    if (tarifasError) throw tarifasError;
    const { error: deleteError } = await client.from("produtos").delete().eq("id", id);
    if (deleteError) throw deleteError;
    return json({ success: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao excluir produto.");
  }
}
export {
  DELETE,
  GET,
  PATCH
};
