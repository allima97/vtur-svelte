import { json } from "@sveltejs/kit";
import { r as requireAuthenticatedUser, g as getAdminClient } from "../../../../../chunks/v1.js";
import { r as renderEmailText, a as renderEmailHtml, d as resolveSmtpConfig, b as resolveFromEmails, c as resolveResendApiKey } from "../../../../../chunks/emailSettings.js";
const TEMPLATE_NOME = "Bem-Vindo!";
const TEMPLATE_ASSUNTO = "Bem-Vindo!";
function limparDigitos(valor) {
  return (valor || "").replace(/\D/g, "");
}
function validarCpf(valor) {
  const digitos = limparDigitos(valor);
  if (digitos.length !== 11) return false;
  if (/^(\d)\1+$/.test(digitos)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i += 1) {
    soma += Number(digitos[i]) * (10 - i);
  }
  let resto = soma % 11;
  const digito1 = resto < 2 ? 0 : 11 - resto;
  soma = 0;
  for (let i = 0; i < 10; i += 1) {
    soma += Number(digitos[i]) * (11 - i);
  }
  resto = soma % 11;
  const digito2 = resto < 2 ? 0 : 11 - resto;
  return digito1 === Number(digitos[9]) && digito2 === Number(digitos[10]);
}
function validarData(valor) {
  if (!valor) return false;
  const timestamp = Date.parse(valor);
  return !Number.isNaN(timestamp);
}
function validarCep(valor) {
  const digits = limparDigitos(valor);
  return digits.length === 8;
}
function validarTelefone(valor) {
  const digits = limparDigitos(valor);
  return digits.length >= 10;
}
function validarNumero(valor) {
  return Boolean(valor && valor.trim());
}
function perfilCompleto(perfil) {
  if (!perfil.nome_completo?.trim()) return false;
  if (!validarCpf(perfil.cpf)) return false;
  if (!validarData(perfil.data_nascimento)) return false;
  if (!validarCep(perfil.cep)) return false;
  if (!validarNumero(perfil.numero)) return false;
  if (!validarTelefone(perfil.telefone)) return false;
  if (!perfil.cidade?.trim()) return false;
  if (!perfil.estado?.trim()) return false;
  if (typeof perfil.uso_individual !== "boolean") return false;
  return true;
}
function applyTemplate(text, vars) {
  return text.replace(/{{\s*nome\s*}}/gi, vars.nome || "").replace(/{{\s*email\s*}}/gi, vars.email || "").replace(/{{\s*empresa\s*}}/gi, vars.empresa || "");
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
async function marcarEmailEnviado(userId) {
  const adminClient = getAdminClient();
  const { error } = await adminClient.from("users").update({ welcome_email_sent: true }).eq("id", userId);
  if (error) {
    console.warn("Falha ao marcar welcome_email_sent:", error.message);
  }
}
const POST = async ({ request, locals }) => {
  try {
    const user = await requireAuthenticatedUser({ locals });
    const client = locals.supabase;
    const { data: perfil, error: perfilErr } = await client.from("users").select(
      "id, nome_completo, cpf, data_nascimento, telefone, cep, numero, cidade, estado, uso_individual, email, welcome_email_sent, companies(nome_fantasia)"
    ).eq("id", user.id).maybeSingle();
    if (perfilErr) {
      return json({ error: `Falha ao carregar perfil: ${perfilErr.message}` }, { status: 500 });
    }
    if (!perfil) {
      return json({ error: "Usuário não encontrado." }, { status: 404 });
    }
    if (perfil.welcome_email_sent) {
      return new Response(null, { status: 204 });
    }
    if (!perfilCompleto(perfil)) {
      return json({ error: "Perfil incompleto." }, { status: 400 });
    }
    let recipientEmail = (perfil.email || user.email || "").trim().toLowerCase();
    if (!recipientEmail) {
      try {
        const adminClient = getAdminClient();
        const authResp = await adminClient.auth.admin.getUserById(user.id);
        recipientEmail = String(authResp.data?.user?.email || "").trim().toLowerCase();
        if (recipientEmail) {
          await client.from("users").update({ email: recipientEmail }).eq("id", user.id);
        }
      } catch (err) {
        console.warn("Falha ao recuperar email via auth admin:", err);
      }
    }
    if (!recipientEmail) {
      return json({ error: "Usuário sem e-mail cadastrado." }, { status: 400 });
    }
    let templateResp = await client.from("admin_avisos_templates").select("id, nome, assunto, mensagem, ativo, sender_key").eq("nome", TEMPLATE_NOME).limit(1).maybeSingle();
    if (!templateResp.data) {
      templateResp = await client.from("admin_avisos_templates").select("id, nome, assunto, mensagem, ativo, sender_key").eq("assunto", TEMPLATE_ASSUNTO).limit(1).maybeSingle();
    }
    if (templateResp.error) {
      return json({ error: `Falha ao carregar template: ${templateResp.error.message}` }, { status: 500 });
    }
    const template = templateResp.data;
    if (!template) {
      return json({ error: "Template Bem-Vindo! não encontrado." }, { status: 404 });
    }
    if (!template.ativo) {
      return json({ error: "Template Bem-Vindo! está inativo." }, { status: 400 });
    }
    const vars = {
      nome: perfil.nome_completo || "",
      email: recipientEmail,
      empresa: perfil.companies?.nome_fantasia || ""
    };
    const subject = applyTemplate(template.assunto, vars);
    const raw = applyTemplate(template.mensagem, vars);
    const text = renderEmailText(raw);
    const html = renderEmailHtml(raw);
    const smtpConfig = await resolveSmtpConfig();
    const fromEmails = await resolveFromEmails() || {};
    const resendApiKey = await resolveResendApiKey();
    const senderKey = String(template?.sender_key || "avisos").toLowerCase();
    const fromEmail = (senderKey === "financeiro" ? fromEmails.financeiro : senderKey === "suporte" ? fromEmails.suporte : senderKey === "admin" ? fromEmails.admin : fromEmails.avisos) || fromEmails.default || smtpConfig.from;
    const to = [recipientEmail];
    const resendResp = await enviarEmailResend({
      to,
      subject,
      html,
      text,
      fromEmail,
      apiKey: resendApiKey
    });
    if (resendResp.ok) {
      await marcarEmailEnviado(user.id);
      return json({ status: "sent", provider: "resend", id: resendResp.id }, { status: 200 });
    }
    const sendgridResp = await enviarEmailSendGrid({ to, subject, html, text, fromEmail });
    if (sendgridResp.ok) {
      await marcarEmailEnviado(user.id);
      return json({ status: "sent", provider: "sendgrid" }, { status: 200 });
    }
    return json({ error: "Nenhum provedor de e-mail configurado." }, { status: 500 });
  } catch (error) {
    return json({ error: `Erro interno: ${error?.message ?? error}` }, { status: 500 });
  }
};
export {
  POST
};
