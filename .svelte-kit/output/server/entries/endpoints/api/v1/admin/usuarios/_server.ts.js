import { json } from "@sveltejs/kit";
import { e as ensureCanManageUsers, j as listManagedUsers, z as extractUserTypeName, A as extractCompanyName, h as getAccessibleCompanyIds, B as ensureAssignableUserType, C as ensureAssignableCompany, D as createOrReuseAuthUser, E as syncUserTypeDefaultPermissions, l as loadManagedUser } from "../../../../../../chunks/admin.js";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../chunks/v1.js";
function matchesSearch(haystack, query) {
  return haystack.toLowerCase().includes(query.toLowerCase());
}
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    ensureCanManageUsers(scope);
    const search = String(event.url.searchParams.get("q") || "").trim();
    const tipo = String(event.url.searchParams.get("tipo") || "").trim().toUpperCase();
    const companyId = String(event.url.searchParams.get("company_id") || event.url.searchParams.get("empresa_id") || "").trim();
    const status = String(event.url.searchParams.get("status") || event.url.searchParams.get("ativo") || "").trim().toLowerCase();
    const usoIndividual = String(event.url.searchParams.get("uso_individual") || "").trim().toLowerCase();
    let rows = await listManagedUsers(client, scope);
    if (search) {
      rows = rows.filter(
        (row) => matchesSearch(
          [
            row.nome_completo || "",
            row.email || "",
            extractUserTypeName(row),
            extractCompanyName(row)
          ].join(" "),
          search
        )
      );
    }
    if (tipo) {
      rows = rows.filter((row) => extractUserTypeName(row) === tipo);
    }
    if (companyId) {
      rows = rows.filter((row) => String(row.company_id || "") === companyId);
    }
    if (status) {
      const desired = status === "ativo" || status === "true";
      rows = rows.filter((row) => (row.active !== false && row.ativo !== false) === desired);
    }
    if (usoIndividual) {
      const desired = usoIndividual === "true" || usoIndividual === "sim";
      rows = rows.filter((row) => Boolean(row.uso_individual) === desired);
    }
    return json({
      items: rows.map((row) => ({
        id: row.id,
        nome: row.nome_completo || row.email || "Usuario sem nome",
        email: row.email,
        telefone: row.telefone || null,
        cidade: row.cidade || null,
        estado: row.estado || null,
        tipo: extractUserTypeName(row) || "OUTRO",
        tipo_id: row.user_type_id || null,
        empresa: extractCompanyName(row) || "Sem empresa",
        empresa_id: row.company_id || null,
        ativo: row.active !== false && row.ativo !== false,
        uso_individual: Boolean(row.uso_individual),
        created_by_gestor: Boolean(row.created_by_gestor),
        participa_ranking: Boolean(row.participa_ranking),
        created_at: row.created_at || null,
        updated_at: row.updated_at || null
      })),
      scope: {
        papel: scope.papel,
        company_ids: getAccessibleCompanyIds(scope)
      }
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao carregar usuarios.");
  }
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json().catch(() => ({}));
    ensureCanManageUsers(scope);
    const requestedId = String(body.id || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();
    const nomeCompleto = String(body.nome_completo || "").trim() || null;
    const userTypeId = String(body.user_type_id || "").trim() || null;
    const companyId = String(body.company_id || "").trim() || null;
    const usoIndividual = Boolean(body.uso_individual);
    const active = body.active !== false;
    const participaRanking = Boolean(body.participa_ranking);
    let userTypeName = "";
    if (userTypeId) {
      const { data: userTypeRow, error: typeError } = await client.from("user_types").select("id, name").eq("id", userTypeId).maybeSingle();
      if (typeError || !userTypeRow) {
        return new Response("Tipo de usuario invalido.", { status: 400 });
      }
      userTypeName = String(userTypeRow.name || "").trim().toUpperCase();
      ensureAssignableUserType(scope, userTypeName);
    }
    if (!requestedId) {
      if (!email) {
        return new Response("E-mail obrigatorio para criar usuario.", { status: 400 });
      }
      if (!password || password.length < 6) {
        return new Response("Senha obrigatoria com pelo menos 6 caracteres.", { status: 400 });
      }
      if (!userTypeId) {
        return new Response("Tipo de usuario obrigatorio.", { status: 400 });
      }
      if (!usoIndividual) {
        ensureAssignableCompany(scope, companyId);
      }
      if (!scope.isAdmin && usoIndividual) {
        return new Response("Somente ADMIN pode criar usuario individual sem empresa.", { status: 403 });
      }
      const authResult = await createOrReuseAuthUser(client, { email, password });
      const userId = authResult.userId;
      const payload = {
        id: userId,
        email,
        nome_completo: nomeCompleto,
        user_type_id: userTypeId,
        company_id: usoIndividual ? null : companyId,
        uso_individual: usoIndividual,
        created_by_gestor: scope.isGestor,
        participa_ranking: participaRanking,
        active
      };
      const { error: upsertError } = await client.from("users").upsert(payload);
      if (upsertError) throw upsertError;
      await syncUserTypeDefaultPermissions(client, userId, userTypeId);
      return json({
        id: userId,
        created: authResult.created,
        reused_auth_user: !authResult.created
      });
    }
    const currentUser = await loadManagedUser(client, scope, requestedId);
    if (requestedId !== scope.userId) {
      ensureAssignableCompany(scope, usoIndividual ? null : companyId || currentUser.company_id || null);
    }
    const updatePayload = {};
    if ("nome_completo" in body) updatePayload.nome_completo = nomeCompleto;
    if ("user_type_id" in body) updatePayload.user_type_id = userTypeId;
    if ("company_id" in body) updatePayload.company_id = usoIndividual ? null : companyId;
    if ("uso_individual" in body) updatePayload.uso_individual = usoIndividual;
    if ("participa_ranking" in body) updatePayload.participa_ranking = participaRanking;
    if ("active" in body) {
      updatePayload.active = active;
    }
    if ("email" in body && email) updatePayload.email = email;
    if (Object.keys(updatePayload).length === 0) {
      return new Response("Nenhuma alteracao informada.", { status: 400 });
    }
    const { error: updateError } = await client.from("users").update(updatePayload).eq("id", requestedId);
    if (updateError) throw updateError;
    if (userTypeId) {
      await syncUserTypeDefaultPermissions(client, requestedId, userTypeId);
    }
    return json({ id: requestedId, updated: true });
  } catch (err) {
    return toErrorResponse(err, "Erro ao salvar usuario.");
  }
}
export {
  GET,
  POST
};
