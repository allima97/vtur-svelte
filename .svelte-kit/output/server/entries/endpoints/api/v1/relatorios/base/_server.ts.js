import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, d as resolveScopedVendedorIds, t as toErrorResponse } from "../../../../../../chunks/v1.js";
function isRankingUserType(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return normalized.includes("VENDEDOR") || normalized.includes("GESTOR") || normalized.includes("MASTER") || normalized.includes("ADMIN");
}
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["relatorios", "dashboard", "vendas"], 1, "Sem acesso aos filtros analíticos.");
    }
    const { searchParams } = event.url;
    const requestedCompanyId = String(searchParams.get("empresa_id") || "").trim();
    const scopedTeamIds = await resolveScopedVendedorIds(client, scope, null);
    const companyIdsForUsers = scope.isAdmin || scope.companyIds.length === 0 ? requestedCompanyId ? [requestedCompanyId] : [] : requestedCompanyId && scope.companyIds.includes(requestedCompanyId) ? [requestedCompanyId] : scope.companyIds;
    let companiesQuery = client.from("companies").select("id, nome_fantasia, nome_empresa, active").order("nome_fantasia", { ascending: true }).limit(500);
    if (!scope.isAdmin && scope.companyIds.length > 0) {
      companiesQuery = companiesQuery.in("id", scope.companyIds);
    }
    const [companiesRes, usersRes] = await Promise.all([
      companiesQuery,
      (async () => {
        let query = client.from("users").select(`
            id,
            nome_completo,
            email,
            company_id,
            user_types (name),
            companies (nome_fantasia, nome_empresa)
          `).limit(1e3);
        if (!scope.isAdmin && companyIdsForUsers.length > 0) {
          query = query.in("company_id", companyIdsForUsers);
        }
        if (!scope.isAdmin && scopedTeamIds.length > 0) {
          query = query.in("id", scopedTeamIds);
        }
        return query;
      })()
    ]);
    if (companiesRes.error) throw companiesRes.error;
    if (usersRes.error) throw usersRes.error;
    const empresas = (companiesRes.data || []).map((row) => ({
      id: String(row.id || ""),
      nome: String(row.nome_fantasia || row.nome_empresa || "Empresa sem nome"),
      active: row.active !== false
    }));
    const vendedores = (usersRes.data || []).filter((row) => {
      const userType = Array.isArray(row?.user_types) ? row.user_types[0] : row?.user_types;
      return isRankingUserType(userType?.name);
    }).map((row) => {
      const userType = Array.isArray(row?.user_types) ? row.user_types[0] : row?.user_types;
      const company = Array.isArray(row?.companies) ? row.companies[0] : row?.companies;
      return {
        id: String(row.id || ""),
        nome: String(row.nome_completo || row.email || "Usuário sem nome"),
        company_id: String(row.company_id || ""),
        company_name: String(company?.nome_fantasia || company?.nome_empresa || ""),
        papel: String(userType?.name || "")
      };
    }).filter((row) => row.id).sort((left, right) => left.nome.localeCompare(right.nome, "pt-BR"));
    return json({
      empresas,
      vendedores,
      statusVendas: [
        { value: "confirmada", label: "Confirmada" },
        { value: "pendente", label: "Pendente" },
        { value: "concluida", label: "Concluída" },
        { value: "cancelada", label: "Cancelada" }
      ]
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar base analítica.");
  }
}
export {
  GET
};
