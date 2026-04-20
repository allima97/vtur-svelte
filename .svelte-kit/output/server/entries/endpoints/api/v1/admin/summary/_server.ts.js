import { json } from "@sveltejs/kit";
import { t as canManageUsers, u as canManageCompanies, j as listManagedUsers, v as loadManagedCompanies, w as loadManagedUserTypes, a as loadAvisoTemplates, b as loadEmailSettings } from "../../../../../../chunks/admin.js";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!canManageUsers(scope) && !canManageCompanies(scope)) {
      return new Response("Sem acesso ao resumo administrativo.", { status: 403 });
    }
    const [usuarios, empresas, tipos, templates, emailSettings] = await Promise.all([
      listManagedUsers(client, scope),
      loadManagedCompanies(client, scope).catch(() => []),
      loadManagedUserTypes(client, scope).catch(() => []),
      loadAvisoTemplates(client).catch(() => []),
      loadEmailSettings(client).catch(() => null)
    ]);
    let pendingMasterLinks = 0;
    try {
      let pendingQuery = client.from("master_empresas").select("id", { count: "exact", head: true }).eq("status", "pending");
      if (!scope.isAdmin) {
        const companyIds = (scope.companyIds || []).filter(Boolean);
        if (scope.companyId) companyIds.push(scope.companyId);
        const uniqueIds = Array.from(new Set(companyIds));
        if (!uniqueIds.length) {
          pendingMasterLinks = 0;
        } else {
          pendingQuery = pendingQuery.in("company_id", uniqueIds);
        }
      }
      const { count } = await pendingQuery;
      pendingMasterLinks = Number(count || 0);
    } catch {
      pendingMasterLinks = 0;
    }
    const usuariosAtivos = usuarios.filter((item) => item.active !== false).length;
    const usuariosInativos = usuarios.length - usuariosAtivos;
    const empresasAtivas = empresas.filter((item) => item.active !== false).length;
    const templatesAtivos = templates.filter((item) => item.ativo !== false).length;
    const emailConfigured = Boolean(
      emailSettings?.resend_api_key || emailSettings?.smtp_host && emailSettings?.smtp_user && emailSettings?.smtp_pass
    );
    return json({
      counts: {
        usuarios_total: usuarios.length,
        usuarios_ativos: usuariosAtivos,
        usuarios_inativos: usuariosInativos,
        empresas_total: empresas.length,
        empresas_ativas: empresasAtivas,
        tipos_total: tipos.length,
        avisos_ativos: templatesAtivos,
        vinculos_master_pendentes: pendingMasterLinks
      },
      indicators: {
        email_configurado: emailConfigured,
        escopo: scope.papel,
        scope_company_ids: scope.companyIds
      }
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar resumo administrativo.");
  }
}
export {
  GET
};
