import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, t as toErrorResponse } from "../../../../../../../chunks/v1.js";
function normalizeScope(value) {
  const scope = String(value || "").trim().toLowerCase();
  if (scope === "system" || scope === "master" || scope === "gestor" || scope === "user") return scope;
  return "system";
}
function inCompany(companyId, allowed) {
  const key = String(companyId || "").trim();
  return key ? allowed.has(key) : false;
}
function canAccessScopedRow(params) {
  const { isAdmin, userId, companyIds, rowUserId, rowCompanyId, rowScope } = params;
  if (isAdmin) return true;
  if (String(rowUserId || "") === userId) return true;
  const scope = normalizeScope(rowScope);
  if (scope === "system") return true;
  if (scope === "user") return false;
  return inCompany(rowCompanyId || null, companyIds);
}
function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function parseBodyOffset(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(-240, Math.min(240, Math.round(parsed)));
}
function extractSignatureTextConfig(signatureStyle) {
  const content = isPlainObject(signatureStyle) && isPlainObject(signatureStyle.content) ? signatureStyle.content : null;
  const hasFooterLead = !!content && Object.prototype.hasOwnProperty.call(content, "footerLead");
  const hasConsultantRole = !!content && Object.prototype.hasOwnProperty.call(content, "consultantRole");
  return {
    footerLead: String(content?.footerLead || "").trim(),
    consultantRole: String(content?.consultantRole || "").trim(),
    hasFooterLead,
    hasConsultantRole
  };
}
async function enviarEmailResend(params) {
  {
    return { ok: false, status: "resend_not_configured" };
  }
}
async function enviarEmailSendGrid(params) {
  {
    return { ok: false, status: "sendgrid_not_configured" };
  }
}
async function enviarEmailSMTP(params, smtpConfig, fromEmail) {
  if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
    return { ok: false, status: "smtp_not_configured" };
  }
  return { ok: false, status: "smtp_not_supported" };
}
const POST = async ({ locals, request, url }) => {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser({ locals });
    const userScope = await resolveUserScope(client, user.id);
    const isAdmin = Boolean(userScope.isAdmin);
    const companyIds = /* @__PURE__ */ new Set();
    if (userScope.companyId) companyIds.add(String(userScope.companyId));
    if (userScope.papel === "MASTER") {
      const { data: vinculos } = await client.from("master_empresas").select("company_id, status").eq("master_id", user.id);
      (vinculos || []).forEach((row) => {
        const status = String(row?.status || "").toLowerCase();
        const companyId = String(row?.company_id || "").trim();
        if (!companyId || status === "rejected") return;
        companyIds.add(companyId);
      });
    }
    const dataClient = client;
    const body = await request.json();
    const templateId = String(body.templateId || "").trim();
    const clienteId = String(body.clienteId || "").trim();
    const canal = body.canal || "email";
    if (!templateId || !clienteId) return json({ error: "templateId e clienteId sao obrigatorios." }, { status: 400 });
    if (canal !== "email") return json({ error: "Canal invalido para esta rota." }, { status: 400 });
    const { data: userRow } = await client.from("users").select("id, nome_completo").eq("id", user.id).maybeSingle();
    const { data: brandingRow } = await client.from("quote_print_settings").select("logo_url, logo_path, consultor_nome").eq("owner_user_id", user.id).maybeSingle();
    const assinaturaPadrao = String(
      brandingRow?.consultor_nome || userRow?.nome_completo || user.user_metadata?.name || ""
    ).trim();
    const { data: tpl, error: tplErr } = await dataClient.from("user_message_templates").select("id, user_id, company_id, scope, nome, assunto, titulo, corpo, assinatura, ativo, theme_id, title_style, body_style, signature_style").eq("id", templateId).maybeSingle();
    if (tplErr || !tpl) return json({ error: "Template nao encontrado." }, { status: 404 });
    if (!canAccessScopedRow({
      isAdmin,
      userId: user.id,
      companyIds,
      rowUserId: tpl?.user_id || null,
      rowCompanyId: tpl?.company_id || null,
      rowScope: tpl?.scope || null
    })) {
      return json({ error: "Template nao encontrado." }, { status: 404 });
    }
    if (!tpl.ativo) return json({ error: "Template inativo." }, { status: 400 });
    const nomeDestinatario = String(body.nomeDestinatario || "").trim() || "Cliente";
    const emailDestinatario = String(body.emailDestinatario || "").trim().toLowerCase();
    if (!emailDestinatario) return json({ error: "Destinatario sem e-mail." }, { status: 400 });
    const assinatura = tpl.assinatura || assinaturaPadrao;
    const assuntoPadrao = String(tpl.assunto || tpl.titulo || tpl.nome || "Aviso");
    const origin = url.origin;
    const requestedThemeId = String(body.themeId || "").trim();
    const selectedThemeId = requestedThemeId || String(tpl.theme_id || "").trim();
    const textOffsetX = parseBodyOffset(body.textOffsetX);
    const textOffsetY = parseBodyOffset(body.textOffsetY);
    const signatureTextConfig = extractSignatureTextConfig(tpl.signature_style);
    const cardParams = new URLSearchParams({
      theme_name: "",
      nome: nomeDestinatario,
      titulo: String(tpl.titulo || ""),
      corpo: String(body.mensagem || tpl.corpo || tpl.titulo || tpl.nome || ""),
      assinatura,
      style_overrides: "{}",
      v: String(Date.now())
    });
    if (selectedThemeId) cardParams.set("theme_id", selectedThemeId);
    const cardUrlPng = `${origin}/api/v1/cards/render.png?${cardParams.toString()}`;
    const cardUrlSvg = `${origin}/api/v1/cards/render.svg?${cardParams.toString()}`;
    const corpo = [
      String(body.mensagem || tpl.corpo || ""),
      assinatura,
      `Cartao PNG: ${cardUrlPng}`,
      `Cartao SVG: ${cardUrlSvg}`
    ].filter(Boolean).join("\n\n");
    const text = corpo;
    const html = `<pre>${corpo}</pre>`;
    const ALERTA_FROM_EMAIL = void 0;
    const fromEmail = ALERTA_FROM_EMAIL || "noreply@vtur.com.br";
    let sentProvider = null;
    const resendResp = await enviarEmailResend({
      to: [emailDestinatario],
      subject: String(body.subject || assuntoPadrao),
      html,
      text,
      fromEmail,
      apiKey: void 0
    });
    if (resendResp.ok) {
      sentProvider = "resend";
    } else {
      const sendgridResp = await enviarEmailSendGrid({
        to: [emailDestinatario],
        subject: String(body.subject || assuntoPadrao),
        html,
        text,
        fromEmail
      });
      if (sendgridResp.ok) {
        sentProvider = "sendgrid";
      } else {
        const smtpResp = await enviarEmailSMTP(
          { to: [emailDestinatario], subject: String(body.subject || assuntoPadrao), html, text },
          {},
          fromEmail
        );
        if (smtpResp.ok) {
          sentProvider = "smtp";
        } else {
          return json({
            status: "failed",
            message: "Falha no envio de e-mail. Verifique as configuracoes de provider.",
            providers: {
              resend: resendResp.status,
              sendgrid: sendgridResp.status,
              smtp: smtpResp.status
            }
          }, { status: 200 });
        }
      }
    }
    return json({ status: "sent", provider: sentProvider, clienteId });
  } catch (e) {
    return toErrorResponse(e, "Erro ao enviar template.");
  }
};
export {
  POST
};
