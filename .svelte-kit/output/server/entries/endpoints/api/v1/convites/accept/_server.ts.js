import { json } from "@sveltejs/kit";
import { r as requireAuthenticatedUser, g as getAdminClient, i as isUuid } from "../../../../../../chunks/v1.js";
function isTableMissing(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  return code === "42P01" || message.includes("does not exist");
}
function isMissingColumn(error, column) {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  return code === "42703" && message.includes(column.toLowerCase());
}
const POST = async ({ request, locals }) => {
  try {
    const user = await requireAuthenticatedUser({ locals });
    const adminClient = getAdminClient();
    const body = await request.json().catch(() => ({}));
    const inviteId = String(body.invite_id || "").trim();
    if (!inviteId) return json({ error: "invite_id e obrigatorio." }, { status: 400 });
    if (!isUuid(inviteId)) return json({ error: "invite_id invalido." }, { status: 400 });
    const email = String(user.email || "").trim().toLowerCase();
    if (!email) return json({ error: "Conta sem e-mail." }, { status: 400 });
    const { data: convite, error: conviteErr } = await adminClient.from("user_convites").select(
      "id, status, invited_email, invited_user_id, company_id, user_type_id, invited_by_role, expires_at"
    ).eq("id", inviteId).limit(1).maybeSingle();
    if (conviteErr) {
      if (isTableMissing(conviteErr)) {
        return json(
          { error: "Tabela public.user_convites nao existe. Aplique a migration." },
          { status: 500 }
        );
      }
      if (isMissingColumn(conviteErr, "expires_at")) {
        return json(
          { error: "Coluna public.user_convites.expires_at ausente. Aplique a migration." },
          { status: 500 }
        );
      }
      throw conviteErr;
    }
    if (!convite?.id) return json({ error: "Convite nao encontrado." }, { status: 404 });
    const status = String(convite?.status || "").toLowerCase();
    if (status !== "pending") {
      return json({ error: "Convite nao esta pendente." }, { status: 409 });
    }
    const invitedEmail = String(convite?.invited_email || "").trim().toLowerCase();
    if (invitedEmail !== email) {
      return json({ error: "Convite nao corresponde a este e-mail." }, { status: 403 });
    }
    const expiresAtRaw = String(convite?.expires_at || "");
    if (expiresAtRaw) {
      const expiresAt = new Date(expiresAtRaw);
      if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
        await adminClient.from("user_convites").update({ status: "cancelled", cancelled_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", inviteId);
        return json({ error: "Convite expirado. Solicite um novo convite." }, { status: 410 });
      }
    }
    const alreadyBoundId = convite?.invited_user_id;
    if (alreadyBoundId && alreadyBoundId !== user.id) {
      return json({ error: "Convite ja foi associado a outro usuario." }, { status: 409 });
    }
    const companyId = String(convite?.company_id || "").trim();
    const userTypeId = String(convite?.user_type_id || "").trim();
    if (!companyId || !userTypeId) {
      return json({ error: "Convite invalido (empresa/cargo ausente)." }, { status: 400 });
    }
    const { data: perfilExistente, error: perfilErr } = await adminClient.from("users").select("id, company_id, uso_individual").eq("id", user.id).maybeSingle();
    if (perfilErr) throw perfilErr;
    const companyAtual = String(perfilExistente?.company_id || "").trim();
    const usoAtual = perfilExistente?.uso_individual;
    if (companyAtual && companyAtual !== companyId && usoAtual === false) {
      return json({ error: "Usuario ja vinculado a outra empresa." }, { status: 409 });
    }
    const createdByGestor = String(convite?.invited_by_role || "").toUpperCase() === "GESTOR";
    if (!perfilExistente?.id) {
      const { error: insertErr } = await adminClient.from("users").insert({
        id: user.id,
        email,
        uso_individual: false,
        company_id: companyId,
        user_type_id: userTypeId,
        active: true,
        created_by_gestor: createdByGestor
      });
      if (insertErr) throw insertErr;
    } else {
      const { error: updateErr } = await adminClient.from("users").update({
        email,
        uso_individual: false,
        company_id: companyId,
        user_type_id: userTypeId,
        active: true,
        created_by_gestor: createdByGestor,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", user.id);
      if (updateErr) throw updateErr;
    }
    await adminClient.from("user_convites").update({ invited_user_id: user.id }).eq("id", inviteId);
    return json({ ok: true });
  } catch (error) {
    return json({ error: `Erro interno: ${error?.message ?? error}` }, { status: 500 });
  }
};
export {
  POST
};
