import { json } from "@sveltejs/kit";
import { e as ensureCanManageUsers, l as loadManagedUser, q as loadUserPermissions, x as loadUserTypeDefaultPermissions, w as loadManagedUserTypes, v as loadManagedCompanies, a as loadAvisoTemplates, h as getAccessibleCompanyIds, r as buildPermissionMatrix, A as extractCompanyName, z as extractUserTypeName } from "../../../../../../../chunks/admin.js";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../../chunks/v1.js";
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensureCanManageUsers(scope);
    const userId = String(event.params.id || "").trim();
    const targetUser = await loadManagedUser(client, scope, userId);
    const [permissions, defaultPermissions, userTypes, companies, templates] = await Promise.all([
      loadUserPermissions(client, userId),
      targetUser.user_type_id ? loadUserTypeDefaultPermissions(client, String(targetUser.user_type_id)) : Promise.resolve([]),
      loadManagedUserTypes(client, scope),
      loadManagedCompanies(client, scope),
      loadAvisoTemplates(client).catch(() => [])
    ]);
    return json({
      user: {
        id: targetUser.id,
        nome: targetUser.nome_completo || targetUser.email || "Usuario sem nome",
        email: targetUser.email,
        telefone: targetUser.telefone || null,
        cidade: targetUser.cidade || null,
        estado: targetUser.estado || null,
        tipo: extractUserTypeName(targetUser) || "OUTRO",
        tipo_id: targetUser.user_type_id || null,
        empresa: extractCompanyName(targetUser) || "Sem empresa",
        empresa_id: targetUser.company_id || null,
        ativo: targetUser.active !== false && targetUser.ativo !== false,
        uso_individual: Boolean(targetUser.uso_individual),
        created_by_gestor: Boolean(targetUser.created_by_gestor),
        participa_ranking: Boolean(targetUser.participa_ranking),
        created_at: targetUser.created_at || null,
        updated_at: targetUser.updated_at || null
      },
      permissions: buildPermissionMatrix(permissions),
      default_permissions: buildPermissionMatrix(defaultPermissions),
      available: {
        user_types: userTypes,
        companies,
        aviso_templates: templates,
        company_ids: getAccessibleCompanyIds(scope)
      },
      scope: {
        papel: scope.papel
      }
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar detalhe do usuario.");
  }
}
async function PATCH(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensureCanManageUsers(scope);
    const userId = String(event.params.id || "").trim();
    const targetUser = await loadManagedUser(client, scope, userId);
    const body = await event.request.json();
    const ALLOWED_USER = [
      "nome_completo",
      "telefone",
      "cidade",
      "estado",
      "active",
      "uso_individual",
      "participa_ranking",
      "user_type_id",
      "company_id",
      "cargo",
      "birth_date"
    ];
    const updatePayload = { updated_at: (/* @__PURE__ */ new Date()).toISOString() };
    for (const field of ALLOWED_USER) {
      if (body[field] !== void 0) updatePayload[field] = body[field];
    }
    if (Object.keys(updatePayload).length === 1) {
      return json({ error: "Nenhum campo para atualizar." }, { status: 400 });
    }
    const { data, error } = await client.from("users").update(updatePayload).eq("id", userId).select("id, nome_completo, email, active, uso_individual, user_type_id, company_id").maybeSingle();
    if (error) throw error;
    if (!data) return json({ error: "Usuário não encontrado." }, { status: 404 });
    if (body.user_type_id && body.user_type_id !== targetUser.user_type_id) {
      try {
        const { syncUserTypeDefaultPermissions } = await import("../../../../../../../chunks/admin.js").then((n) => n.N);
        await syncUserTypeDefaultPermissions(client, userId, String(body.user_type_id));
      } catch {
      }
    }
    return json({ ok: true, user: data });
  } catch (err) {
    return toErrorResponse(err, "Erro ao atualizar usuario.");
  }
}
export {
  GET,
  PATCH
};
