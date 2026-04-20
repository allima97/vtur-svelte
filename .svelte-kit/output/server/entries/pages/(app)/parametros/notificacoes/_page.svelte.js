import { h as head, q as attr } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import "../../../../../chunks/ui.js";
import { M as Mail } from "../../../../../chunks/mail.js";
import { B as Bell } from "../../../../../chunks/bell.js";
import { M as Message_square } from "../../../../../chunks/message-square.js";
import { S as Save } from "../../../../../chunks/save.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let saving = false;
    let notificacoes = {
      email: {
        ativo: true,
        novo_cliente: true,
        nova_venda: true,
        pagamento_confirmado: true,
        pagamento_atrasado: true,
        aniversario_cliente: false,
        relatorio_diario: false
      },
      sistema: {
        ativo: true,
        novo_orcamento: true,
        orcamento_aprovado: true,
        vencimento_voucher: true,
        tarefa_atrasada: true,
        meta_atingida: true
      },
      whatsapp: {
        ativo: false
      }
    };
    head("ipki70", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Notificações | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Notificações",
      subtitle: "Configurar alertas e comunicações",
      color: "financeiro",
      breadcrumbs: [
        { label: "Parâmetros", href: "/parametros" },
        { label: "Notificações" }
      ]
    });
    $$renderer2.push(`<!----> <form>`);
    Card($$renderer2, {
      header: "Notificações por Email",
      color: "financeiro",
      class: "mb-6",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="flex items-center justify-between pb-4 border-b border-slate-100 mb-4"><div class="flex items-center gap-3"><div class="p-2 bg-blue-50 rounded-lg">`);
        Mail($$renderer3, { size: 20, class: "text-blue-600" });
        $$renderer3.push(`<!----></div> <div><p class="font-medium text-slate-900">Email</p> <p class="text-sm text-slate-500">Receber notificações por email</p></div></div> <label class="relative inline-flex items-center cursor-pointer"><input type="checkbox"${attr("checked", notificacoes.email.ativo, true)} class="sr-only peer"/> <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-financeiro-500"></div></label></div> `);
        {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div class="grid grid-cols-1 md:grid-cols-2 gap-4"><label class="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50"><input type="checkbox"${attr("checked", notificacoes.email.novo_cliente, true)} class="w-4 h-4 text-financeiro-600 rounded"/> <span class="text-sm text-slate-700">Novo cliente cadastrado</span></label> <label class="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50"><input type="checkbox"${attr("checked", notificacoes.email.nova_venda, true)} class="w-4 h-4 text-financeiro-600 rounded"/> <span class="text-sm text-slate-700">Nova venda realizada</span></label> <label class="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50"><input type="checkbox"${attr("checked", notificacoes.email.pagamento_confirmado, true)} class="w-4 h-4 text-financeiro-600 rounded"/> <span class="text-sm text-slate-700">Pagamento confirmado</span></label> <label class="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50"><input type="checkbox"${attr("checked", notificacoes.email.pagamento_atrasado, true)} class="w-4 h-4 text-financeiro-600 rounded"/> <span class="text-sm text-slate-700">Pagamento em atraso</span></label> <label class="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50"><input type="checkbox"${attr("checked", notificacoes.email.aniversario_cliente, true)} class="w-4 h-4 text-financeiro-600 rounded"/> <span class="text-sm text-slate-700">Aniversário de cliente</span></label> <label class="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50"><input type="checkbox"${attr("checked", notificacoes.email.relatorio_diario, true)} class="w-4 h-4 text-financeiro-600 rounded"/> <span class="text-sm text-slate-700">Relatório diário de vendas</span></label></div>`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      header: "Notificações no Sistema",
      color: "financeiro",
      class: "mb-6",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="flex items-center justify-between pb-4 border-b border-slate-100 mb-4"><div class="flex items-center gap-3"><div class="p-2 bg-financeiro-50 rounded-lg">`);
        Bell($$renderer3, { size: 20, class: "text-financeiro-600" });
        $$renderer3.push(`<!----></div> <div><p class="font-medium text-slate-900">Sistema</p> <p class="text-sm text-slate-500">Notificações dentro da plataforma</p></div></div> <label class="relative inline-flex items-center cursor-pointer"><input type="checkbox"${attr("checked", notificacoes.sistema.ativo, true)} class="sr-only peer"/> <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-financeiro-500"></div></label></div> `);
        {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div class="grid grid-cols-1 md:grid-cols-2 gap-4"><label class="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50"><input type="checkbox"${attr("checked", notificacoes.sistema.novo_orcamento, true)} class="w-4 h-4 text-financeiro-600 rounded"/> <span class="text-sm text-slate-700">Novo orçamento</span></label> <label class="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50"><input type="checkbox"${attr("checked", notificacoes.sistema.orcamento_aprovado, true)} class="w-4 h-4 text-financeiro-600 rounded"/> <span class="text-sm text-slate-700">Orçamento aprovado</span></label> <label class="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50"><input type="checkbox"${attr("checked", notificacoes.sistema.vencimento_voucher, true)} class="w-4 h-4 text-financeiro-600 rounded"/> <span class="text-sm text-slate-700">Voucher próximo do vencimento</span></label> <label class="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50"><input type="checkbox"${attr("checked", notificacoes.sistema.tarefa_atrasada, true)} class="w-4 h-4 text-financeiro-600 rounded"/> <span class="text-sm text-slate-700">Tarefa atrasada</span></label> <label class="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50"><input type="checkbox"${attr("checked", notificacoes.sistema.meta_atingida, true)} class="w-4 h-4 text-financeiro-600 rounded"/> <span class="text-sm text-slate-700">Meta de vendas atingida</span></label></div>`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      header: "Notificações WhatsApp",
      color: "financeiro",
      class: "mb-6",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="flex items-center justify-between pb-4 border-b border-slate-100 mb-4"><div class="flex items-center gap-3"><div class="p-2 bg-green-50 rounded-lg">`);
        Message_square($$renderer3, { size: 20, class: "text-green-600" });
        $$renderer3.push(`<!----></div> <div><p class="font-medium text-slate-900">WhatsApp</p> <p class="text-sm text-slate-500">Integração com WhatsApp Business API</p></div></div> <label class="relative inline-flex items-center cursor-pointer"><input type="checkbox"${attr("checked", notificacoes.whatsapp.ativo, true)} class="sr-only peer"/> <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div></label></div> `);
        {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> <div class="flex items-center justify-end gap-3">`);
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
      type: "submit",
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
    $$renderer2.push(`<!----></div></form>`);
  });
}
export {
  _page as default
};
