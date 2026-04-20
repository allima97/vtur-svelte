import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../../chunks/v1.js";
import { e as ensureClienteAccess } from "../../../../../../../chunks/clientes.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const clienteId = String(event.params.id || "").trim();
    await ensureClienteAccess(client, scope, clienteId, null, null, 1);
    const { data, error } = await client.from("cliente_acompanhantes").select("id, cliente_id, company_id, nome_completo, cpf, telefone, grau_parentesco, rg, data_nascimento, observacoes, ativo, created_at, updated_at").eq("cliente_id", clienteId).order("nome_completo", { ascending: true });
    if (error) throw error;
    return json({
      items: data || []
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar acompanhantes.");
  }
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const clienteId = String(event.params.id || "").trim();
    await ensureClienteAccess(client, scope, clienteId, null, null, 2);
    const body = await event.request.json();
    const nomeCompleto = String(body?.nome_completo || "").trim();
    if (!nomeCompleto) {
      return json({ error: "Informe o nome completo do acompanhante." }, { status: 400 });
    }
    const { data: clienteRow, error: clienteError } = await client.from("clientes").select("id, company_id").eq("id", clienteId).maybeSingle();
    if (clienteError) throw clienteError;
    const { data, error } = await client.from("cliente_acompanhantes").insert({
      cliente_id: clienteId,
      company_id: clienteRow?.company_id || scope.companyId || scope.companyIds[0] || null,
      nome_completo: nomeCompleto,
      cpf: String(body?.cpf || "").replace(/\D/g, "") || null,
      telefone: String(body?.telefone || "").trim() || null,
      grau_parentesco: String(body?.grau_parentesco || "").trim() || null,
      rg: String(body?.rg || "").trim() || null,
      data_nascimento: String(body?.data_nascimento || "").trim() || null,
      observacoes: String(body?.observacoes || "").trim() || null,
      ativo: body?.ativo !== false,
      created_by: user.id
    }).select("id, cliente_id, company_id, nome_completo, cpf, telefone, grau_parentesco, rg, data_nascimento, observacoes, ativo, created_at, updated_at").single();
    if (error) throw error;
    return json({
      item: data,
      message: "Acompanhante cadastrado com sucesso."
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao salvar acompanhante.");
  }
}
export {
  GET,
  POST
};
