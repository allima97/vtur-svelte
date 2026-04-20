import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, t as toErrorResponse, b as resolveScopedCompanyIds } from "../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["financeiro"], 1, "Sem acesso ao Financeiro.");
    }
    const { searchParams } = event.url;
    const ativas = searchParams.get("ativas");
    const companyIds = resolveScopedCompanyIds(scope, searchParams.get("empresa_id"));
    let query = client.from("formas_pagamento").select("*").order("nome", { ascending: true });
    if (ativas === "true") {
      query = query.eq("ativo", true);
    }
    if (companyIds.length > 0) {
      query = query.in("company_id", companyIds);
    }
    const { data, error } = await query;
    if (error) {
      if (String(error.code || "").includes("42P01") || String(error.message || "").includes("does not exist")) {
        return json({ success: true, items: [] });
      }
      throw error;
    }
    return json({ success: true, items: data || [] });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar formas de pagamento.");
  }
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensureModuloAccess(scope, ["financeiro"], 2, "Sem permissão para criar formas de pagamento.");
    const body = await event.request.json();
    if (!body.nome) {
      return json(
        { success: false, error: "Nome é obrigatório." },
        { status: 400 }
      );
    }
    const { data, error } = await client.from("formas_pagamento").insert([{
      company_id: scope.companyId,
      nome: body.nome,
      descricao: body.descricao || null,
      paga_comissao: body.paga_comissao !== false,
      permite_desconto: Boolean(body.permite_desconto),
      desconto_padrao_pct: body.desconto_padrao_pct || null,
      ativo: body.ativo !== void 0 ? body.ativo : true
    }]).select().single();
    if (error) {
      if (error.code === "23505") {
        return json(
          { success: false, error: "Já existe uma forma de pagamento com este código." },
          { status: 409 }
        );
      }
      throw error;
    }
    return json({ success: true, item: data });
  } catch (err) {
    return toErrorResponse(err, "Erro ao criar forma de pagamento.");
  }
}
async function PATCH(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensureModuloAccess(scope, ["financeiro"], 3, "Sem permissão para editar formas de pagamento.");
    const body = await event.request.json();
    if (!body.id) {
      return json(
        { success: false, error: "ID da forma de pagamento é obrigatório." },
        { status: 400 }
      );
    }
    const updateData = {
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (body.nome !== void 0) updateData.nome = body.nome;
    if (body.descricao !== void 0) updateData.descricao = body.descricao;
    if (body.paga_comissao !== void 0) updateData.paga_comissao = body.paga_comissao;
    if (body.permite_desconto !== void 0) updateData.permite_desconto = body.permite_desconto;
    if (body.desconto_padrao_pct !== void 0) updateData.desconto_padrao_pct = body.desconto_padrao_pct;
    if (body.ativo !== void 0) updateData.ativo = body.ativo;
    const { data, error } = await client.from("formas_pagamento").update(updateData).eq("id", body.id).select().single();
    if (error) throw error;
    return json({ success: true, item: data });
  } catch (err) {
    return toErrorResponse(err, "Erro ao atualizar forma de pagamento.");
  }
}
async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensureModuloAccess(scope, ["financeiro"], 4, "Sem permissão para excluir formas de pagamento.");
    const { searchParams } = event.url;
    const id = searchParams.get("id");
    if (!id) {
      return json(
        { success: false, error: "ID da forma de pagamento é obrigatório." },
        { status: 400 }
      );
    }
    const { count, error: countError } = await client.from("vendas_pagamentos").select("*", { count: "exact", head: true }).eq("forma_pagamento_id", id);
    if (countError) {
    } else if (count && count > 0) {
      const { data, error: error2 } = await client.from("formas_pagamento").update({ ativo: false, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id).select().single();
      if (error2) throw error2;
      return json({
        success: true,
        item: data,
        message: "Forma de pagamento inativada pois possui pagamentos associados."
      });
    }
    const { error } = await client.from("formas_pagamento").delete().eq("id", id);
    if (error) throw error;
    return json({ success: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao excluir forma de pagamento.");
  }
}
export {
  DELETE,
  GET,
  PATCH,
  POST
};
