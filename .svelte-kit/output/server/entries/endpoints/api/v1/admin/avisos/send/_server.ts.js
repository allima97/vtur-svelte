import { json } from "@sveltejs/kit";
import { l as loadManagedUser, a as loadAvisoTemplates, b as loadEmailSettings, c as buildFromEmails, d as applyTemplate } from "../../../../../../../chunks/admin.js";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../../chunks/v1.js";
function canSendAvisos(scope) {
  return scope.isAdmin || scope.isMaster || scope.isGestor || Boolean(scope.permissoes.admin_users);
}
function renderHtml(text) {
  return String(text || "").split(/\r?\n/).map((line) => `<p>${line || "&nbsp;"}</p>`).join("");
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    const body = await event.request.json().catch(() => ({}));
    if (!canSendAvisos(scope)) {
      return new Response("Sem acesso para disparar avisos.", { status: 403 });
    }
    const userId = String(body.user_id || "").trim();
    const templateId = String(body.template_id || "").trim();
    if (!userId || !templateId) {
      return new Response("Usuario e template sao obrigatorios.", { status: 400 });
    }
    const targetUser = await loadManagedUser(client, scope, userId);
    if (!targetUser.email) {
      return new Response("Usuario sem e-mail cadastrado.", { status: 400 });
    }
    const templates = await loadAvisoTemplates(client);
    const template = templates.find((item) => String(item.id) === templateId);
    if (!template) {
      return new Response("Template nao encontrado.", { status: 404 });
    }
    const settings = await loadEmailSettings(client);
    const apiKey = String(settings?.resend_api_key || "").trim();
    if (!apiKey) {
      return new Response("Resend nao configurado para disparo de avisos.", { status: 400 });
    }
    const fromEmails = buildFromEmails(settings);
    const senderKey = String(template.sender_key || "avisos").trim().toLowerCase();
    const fromEmail = senderKey === "financeiro" ? fromEmails.financeiro : senderKey === "suporte" ? fromEmails.suporte : senderKey === "admin" ? fromEmails.admin : fromEmails.avisos;
    const companyName = (() => {
      const company = Array.isArray(targetUser.companies) ? targetUser.companies[0] : targetUser.companies;
      return String(company?.nome_fantasia || company?.nome_empresa || "").trim();
    })();
    const vars = {
      nome: targetUser.nome_completo || "",
      email: targetUser.email || "",
      empresa: companyName
    };
    const subject = applyTemplate(String(template.assunto || ""), vars);
    const message = applyTemplate(String(template.mensagem || ""), vars);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [targetUser.email],
        subject,
        html: renderHtml(message),
        text: message
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return new Response(String(payload?.message || payload?.error || "Falha ao enviar aviso."), {
        status: response.status
      });
    }
    return json({
      ok: true,
      provider: "resend",
      id: payload?.id || null
    });
  } catch (err) {
    return toErrorResponse(err, "Erro ao enviar aviso.");
  }
}
export {
  POST
};
