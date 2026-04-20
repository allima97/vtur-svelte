import { h as head, q as attr } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { S as Send } from "../../../../../chunks/send.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let saving = false;
    let sendingTest = false;
    let testEmail = "";
    let form = {
      smtp_host: "",
      smtp_port: "465",
      smtp_secure: true,
      smtp_user: "",
      smtp_pass: "",
      resend_api_key: "",
      alerta_from_email: "",
      admin_from_email: "",
      avisos_from_email: "",
      financeiro_from_email: "",
      suporte_from_email: ""
    };
    async function loadPage() {
      try {
        const response = await fetch("/api/v1/admin/email");
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        form = {
          smtp_host: payload.settings.smtp_host || "",
          smtp_port: String(payload.settings.smtp_port || "465"),
          smtp_secure: payload.settings.smtp_secure !== false,
          smtp_user: payload.settings.smtp_user || "",
          smtp_pass: payload.settings.smtp_pass || "",
          resend_api_key: payload.settings.resend_api_key || "",
          alerta_from_email: payload.settings.alerta_from_email || "",
          admin_from_email: payload.settings.admin_from_email || "",
          avisos_from_email: payload.settings.avisos_from_email || "",
          financeiro_from_email: payload.settings.financeiro_from_email || "",
          suporte_from_email: payload.settings.suporte_from_email || ""
        };
      } catch (err) {
        console.error(err);
        toast.error("Nao foi possivel carregar as configuracoes de e-mail.");
      } finally {
      }
    }
    head("mwhwgi", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>E-mail | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "E-mail",
      subtitle: "Configuracoes globais de envio para administracao, avisos, suporte e financeiro.",
      breadcrumbs: [
        { label: "Administracao", href: "/admin" },
        { label: "E-mail" }
      ],
      actions: [
        {
          label: "Atualizar",
          onClick: loadPage,
          variant: "secondary",
          icon: Refresh_cw
        }
      ]
    });
    $$renderer2.push(`<!----> <div class="space-y-6">`);
    Card($$renderer2, {
      color: "financeiro",
      title: "Envio principal",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="grid gap-4 md:grid-cols-2"><div class="md:col-span-2"><label class="mb-1 block text-sm font-medium text-slate-700" for="resend-key">Resend API key</label> <input id="resend-key"${attr("value", form.resend_api_key)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="smtp-host">SMTP host</label> <input id="smtp-host"${attr("value", form.smtp_host)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="smtp-port">SMTP port</label> <input id="smtp-port"${attr("value", form.smtp_port)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="smtp-user">SMTP user</label> <input id="smtp-user"${attr("value", form.smtp_user)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="smtp-pass">SMTP password</label> <input id="smtp-pass" type="password"${attr("value", form.smtp_pass)} class="vtur-input w-full"/></div> <label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox"${attr("checked", form.smtp_secure, true)}/> <div><p class="font-medium text-slate-900">SMTP seguro</p> <p class="text-sm text-slate-500">Ativa TLS/SSL quando houver fallback SMTP.</p></div></label></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      color: "financeiro",
      title: "Remetentes por area",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="grid gap-4 md:grid-cols-2"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="from-alerta">Alerta</label> <input id="from-alerta"${attr("value", form.alerta_from_email)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="from-admin">Admin</label> <input id="from-admin"${attr("value", form.admin_from_email)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="from-avisos">Avisos</label> <input id="from-avisos"${attr("value", form.avisos_from_email)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="from-financeiro">Financeiro</label> <input id="from-financeiro"${attr("value", form.financeiro_from_email)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="from-suporte">Suporte</label> <input id="from-suporte"${attr("value", form.suporte_from_email)} class="vtur-input w-full"/></div></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      color: "financeiro",
      title: "Validacao",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="test-email">Destino do teste</label> <input id="test-email"${attr("value", testEmail)} class="vtur-input w-full" placeholder="email@empresa.com"/></div> <div class="md:self-end">`);
        Button($$renderer3, {
          variant: "outline",
          loading: sendingTest,
          children: ($$renderer4) => {
            Send($$renderer4, { size: 16, class: "mr-2" });
            $$renderer4.push(`<!----> Enviar teste`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></div></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> <div class="flex flex-wrap gap-3">`);
    Button($$renderer2, {
      variant: "primary",
      color: "financeiro",
      loading: saving,
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->Salvar configuracoes`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div></div>`);
  });
}
export {
  _page as default
};
