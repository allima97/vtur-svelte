import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, i as isUuid, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["orcamentos", "vendas"], 2, "Sem permissao para criar orcamentos.");
    }
    const body = await event.request.json();
    if (!body.client_id || !isUuid(body.client_id)) {
      return json({ error: "Cliente valido e obrigatorio." }, { status: 400 });
    }
    if (!body.itens || !Array.isArray(body.itens) || body.itens.length === 0) {
      return json({ error: "Adicione pelo menos um item." }, { status: 400 });
    }
    const total = body.itens.reduce((acc, item) => {
      const valor = Number(item.total_amount || item.valor_total || 0);
      return acc + valor;
    }, 0);
    const { data: quote, error: quoteError } = await client.from("quote").insert({
      client_id: body.client_id,
      status: body.status || "DRAFT",
      status_negociacao: body.status_negociacao || "Enviado",
      total,
      currency: body.currency || "BRL",
      created_by: user.id,
      data_embarque: body.data_embarque || null,
      data_final: body.data_final || null,
      last_interaction_notes: body.notes || body.observacoes || null
    }).select().single();
    if (quoteError) {
      console.error("Erro ao criar quote:", quoteError);
      return json({ error: "Erro ao criar orcamento.", details: quoteError.message }, { status: 500 });
    }
    const itensParaInserir = body.itens.map((item, index) => ({
      quote_id: quote.id,
      title: item.title || item.descricao || `Item ${index + 1}`,
      product_name: item.product_name || item.produto || null,
      item_type: item.item_type || "servico",
      total_amount: Number(item.total_amount || item.valor_total || 0),
      order_index: item.order_index ?? index,
      city_name: item.city_name || item.cidade || null,
      quantity: item.quantity || item.quantidade || 1,
      unit_price: item.unit_price || item.valor_unitario || 0
    }));
    const { error: itemsError } = await client.from("quote_item").insert(itensParaInserir);
    if (itemsError) {
      await client.from("quote").delete().eq("id", quote.id);
      console.error("Erro ao criar itens do quote:", itemsError);
      return json({ error: "Erro ao salvar itens do orcamento.", details: itemsError.message }, { status: 500 });
    }
    return json(
      {
        success: true,
        data: {
          id: quote.id,
          codigo: `ORC-${quote.id.slice(0, 8).toUpperCase()}`,
          client_id: quote.client_id,
          total: quote.total,
          status: quote.status,
          created_at: quote.created_at
        }
      },
      { status: 201 }
    );
  } catch (err) {
    return toErrorResponse(err, "Erro ao criar orcamento.");
  }
}
export {
  POST
};
