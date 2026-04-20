import { json } from "@sveltejs/kit";
import { r as requireAuthenticatedUser, g as getAdminClient, i as isUuid, a as resolveUserScope } from "../../../../../../chunks/v1.js";
import { r as renderEmailText, a as renderEmailHtml, b as resolveFromEmails, c as resolveResendApiKey } from "../../../../../../chunks/emailSettings.js";
function titleCaseWithExceptions(input) {
  if (!input) return "";
  const words = input.split(/\s+/);
  const smallWords = /* @__PURE__ */ new Set(["de", "da", "do", "dos", "das", "e", "o", "a", "os", "as", "um", "uma", "uns", "umas"]);
  return words.map((word, idx) => {
    if (!word) return "";
    const isSmall = smallWords.has(word.toLowerCase());
    const isFirst = idx === 0;
    if (isFirst || !isSmall) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    return word.toLowerCase();
  }).join(" ");
}
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
function isAuthAlreadyRegisteredError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("already registered") || message.includes("already been registered") || message.includes("already exists") || message.includes("user already registered");
}
async function getUserTypeNameById(client, userTypeId) {
  const { data, error } = await client.from("user_types").select("name").eq("id", userTypeId).maybeSingle();
  if (error) throw error;
  return String(data?.name || "").toUpperCase();
}
async function isRestrictedUserType(client, userTypeId) {
  const nome = await getUserTypeNameById(client, userTypeId);
  return nome.includes("ADMIN") || nome.includes("MASTER");
}
async function masterCanAccessCompany(client, masterId, companyId) {
  const { data, error } = await client.from("master_empresas").select("id").eq("master_id", masterId).eq("company_id", companyId).neq("status", "rejected").limit(1).maybeSingle();
  if (error) throw error;
  return Boolean(data?.id);
}
async function enviarEmailResend(params) {
  const fromEmail = params.fromEmail;
  const key = params.apiKey;
  if (!key || !fromEmail) {
    return { ok: false, status: "resend_not_configured" };
  }
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: fromEmail,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text
    })
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.error("Erro Resend:", resp.status, data);
    return { ok: false, status: String(resp.status), error: data };
  }
  if (!data?.id) {
    console.error("Resposta Resend sem ID:", data);
    return { ok: false, status: "resend_invalid_response", error: data };
  }
  return { ok: true, status: String(resp.status), id: data?.id };
}
async function enviarEmailSendGrid(params) {
  return { ok: false, status: "sendgrid_not_implemented" };
}
const POST = async ({ request, locals }) => {
  try {
    const user = await requireAuthenticatedUser({ locals });
    const adminClient = getAdminClient();
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const companyId = String(body.company_id || "").trim();
    const userTypeId = String(body.user_type_id || "").trim();
    const nomeCompletoRaw = String(body.nome_completo || "").trim();
    const activeRaw = body.active;
    if (!email) return json({ error: "E-mail e obrigatorio." }, { status: 400 });
    if (!companyId) return json({ error: "Empresa e obrigatoria." }, { status: 400 });
    if (!userTypeId) return json({ error: "Cargo e obrigatorio." }, { status: 400 });
    if (!isUuid(companyId)) return json({ error: "Empresa invalida." }, { status: 400 });
    if (!isUuid(userTypeId)) return json({ error: "Cargo invalido." }, { status: 400 });
    const scope = await resolveUserScope(adminClient, user.id);
    if (!scope.isAdmin && !scope.isMaster && !scope.isGestor) {
      return json({ error: "Sem permissao para enviar convites." }, { status: 403 });
    }
    if (!scope.isAdmin) {
      if (await isRestrictedUserType(adminClient, userTypeId)) {
        return json({ error: "Tipo de usuario nao permitido." }, { status: 403 });
      }
    }
    if (scope.isMaster) {
      const podeAcessar = scope.companyId && scope.companyId === companyId || await masterCanAccessCompany(adminClient, user.id, companyId);
      if (!podeAcessar) return json({ error: "Empresa fora do seu portfolio." }, { status: 403 });
    }
    if (scope.isGestor) {
      if (!scope.companyId || scope.companyId !== companyId) {
        return json({ error: "Gestor so pode convidar usuarios da propria empresa." }, { status: 403 });
      }
      const tipoNome = await getUserTypeNameById(adminClient, userTypeId);
      if (!tipoNome.includes("VENDEDOR")) {
        return json({ error: "Gestor so pode convidar usuarios do tipo VENDEDOR." }, { status: 403 });
      }
    }
    const invitedByRole = scope.isAdmin ? "ADMIN" : scope.isMaster ? "MASTER" : "GESTOR";
    const now = /* @__PURE__ */ new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1e3).toISOString();
    const { data: existingInvite, error: existingErr } = await adminClient.from("user_convites").select("id, status").eq("company_id", companyId).ilike("invited_email", email).eq("status", "pending").limit(1).maybeSingle();
    if (existingErr) {
      if (isTableMissing(existingErr)) {
        return json(
          { error: "Tabela public.user_convites nao existe. Aplique a migration." },
          { status: 500 }
        );
      }
      throw existingErr;
    }
    let inviteId = String(existingInvite?.id || "");
    if (inviteId) {
      const { error: updateErr } = await adminClient.from("user_convites").update({
        user_type_id: userTypeId,
        invited_by: user.id,
        invited_by_role: invitedByRole,
        expires_at: expiresAt,
        cancelled_at: null
      }).eq("id", inviteId);
      if (updateErr) {
        if (isMissingColumn(updateErr, "expires_at")) {
          return json(
            { error: "Coluna public.user_convites.expires_at ausente. Aplique a migration." },
            { status: 500 }
          );
        }
        throw updateErr;
      }
    } else {
      const { data: createdInvite, error: insertErr } = await adminClient.from("user_convites").insert({
        invited_user_id: null,
        invited_email: email,
        company_id: companyId,
        user_type_id: userTypeId,
        invited_by: user.id,
        invited_by_role: invitedByRole,
        status: "pending",
        expires_at: expiresAt
      }).select("id").single();
      if (insertErr) {
        if (isMissingColumn(insertErr, "expires_at")) {
          return json(
            { error: "Coluna public.user_convites.expires_at ausente. Aplique a migration." },
            { status: 500 }
          );
        }
        throw insertErr;
      }
      inviteId = String(createdInvite?.id || "");
    }
    const origin = new URL(request.url).origin;
    const redirectTo = `${origin}/auth/convite?invite=${encodeURIComponent(inviteId)}`;
    let actionLink = "";
    let authUserId = null;
    try {
      const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.generateLink({
        type: "invite",
        email,
        options: { redirectTo }
      });
      if (inviteErr && isAuthAlreadyRegisteredError(inviteErr)) {
        const { data: magicData, error: magicErr } = await adminClient.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: { redirectTo }
        });
        if (magicErr) throw magicErr;
        actionLink = String(magicData?.properties?.action_link || "");
        authUserId = String(magicData?.user?.id || "") || null;
      } else {
        if (inviteErr) throw inviteErr;
        actionLink = String(inviteData?.properties?.action_link || "");
        authUserId = String(inviteData?.user?.id || "") || null;
      }
    } catch (err) {
      console.error("Falha ao gerar link de convite:", err);
      return json({ error: `Falha ao gerar link de convite: ${err?.message || "erro desconhecido"}` }, { status: 500 });
    }
    if (!actionLink) {
      return json({ error: "Falha ao gerar link de convite." }, { status: 500 });
    }
    if (authUserId) {
      const { data: profileRow } = await adminClient.from("users").select("id, nome_completo").eq("id", authUserId).maybeSingle();
      if (profileRow?.id) {
        await adminClient.from("user_convites").update({ invited_user_id: authUserId }).eq("id", inviteId);
        const updates = { email };
        const normalizedNome = titleCaseWithExceptions(nomeCompletoRaw);
        if (normalizedNome && !String(profileRow?.nome_completo || "").trim()) {
          updates.nome_completo = normalizedNome;
        }
        if (typeof activeRaw === "boolean") {
          updates.active = activeRaw;
        }
        if (scope.isGestor) {
          updates.created_by_gestor = true;
        }
        if (Object.keys(updates).length > 0) {
          await adminClient.from("users").update(updates).eq("id", authUserId);
        }
      }
    }
    const { data: companyRow } = await adminClient.from("companies").select("nome_fantasia").eq("id", companyId).maybeSingle();
    const companyName = String(companyRow?.nome_fantasia || "sua empresa");
    const roleName = await getUserTypeNameById(adminClient, userTypeId).catch(() => "");
    const raw = [
      `Voce recebeu um convite para acessar o vtur (${companyName}).`,
      roleName ? `Cargo: ${roleName}.` : "",
      "",
      "Clique no link abaixo para definir sua senha e concluir o acesso (expira em 1 hora):",
      actionLink,
      "",
      "Se voce nao reconhece este convite, ignore este e-mail."
    ].filter(Boolean).join("\n");
    const subject = `Convite de acesso - ${companyName}`;
    const text = renderEmailText(raw);
    const html = renderEmailHtml(raw);
    const fromEmails = await resolveFromEmails();
    const resendApiKey = await resolveResendApiKey();
    const fromEmail = fromEmails.avisos || fromEmails.default;
    const to = [email];
    const resendResp = await enviarEmailResend({
      to,
      subject,
      html,
      text,
      fromEmail,
      apiKey: resendApiKey
    });
    if (!resendResp.ok) {
      const sendgridResp = await enviarEmailSendGrid({ to, subject, html, text, fromEmail });
      if (!sendgridResp.ok) {
        return json(
          { error: "Convite criado, mas falha ao enviar e-mail (Resend/SendGrid)." },
          { status: 500 }
        );
      }
    }
    if (scope.isGestor && authUserId) {
      try {
        let gestorEquipeId = user.id;
        const { data: sharedRow, error: sharedErr } = await adminClient.from("gestor_equipe_compartilhada").select("gestor_base_id").eq("gestor_id", user.id).maybeSingle();
        if (!sharedErr && sharedRow?.gestor_base_id) {
          gestorEquipeId = String(sharedRow.gestor_base_id);
        }
        await adminClient.from("gestor_vendedor").delete().eq("gestor_id", gestorEquipeId).eq("vendedor_id", authUserId);
        await adminClient.from("gestor_vendedor").insert({ gestor_id: gestorEquipeId, vendedor_id: authUserId, ativo: true });
      } catch (relErr) {
        console.warn("Falha ao pre-atribuir vendedor na equipe:", relErr);
      }
    }
    return json({
      id: inviteId,
      expires_at: expiresAt
    });
  } catch (error) {
    return json({ error: `Erro interno: ${error?.message ?? error}` }, { status: 500 });
  }
};
export {
  POST
};
