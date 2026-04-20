import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess, b as resolveScopedCompanyIds, d as resolveScopedVendedorIds, f as resolveAccessibleClientIds, t as toErrorResponse } from "../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["clientes", "vendas_consulta", "vendas"], 1, "Sem acesso a Clientes.");
    }
    const search = String(event.url.searchParams.get("search") || "").trim().toLowerCase();
    const companyIds = resolveScopedCompanyIds(scope, event.url.searchParams.get("empresa_id"));
    const vendedorIds = await resolveScopedVendedorIds(client, scope, event.url.searchParams.get("vendedor_id"));
    const accessibleClientIds = await resolveAccessibleClientIds(client, { companyIds, vendedorIds });
    let query = client.from("clientes").select("id, nome, cpf, telefone, email, whatsapp, company_id").order("nome", { ascending: true }).limit(search ? 50 : 300);
    if (accessibleClientIds.length > 0 && !scope.isAdmin) {
      query = query.in("id", accessibleClientIds);
    } else if (companyIds.length > 0) {
      query = query.in("company_id", companyIds);
    }
    if (search) {
      query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%,cpf.ilike.%${search}%,telefone.ilike.%${search}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return json({ items: data || [], total: data?.length || 0 });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar clientes.");
  }
}
export {
  GET
};
