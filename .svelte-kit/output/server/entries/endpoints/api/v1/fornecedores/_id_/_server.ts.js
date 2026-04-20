import { error, json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, t as toErrorResponse, b as resolveScopedCompanyIds } from "../../../../../../chunks/v1.js";
import { a as fetchFornecedorById, s as sanitizeFornecedorPayload } from "../../../../../../chunks/fornecedores.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["cadastros", "fornecedores"], 1, "Sem acesso a Fornecedores.");
    }
    const id = String(event.params.id || "").trim();
    if (!id) throw error(400, "ID do fornecedor é obrigatório.");
    const fornecedor = await fetchFornecedorById(client, id);
    if (!fornecedor) throw error(404, "Fornecedor não encontrado.");
    const allowedCompanyIds = resolveScopedCompanyIds(scope, fornecedor.company_id || null);
    if (!scope.isAdmin && allowedCompanyIds.length > 0 && fornecedor.company_id && !allowedCompanyIds.includes(fornecedor.company_id)) {
      throw error(403, "Sem acesso a este fornecedor.");
    }
    return json({ data: fornecedor });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar fornecedor.");
  }
}
async function PUT(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["cadastros", "fornecedores"], 3, "Sem permissão para editar fornecedores.");
    }
    const id = String(event.params.id || "").trim();
    if (!id) throw error(400, "ID do fornecedor é obrigatório.");
    const existing = await fetchFornecedorById(client, id);
    if (!existing) throw error(404, "Fornecedor não encontrado.");
    const allowedCompanyIds = resolveScopedCompanyIds(scope, existing.company_id || null);
    if (!scope.isAdmin && allowedCompanyIds.length > 0 && existing.company_id && !allowedCompanyIds.includes(existing.company_id)) {
      throw error(403, "Sem acesso a este fornecedor.");
    }
    const body = await event.request.json();
    const payload = sanitizeFornecedorPayload(body, scope);
    if (!payload.nome_completo) {
      return json({ error: "Nome completo é obrigatório." }, { status: 400 });
    }
    if (!payload.nome_fantasia) {
      return json({ error: "Nome fantasia é obrigatório." }, { status: 400 });
    }
    if (!payload.cidade) {
      return json({ error: "Cidade é obrigatória." }, { status: 400 });
    }
    if (!payload.estado) {
      return json({ error: "Estado é obrigatório." }, { status: 400 });
    }
    if (!payload.telefone) {
      return json({ error: "Telefone é obrigatório." }, { status: 400 });
    }
    if (!payload.whatsapp) {
      return json({ error: "WhatsApp é obrigatório." }, { status: 400 });
    }
    if (!payload.telefone_emergencia) {
      return json({ error: "Telefone de emergência é obrigatório." }, { status: 400 });
    }
    if (!payload.responsavel) {
      return json({ error: "Responsável é obrigatório." }, { status: 400 });
    }
    if (!payload.principais_servicos) {
      return json({ error: "Principais serviços são obrigatórios." }, { status: 400 });
    }
    if (payload.localizacao === "brasil" && !payload.cnpj) {
      return json({ error: "CNPJ é obrigatório para fornecedores no Brasil." }, { status: 400 });
    }
    if (payload.localizacao === "brasil" && !payload.cep) {
      return json({ error: "CEP é obrigatório para fornecedores no Brasil." }, { status: 400 });
    }
    const { data, error: updateError } = await client.from("fornecedores").update({ ...payload, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id).select("id").maybeSingle();
    if (updateError) throw updateError;
    if (!data) throw error(404, "Fornecedor não encontrado.");
    const fornecedor = await fetchFornecedorById(client, id);
    return json({ success: true, data: fornecedor });
  } catch (err) {
    return toErrorResponse(err, "Erro ao atualizar fornecedor.");
  }
}
async function DELETE(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["cadastros", "fornecedores"], 5, "Sem permissão para excluir fornecedores.");
    }
    const id = String(event.params.id || "").trim();
    if (!id) throw error(400, "ID do fornecedor é obrigatório.");
    const fornecedor = await fetchFornecedorById(client, id);
    if (!fornecedor) throw error(404, "Fornecedor não encontrado.");
    const { count, error: countError } = await client.from("produtos").select("id", { count: "exact", head: true }).eq("fornecedor_id", id);
    if (countError) throw countError;
    if ((count || 0) > 0) {
      return json({ error: "Não é possível excluir fornecedor com produtos vinculados." }, { status: 409 });
    }
    const { error: deleteError } = await client.from("fornecedores").delete().eq("id", id);
    if (deleteError) throw deleteError;
    return json({ success: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao excluir fornecedor.");
  }
}
export {
  DELETE,
  GET,
  PUT
};
