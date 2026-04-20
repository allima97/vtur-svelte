import { h as head, t as ensure_array_like, e as escape_html, v as stringify, q as attr } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import "../../../../../chunks/ui.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { E as External_link } from "../../../../../chunks/external-link.js";
import { T as Triangle_alert } from "../../../../../chunks/triangle-alert.js";
import { S as Save } from "../../../../../chunks/save.js";
import { h as html } from "../../../../../chunks/html.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let saving = false;
    let testando = false;
    const integracoes = [
      {
        id: "supabase",
        nome: "Supabase",
        descricao: "Banco de dados e autenticação",
        icone: "🔷",
        status: "conectado",
        campos: [
          { nome: "URL", valor: "https://xyz.supabase.co", tipo: "text" },
          { nome: "API Key", valor: "••••••••••••••••", tipo: "password" }
        ]
      },
      {
        id: "stripe",
        nome: "Stripe",
        descricao: "Gateway de pagamento",
        icone: "💳",
        status: "conectado",
        campos: [
          {
            nome: "Publishable Key",
            valor: "pk_live_••••••••••••••••",
            tipo: "text"
          },
          {
            nome: "Secret Key",
            valor: "••••••••••••••••",
            tipo: "password"
          },
          {
            nome: "Webhook Secret",
            valor: "••••••••••••••••",
            tipo: "password"
          }
        ]
      },
      {
        id: "whatsapp",
        nome: "WhatsApp Business API",
        descricao: "Envio de mensagens automatizadas",
        icone: "💬",
        status: "desconectado",
        campos: [
          { nome: "Phone Number ID", valor: "", tipo: "text" },
          { nome: "Access Token", valor: "", tipo: "password" },
          {
            nome: "Webhook URL",
            valor: "https://api.vtur.com/webhooks/whatsapp",
            tipo: "text",
            readonly: true
          }
        ]
      },
      {
        id: "sendgrid",
        nome: "SendGrid",
        descricao: "Envio de emails transacionais",
        icone: "📧",
        status: "conectado",
        campos: [
          { nome: "API Key", valor: "••••••••••••••••", tipo: "password" },
          {
            nome: "From Email",
            valor: "contato@vtur.com.br",
            tipo: "text"
          },
          { nome: "From Name", valor: "VTUR Viagens", tipo: "text" }
        ]
      },
      {
        id: "google",
        nome: "Google Calendar",
        descricao: "Sincronização de agenda",
        icone: "📅",
        status: "configurar",
        campos: [
          { nome: "Client ID", valor: "", tipo: "text" },
          { nome: "Client Secret", valor: "", tipo: "password" },
          {
            nome: "Redirect URI",
            valor: "https://vtur.com/auth/google/callback",
            tipo: "text",
            readonly: true
          }
        ]
      }
    ];
    function getStatusBadge(status) {
      const styles = {
        conectado: "bg-green-100 text-green-700",
        desconectado: "bg-red-100 text-red-700",
        configurar: "bg-amber-100 text-amber-700",
        erro: "bg-red-100 text-red-700"
      };
      const labels = {
        conectado: "Conectado",
        desconectado: "Desconectado",
        configurar: "Configurar",
        erro: "Erro"
      };
      return `<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${styles[status]}">${labels[status]}</span>`;
    }
    head("nclxlv", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Integrações | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Integrações",
      subtitle: "APIs e serviços externos",
      color: "financeiro",
      breadcrumbs: [
        { label: "Parâmetros", href: "/parametros" },
        { label: "Integrações" }
      ]
    });
    $$renderer2.push(`<!----> <div class="space-y-6"><!--[-->`);
    const each_array = ensure_array_like(integracoes);
    for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
      let int = each_array[$$index_1];
      Card($$renderer2, {
        color: "financeiro",
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="flex items-start justify-between mb-4"><div class="flex items-center gap-4"><div class="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl">${escape_html(int.icone)}</div> <div><div class="flex items-center gap-2"><h3 class="text-lg font-semibold text-slate-900">${escape_html(int.nome)}</h3> ${html(getStatusBadge(int.status))}</div> <p class="text-sm text-slate-500">${escape_html(int.descricao)}</p></div></div> <div class="flex items-center gap-2">`);
          if (int.status === "conectado") {
            $$renderer3.push("<!--[0-->");
            Button($$renderer3, {
              variant: "secondary",
              size: "sm",
              disabled: testando,
              children: ($$renderer4) => {
                Refresh_cw($$renderer4, {
                  size: 16,
                  class: `mr-1 ${stringify("")}`
                });
                $$renderer4.push(`<!----> Testar`);
              },
              $$slots: { default: true }
            });
          } else {
            $$renderer3.push("<!--[-1-->");
          }
          $$renderer3.push(`<!--]--> <a href="#" class="p-2 text-slate-400 hover:text-financeiro-600 hover:bg-financeiro-50 rounded-lg transition-colors" title="Documentação">`);
          External_link($$renderer3, { size: 18 });
          $$renderer3.push(`<!----></a></div></div> <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"><!--[-->`);
          const each_array_1 = ensure_array_like(int.campos);
          for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
            let campo = each_array_1[$$index];
            $$renderer3.push(`<div><label class="block text-sm font-medium text-slate-700 mb-1">${escape_html(campo.nome)}</label> `);
            if (campo.readonly) {
              $$renderer3.push("<!--[0-->");
              $$renderer3.push(`<div class="flex items-center gap-2"><input type="text"${attr("value", campo.valor)} readonly="" class="vtur-input w-full bg-slate-50 text-slate-500"/> <button type="button" class="p-2 text-slate-400 hover:text-financeiro-600 rounded-lg">📋</button></div>`);
            } else {
              $$renderer3.push("<!--[-1-->");
              $$renderer3.push(`<input${attr("type", campo.tipo)}${attr("value", campo.valor)} class="vtur-input w-full"/>`);
            }
            $$renderer3.push(`<!--]--></div>`);
          }
          $$renderer3.push(`<!--]--></div> `);
          if (int.status === "desconectado") {
            $$renderer3.push("<!--[0-->");
            $$renderer3.push(`<div class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg"><div class="flex items-center gap-2">`);
            Triangle_alert($$renderer3, { size: 18, class: "text-amber-600" });
            $$renderer3.push(`<!----> <span class="text-sm text-amber-700">Esta integração não está configurada. Preencha os campos acima para ativar.</span></div></div>`);
          } else {
            $$renderer3.push("<!--[-1-->");
          }
          $$renderer3.push(`<!--]-->`);
        },
        $$slots: { default: true }
      });
    }
    $$renderer2.push(`<!--]--></div> <div class="flex items-center justify-end gap-3 mt-6">`);
    Button($$renderer2, {
      variant: "secondary",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->Cancelar`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Button($$renderer2, {
      variant: "primary",
      color: "financeiro",
      disabled: saving,
      children: ($$renderer3) => {
        {
          $$renderer3.push("<!--[-1-->");
          Save($$renderer3, { size: 18, class: "mr-2" });
          $$renderer3.push(`<!----> Salvar Configurações`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div>`);
  });
}
export {
  _page as default
};
