import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["parametros", "admin"], 1, "Sem acesso a Parâmetros da Empresa.");
    }
    const companyId = scope.companyId;
    if (!companyId) return json({ error: "Usuário não vinculado a uma empresa." }, { status: 400 });
    let { data, error: queryError } = await client.from("companies").select("id, nome_empresa, nome_fantasia, cnpj, telefone, endereco, cidade, estado, active").eq("id", companyId).maybeSingle();
    if (queryError) throw queryError;
    if (!data) return json({ error: "Empresa não encontrada." }, { status: 404 });
    return json(data);
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar dados da empresa.");
  }
}
async function PATCH(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["parametros", "admin"], 3, "Sem permissão para editar dados da empresa.");
    }
    const companyId = scope.companyId;
    if (!companyId) return json({ error: "Usuário não vinculado a uma empresa." }, { status: 400 });
    const body = await event.request.json();
    const allowed = ["nome_empresa", "nome_fantasia", "cnpj", "telefone", "endereco", "cidade", "estado"];
    const payload = {};
    for (const key of allowed) {
      if (key in body) {
        payload[key] = body[key] === "" ? null : body[key];
      }
    }
    if (Object.keys(payload).length === 0) {
      return json({ error: "Nenhum campo para atualizar." }, { status: 400 });
    }
    const { error: updateError } = await client.from("companies").update(payload).eq("id", companyId);
    if (updateError) throw updateError;
    return json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao salvar dados da empresa.");
  }
}
export {
  GET,
  PATCH
};
