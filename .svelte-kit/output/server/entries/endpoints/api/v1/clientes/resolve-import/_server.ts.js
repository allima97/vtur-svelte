import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, b as resolveScopedCompanyIds, t as toErrorResponse } from "../../../../../../chunks/v1.js";
function normalizeCpf(value) {
  return String(value || "").replace(/\D/g, "");
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json().catch(() => ({}));
    const cpf = normalizeCpf(body.cpf);
    const nome = String(body.nome || "").trim() || null;
    const nascimento = String(body.nascimento || "").trim() || null;
    const endereco = String(body.endereco || "").trim() || null;
    const numero = String(body.numero || "").trim() || null;
    const cidade = String(body.cidade || "").trim() || null;
    const estado = String(body.estado || "").trim() || null;
    const cep = String(body.cep || "").trim() || null;
    const rg = String(body.rg || "").trim() || null;
    if (!cpf || cpf.length !== 11) {
      return new Response("CPF inválido.", { status: 400 });
    }
    const formattedCpf = `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`;
    const allowedCompanyIds = resolveScopedCompanyIds(scope, null);
    let existingQuery = client.from("clientes").select(
      "id, cpf, nome, nascimento, endereco, numero, cidade, estado, cep, rg, telefone, whatsapp, email"
    ).in("cpf", [cpf, formattedCpf]).limit(1);
    if (!scope.isAdmin && allowedCompanyIds.length > 0) {
      existingQuery = existingQuery.in("company_id", allowedCompanyIds);
    }
    const { data: existing } = await existingQuery.maybeSingle();
    if (existing) {
      return json({ cliente: existing, created: false });
    }
    const companyId = scope.isAdmin ? String(body?.company_id || "").trim() || null : allowedCompanyIds[0] ?? null;
    if (!scope.isAdmin && !companyId) {
      return json({ error: "Empresa não identificada." }, { status: 400 });
    }
    const { data: created, error: insertError } = await client.from("clientes").insert({
      cpf: formattedCpf,
      nome: nome || "Cliente sem nome",
      nascimento: nascimento || null,
      endereco: endereco || null,
      numero: numero || null,
      cidade: cidade || null,
      estado: estado || null,
      cep: cep || null,
      rg: rg || null,
      company_id: companyId,
      created_by: user.id,
      ativo: true
    }).select(
      "id, cpf, nome, nascimento, endereco, numero, cidade, estado, cep, rg, telefone, whatsapp, email"
    ).single();
    if (insertError) throw insertError;
    return json({ cliente: created, created: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao resolver cliente.");
  }
}
export {
  POST
};
