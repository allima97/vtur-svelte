import { g as getAdminClient } from "./v1.js";
import { p as private_env } from "./shared-server.js";
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function sanitizeUrl(raw) {
  const url = (raw || "").trim();
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("mailto:")) {
    return url;
  }
  return "";
}
function applyInlineFormatting(value) {
  let html = value;
  html = html.replace(/~~(.*?)~~/g, "<del>$1</del>");
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^*])\*(?!\s)(.+?)(?<!\s)\*(?!\*)/g, "$1<em>$2</em>");
  return html;
}
function linkify(text) {
  let html = text;
  html = html.replace(
    /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi,
    (email) => {
      const safe = sanitizeUrl(`mailto:${email}`);
      if (!safe) return email;
      return `<a href="${safe}">${email}</a>`;
    }
  );
  const urlRegex = /(?<!["'=])\b((https?:\/\/|www\.)[^\s<]+)\b/gi;
  html = html.replace(urlRegex, (raw) => {
    const trimmed = raw.replace(/[),.;:!?]+$/g, "");
    const suffix = raw.slice(trimmed.length);
    const href = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const safe = sanitizeUrl(href);
    if (!safe) return raw;
    return `<a href="${safe}" target="_blank" rel="noreferrer">${trimmed}</a>${suffix}`;
  });
  return html;
}
function renderInline(markdown) {
  let html = markdown;
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, (_m, text, url) => {
    const safe = sanitizeUrl(String(url || ""));
    if (!safe) return text;
    return `<a href="${safe}" target="_blank" rel="noreferrer">${text}</a>`;
  });
  html = applyInlineFormatting(html);
  html = linkify(html);
  return html;
}
function renderEmailHtml(markdown) {
  const escaped = escapeHtml(markdown || "");
  const normalized = escaped.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  let html = "";
  let listType = null;
  const closeList = () => {
    if (!listType) return;
    html += `</${listType}>`;
    listType = null;
  };
  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();
    const unordered = line.match(/^\s*[-*\u2022]\s+(.+)$/);
    const ordered = line.match(/^\s*(\d{1,3})[.)]\s+(.+)$/);
    if (unordered) {
      if (listType !== "ul") {
        closeList();
        html += "<ul>";
        listType = "ul";
      }
      html += `<li>${renderInline(unordered[1])}</li>`;
      return;
    }
    if (ordered) {
      if (listType !== "ol") {
        closeList();
        html += "<ol>";
        listType = "ol";
      }
      html += `<li>${renderInline(ordered[2])}</li>`;
      return;
    }
    closeList();
    if (!line.trim()) {
      html += "<br/>";
      return;
    }
    html += `${renderInline(line)}<br/>`;
  });
  closeList();
  return `<div>${html}</div>`;
}
function renderEmailText(markdown) {
  let text = String(markdown || "");
  text = text.replace(/\r\n/g, "\n");
  text = text.replace(/\[(.+?)\]\((.+?)\)/g, "$1 ($2)");
  text = text.replace(/^\s*[-*\u2022]\s+/gm, "- ");
  text = text.replace(/^\s*(\d{1,3})[.)]\s+/gm, "$1. ");
  text = text.replace(/[*_~`]/g, "");
  return text;
}
function isEmailLike(value) {
  const raw = String(value || "").trim();
  return raw.includes("@") ? raw : "";
}
function looksLikeResendSmtp(settings) {
  const host = String(settings?.smtp_host || "").trim().toLowerCase();
  const user = String(settings?.smtp_user || "").trim().toLowerCase();
  return host === "smtp.resend.com" && user === "resend";
}
async function getEmailSettings() {
  try {
    const client = getAdminClient();
    const { data, error } = await client.from("admin_email_settings").select(
      "smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, alerta_from_email, admin_from_email, avisos_from_email, financeiro_from_email, suporte_from_email, resend_api_key, imap_host, imap_port, imap_secure"
    ).eq("singleton", true).maybeSingle();
    if (error) {
      console.warn("Falha ao carregar admin_email_settings:", error.message);
      return null;
    }
    return data || null;
  } catch (err) {
    console.warn("Erro ao carregar admin_email_settings:", err);
    return null;
  }
}
async function resolveSmtpConfig() {
  const settings = await getEmailSettings();
  const host = settings?.smtp_host || private_env.SMTP_HOST;
  const portRaw = settings?.smtp_port ?? Number(private_env.SMTP_PORT || 0);
  const port = Number(portRaw || 0) || 465;
  const secure = typeof settings?.smtp_secure === "boolean" ? settings.smtp_secure : String(private_env.SMTP_SECURE ?? "true") === "true";
  const user = settings?.smtp_user || private_env.SMTP_USER;
  const pass = settings?.smtp_pass || private_env.SMTP_PASS;
  const from = settings?.alerta_from_email || private_env.ALERTA_FROM_EMAIL || user;
  return { host, port, secure, user, pass, from };
}
function buildFromEmails(settings) {
  const smtpUserEmail = isEmailLike(settings?.smtp_user) || isEmailLike(private_env.SMTP_USER);
  const defaultFrom = settings?.alerta_from_email || settings?.admin_from_email || private_env.ALERTA_FROM_EMAIL || private_env.ADMIN_FROM_EMAIL || smtpUserEmail;
  const avisos = settings?.avisos_from_email || private_env.AVISOS_FROM_EMAIL || defaultFrom;
  const financeiro = settings?.financeiro_from_email || private_env.FINANCEIRO_FROM_EMAIL || defaultFrom;
  const suporte = settings?.suporte_from_email || private_env.SUPORTE_FROM_EMAIL || defaultFrom;
  const admin = settings?.admin_from_email || private_env.ADMIN_FROM_EMAIL || defaultFrom;
  return {
    default: defaultFrom,
    avisos,
    financeiro,
    admin,
    suporte
  };
}
async function resolveFromEmails() {
  const settings = await getEmailSettings();
  return buildFromEmails(settings);
}
async function resolveResendApiKey() {
  const settings = await getEmailSettings();
  const dbKey = settings?.resend_api_key?.trim();
  const smtpCompatKey = !dbKey && looksLikeResendSmtp(settings) ? String(settings?.smtp_pass || "").trim() : "";
  return dbKey || smtpCompatKey || private_env.RESEND_API_KEY;
}
export {
  renderEmailHtml as a,
  resolveFromEmails as b,
  resolveResendApiKey as c,
  resolveSmtpConfig as d,
  renderEmailText as r
};
