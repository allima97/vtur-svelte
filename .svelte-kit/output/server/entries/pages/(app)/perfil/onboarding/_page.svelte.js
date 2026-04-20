import { h as head, e as escape_html } from "../../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../../chunks/exports.js";
import "../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../chunks/root.js";
import "../../../../../chunks/state.svelte.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import "clsx";
import "../../../../../chunks/ui.js";
import { C as Circle_check_big } from "../../../../../chunks/circle-check-big.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let camposFaltando;
    let form = {
      nome_completo: "",
      cpf: "",
      telefone: "",
      cep: "",
      numero: "",
      cidade: "",
      estado: ""
    };
    camposFaltando = [
      !form.nome_completo.trim() && "Nome completo",
      !form.cpf.trim() && "CPF",
      "Data de nascimento",
      !form.telefone.trim() && "Telefone",
      !form.cep.trim() && "CEP",
      !form.numero.trim() && "Número",
      !form.cidade.trim() && "Cidade",
      !form.estado.trim() && "Estado",
      "Tipo de uso"
    ].filter(Boolean);
    head("1n31m0", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Completar Perfil | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Complete seu Perfil",
      subtitle: "Preencha os dados obrigatórios para acessar todos os recursos do sistema.",
      breadcrumbs: [{ label: "Onboarding" }]
    });
    $$renderer2.push(`<!----> `);
    if (camposFaltando.length > 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="mb-6 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3"><p class="text-sm font-medium text-amber-800">Campos obrigatórios pendentes:</p> <p class="mt-1 text-sm text-amber-700">${escape_html(camposFaltando.join(", "))}</p></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="mb-6 rounded-[14px] border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-2">`);
      Circle_check_big($$renderer2, { size: 18, class: "text-green-600" });
      $$renderer2.push(`<!----> <p class="text-sm font-medium text-green-800">Todos os campos obrigatórios estão preenchidos!</p></div>`);
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="flex items-center justify-center py-20 text-slate-500">Carregando...</div>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
