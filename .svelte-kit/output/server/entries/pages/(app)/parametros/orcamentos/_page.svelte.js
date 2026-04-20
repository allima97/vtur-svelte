import { h as head, q as attr, e as escape_html } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { F as File_text } from "../../../../../chunks/file-text.js";
import { S as Save } from "../../../../../chunks/save.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let loading = true;
    let saving = false;
    let settings = {
      consultor_nome: "",
      filial_nome: "",
      endereco_linha1: "",
      endereco_linha2: "",
      endereco_linha3: "",
      telefone: "",
      whatsapp: "",
      whatsapp_codigo_pais: "55",
      email: "",
      rodape_texto: ""
    };
    async function load() {
      loading = true;
      try {
        const response = await fetch("/api/v1/parametros/orcamentos-pdf");
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        if (payload.settings) {
          settings = {
            consultor_nome: payload.settings.consultor_nome || "",
            filial_nome: payload.settings.filial_nome || "",
            endereco_linha1: payload.settings.endereco_linha1 || "",
            endereco_linha2: payload.settings.endereco_linha2 || "",
            endereco_linha3: payload.settings.endereco_linha3 || "",
            telefone: payload.settings.telefone || "",
            whatsapp: payload.settings.whatsapp || "",
            whatsapp_codigo_pais: payload.settings.whatsapp_codigo_pais || "55",
            email: payload.settings.email || "",
            rodape_texto: payload.settings.rodape_texto || ""
          };
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar parâmetros.");
      } finally {
        loading = false;
      }
    }
    head("1rclsrc", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Parâmetros de Orçamentos | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Parâmetros de Orçamentos",
      subtitle: "Configure os dados do consultor, endereço e rodapé que aparecem nos PDFs de orçamento.",
      color: "financeiro",
      breadcrumbs: [
        { label: "Parâmetros", href: "/parametros" },
        { label: "Orçamentos" }
      ],
      actions: [
        {
          label: "Atualizar",
          onClick: load,
          variant: "secondary",
          icon: Refresh_cw
        }
      ]
    });
    $$renderer2.push(`<!----> `);
    if (loading) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="flex items-center justify-center py-20 text-slate-500">Carregando...</div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<form class="space-y-6">`);
      Card($$renderer2, {
        title: "Dados do Consultor",
        color: "financeiro",
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="grid grid-cols-1 gap-4 md:grid-cols-2"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="orc-consultor">Nome do Consultor</label> <input id="orc-consultor"${attr("value", settings.consultor_nome)} class="vtur-input w-full" placeholder="Seu nome completo"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="orc-filial">Filial / Agência</label> <input id="orc-filial"${attr("value", settings.filial_nome)} class="vtur-input w-full" placeholder="Nome da filial ou agência"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="orc-email">E-mail</label> <input id="orc-email" type="email"${attr("value", settings.email)} class="vtur-input w-full" placeholder="consultor@agencia.com.br"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="orc-telefone">Telefone</label> <input id="orc-telefone"${attr("value", settings.telefone)} class="vtur-input w-full" placeholder="(00) 0000-0000"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="orc-whatsapp">WhatsApp</label> <div class="flex gap-2"><input${attr("value", settings.whatsapp_codigo_pais)} class="vtur-input w-16" placeholder="55" maxlength="4"/> <input id="orc-whatsapp"${attr("value", settings.whatsapp)} class="vtur-input flex-1" placeholder="(00) 00000-0000"/></div> <p class="mt-1 text-xs text-slate-500">Código do país + número (ex: 55 + 11 99999-9999)</p></div></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----> `);
      Card($$renderer2, {
        title: "Endereço",
        color: "financeiro",
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="space-y-3"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="orc-end1">Linha 1</label> <input id="orc-end1"${attr("value", settings.endereco_linha1)} class="vtur-input w-full" placeholder="Rua, número, complemento"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="orc-end2">Linha 2</label> <input id="orc-end2"${attr("value", settings.endereco_linha2)} class="vtur-input w-full" placeholder="Bairro, cidade - UF"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="orc-end3">Linha 3</label> <input id="orc-end3"${attr("value", settings.endereco_linha3)} class="vtur-input w-full" placeholder="CEP, informações adicionais"/></div></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----> `);
      Card($$renderer2, {
        title: "Rodapé do PDF",
        color: "financeiro",
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="flex items-start gap-2 mb-2">`);
          File_text($$renderer3, { size: 16, class: "mt-0.5 text-slate-400" });
          $$renderer3.push(`<!----> <p class="text-sm text-slate-500">Texto exibido no rodapé dos PDFs de orçamento. Inclui condições gerais, política de cancelamento, etc.</p></div> <textarea rows="8" class="vtur-input w-full font-mono text-xs" placeholder="Texto do rodapé...">`);
          const $$body = escape_html(settings.rodape_texto);
          if ($$body) {
            $$renderer3.push(`${$$body}`);
          }
          $$renderer3.push(`</textarea>`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----> <div class="flex justify-end gap-3">`);
      Button($$renderer2, {
        type: "submit",
        variant: "primary",
        color: "financeiro",
        loading: saving,
        children: ($$renderer3) => {
          Save($$renderer3, { size: 16, class: "mr-2" });
          $$renderer3.push(`<!----> Salvar Parâmetros`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----></div></form>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
