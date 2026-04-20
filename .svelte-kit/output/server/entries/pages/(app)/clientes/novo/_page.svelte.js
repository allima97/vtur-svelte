import { h as head, q as attr, e as escape_html, p as attr_class, t as ensure_array_like } from "../../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../../chunks/exports.js";
import "../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../chunks/root.js";
import "../../../../../chunks/state.svelte.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import "../../../../../chunks/ui.js";
import { g as generoOptions, a as classificacaoOptions, e as estadosBrasil, c as createInitialClienteForm } from "../../../../../chunks/form.js";
import { U as User } from "../../../../../chunks/user.js";
import { C as Calendar } from "../../../../../chunks/calendar.js";
import { P as Phone } from "../../../../../chunks/phone.js";
import { M as Mail } from "../../../../../chunks/mail.js";
import { T as Tag } from "../../../../../chunks/tag.js";
import { M as Map_pin } from "../../../../../chunks/map-pin.js";
import { F as File_text } from "../../../../../chunks/file-text.js";
import { A as Arrow_left } from "../../../../../chunks/arrow-left.js";
import { S as Save } from "../../../../../chunks/save.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let formData = createInitialClienteForm();
    let loading = false;
    let errors = {};
    head("w9vism", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Novo Cliente | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Novo Cliente",
      subtitle: "Cadastro completo com dados pessoais, contato, endereco, classificacao e notas operacionais.",
      breadcrumbs: [
        { label: "Clientes", href: "/clientes" },
        { label: "Novo Cliente" }
      ]
    });
    $$renderer2.push(`<!----> <form class="space-y-6">`);
    Card($$renderer2, {
      title: "Dados cadastrais",
      color: "clientes",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"><div><p class="mb-2 block text-sm font-medium text-slate-700">Tipo de pessoa</p> <div class="flex gap-4 rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3"><label class="flex items-center gap-2 text-sm text-slate-700"><input type="radio"${attr("checked", formData.tipo_pessoa === "PF", true)} class="h-4 w-4 text-clientes-600"/> Pessoa Fisica</label> <label class="flex items-center gap-2 text-sm text-slate-700"><input type="radio"${attr("checked", formData.tipo_pessoa === "PJ", true)} class="h-4 w-4 text-clientes-600"/> Pessoa Juridica</label></div></div> <div class="lg:col-span-2"><label for="nome" class="mb-1 block text-sm font-medium text-slate-700">${escape_html(formData.tipo_pessoa === "PJ" ? "Razao social" : "Nome completo")} *</label> <div class="relative">`);
        User($$renderer3, {
          size: 18,
          class: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        });
        $$renderer3.push(`<!----> <input id="nome"${attr("value", formData.nome)}${attr_class("vtur-input w-full pl-10", void 0, { "border-red-500": errors.nome })}${attr("placeholder", formData.tipo_pessoa === "PJ" ? "Razao social do cliente" : "Nome completo do cliente")}/></div> `);
        if (errors.nome) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<p class="mt-1 text-sm text-red-600">${escape_html(errors.nome)}</p>`);
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--></div> <div><label for="cpf" class="mb-1 block text-sm font-medium text-slate-700">${escape_html(formData.tipo_pessoa === "PJ" ? "CNPJ" : "CPF")} *</label> <input id="cpf"${attr("value", formData.cpf)}${attr_class("vtur-input w-full", void 0, { "border-red-500": errors.cpf })}${attr("placeholder", formData.tipo_pessoa === "PJ" ? "00.000.000/0000-00" : "000.000.000-00")}/> `);
        if (errors.cpf) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<p class="mt-1 text-sm text-red-600">${escape_html(errors.cpf)}</p>`);
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--></div> <div><label for="rg" class="mb-1 block text-sm font-medium text-slate-700">${escape_html(formData.tipo_pessoa === "PJ" ? "Inscricao / IE" : "RG")}</label> <input id="rg"${attr("value", formData.rg)} class="vtur-input w-full"${attr("placeholder", formData.tipo_pessoa === "PJ" ? "Documento complementar" : "Documento de identidade")}/></div> `);
        if (formData.tipo_pessoa === "PF") {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div><label for="nascimento" class="mb-1 block text-sm font-medium text-slate-700">Data de nascimento</label> <div class="relative">`);
          Calendar($$renderer3, {
            size: 18,
            class: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          });
          $$renderer3.push(`<!----> <input id="nascimento" type="date"${attr("value", formData.nascimento)} class="vtur-input w-full pl-10"/></div></div> <div><label for="genero" class="mb-1 block text-sm font-medium text-slate-700">Genero</label> `);
          $$renderer3.select(
            {
              id: "genero",
              value: formData.genero,
              class: "vtur-input w-full"
            },
            ($$renderer4) => {
              $$renderer4.push(`<!--[-->`);
              const each_array = ensure_array_like(generoOptions);
              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                let option = each_array[$$index];
                $$renderer4.option({ value: option }, ($$renderer5) => {
                  $$renderer5.push(`${escape_html(option || "Selecione")}`);
                });
              }
              $$renderer4.push(`<!--]-->`);
            }
          );
          $$renderer3.push(`</div> <div><label for="nacionalidade" class="mb-1 block text-sm font-medium text-slate-700">Nacionalidade</label> <input id="nacionalidade"${attr("value", formData.nacionalidade)} class="vtur-input w-full"/></div>`);
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--> <div><label for="tipo_cliente" class="mb-1 block text-sm font-medium text-slate-700">Tipo de cliente</label> <input id="tipo_cliente"${attr("value", formData.tipo_cliente)} class="vtur-input w-full" placeholder="passageiro"/></div> <div><label for="classificacao" class="mb-1 block text-sm font-medium text-slate-700">Classificacao</label> `);
        $$renderer3.select(
          {
            id: "classificacao",
            value: formData.classificacao,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.push(`<!--[-->`);
            const each_array_1 = ensure_array_like(classificacaoOptions);
            for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
              let option = each_array_1[$$index_1];
              $$renderer4.option({ value: option }, ($$renderer5) => {
                $$renderer5.push(`${escape_html(option || "Selecione")}`);
              });
            }
            $$renderer4.push(`<!--]-->`);
          }
        );
        $$renderer3.push(`</div> <div class="flex items-center gap-2 pt-7"><input id="ativo" type="checkbox"${attr("checked", formData.ativo, true)} class="h-4 w-4 rounded border-slate-300 text-clientes-600"/> <label for="ativo" class="text-sm text-slate-700">Cliente ativo</label></div></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Contato e relacionamento",
      color: "clientes",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"><div><label for="telefone" class="mb-1 block text-sm font-medium text-slate-700">Telefone *</label> <div class="relative">`);
        Phone($$renderer3, {
          size: 18,
          class: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        });
        $$renderer3.push(`<!----> <input id="telefone"${attr("value", formData.telefone)}${attr_class("vtur-input w-full pl-10", void 0, { "border-red-500": errors.telefone })} placeholder="(00) 00000-0000"/></div> `);
        if (errors.telefone) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<p class="mt-1 text-sm text-red-600">${escape_html(errors.telefone)}</p>`);
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--></div> <div><label for="whatsapp" class="mb-1 block text-sm font-medium text-slate-700">WhatsApp</label> <div class="relative">`);
        Phone($$renderer3, {
          size: 18,
          class: "absolute left-3 top-1/2 -translate-y-1/2 text-green-500"
        });
        $$renderer3.push(`<!----> <input id="whatsapp"${attr("value", formData.whatsapp)} class="vtur-input w-full pl-10" placeholder="(00) 00000-0000"/></div></div> <div class="lg:col-span-2"><label for="email" class="mb-1 block text-sm font-medium text-slate-700">E-mail</label> <div class="relative">`);
        Mail($$renderer3, {
          size: 18,
          class: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        });
        $$renderer3.push(`<!----> <input id="email"${attr("value", formData.email)}${attr_class("vtur-input w-full pl-10", void 0, { "border-red-500": errors.email })} placeholder="cliente@exemplo.com"/></div> `);
        if (errors.email) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<p class="mt-1 text-sm text-red-600">${escape_html(errors.email)}</p>`);
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--></div> <div class="lg:col-span-4"><label for="tags" class="mb-1 block text-sm font-medium text-slate-700">Tags</label> <div class="relative">`);
        Tag($$renderer3, {
          size: 18,
          class: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        });
        $$renderer3.push(`<!----> <input id="tags"${attr("value", formData.tags)} class="vtur-input w-full pl-10" placeholder="vip, aniversario, indicacao"/></div> <p class="mt-1 text-xs text-slate-500">Separe as tags por virgula, como no fluxo do app legado.</p></div></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Endereco",
      color: "clientes",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"><div><label for="cep" class="mb-1 block text-sm font-medium text-slate-700">CEP</label> <div class="relative">`);
        Map_pin($$renderer3, {
          size: 18,
          class: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        });
        $$renderer3.push(`<!----> <input id="cep"${attr("value", formData.cep)} class="vtur-input w-full pl-10" placeholder="00000-000"/></div> <p class="mt-1 text-xs text-slate-500">${escape_html("Preencha para auto-preencher o endereco.")}</p></div> <div class="lg:col-span-2"><label for="endereco" class="mb-1 block text-sm font-medium text-slate-700">Endereco</label> <input id="endereco"${attr("value", formData.endereco)} class="vtur-input w-full" placeholder="Rua, avenida, etc."/></div> <div><label for="numero" class="mb-1 block text-sm font-medium text-slate-700">Numero</label> <input id="numero"${attr("value", formData.numero)} class="vtur-input w-full" placeholder="123"/></div> <div><label for="complemento" class="mb-1 block text-sm font-medium text-slate-700">Complemento</label> <input id="complemento"${attr("value", formData.complemento)} class="vtur-input w-full" placeholder="Apto, sala, bloco"/></div> <div><label for="cidade" class="mb-1 block text-sm font-medium text-slate-700">Cidade</label> <input id="cidade"${attr("value", formData.cidade)} class="vtur-input w-full"/></div> <div><label for="estado" class="mb-1 block text-sm font-medium text-slate-700">Estado</label> `);
        $$renderer3.select(
          {
            id: "estado",
            value: formData.estado,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "" }, ($$renderer5) => {
              $$renderer5.push(`Selecione`);
            });
            $$renderer4.push(`<!--[-->`);
            const each_array_2 = ensure_array_like(estadosBrasil);
            for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
              let estado = each_array_2[$$index_2];
              $$renderer4.option({ value: estado.value }, ($$renderer5) => {
                $$renderer5.push(`${escape_html(estado.label)}`);
              });
            }
            $$renderer4.push(`<!--]-->`);
          }
        );
        $$renderer3.push(`</div></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Notas operacionais",
      color: "clientes",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="relative">`);
        File_text($$renderer3, { size: 18, class: "absolute left-3 top-3 text-slate-400" });
        $$renderer3.push(`<!----> <textarea id="notas" rows="5" class="vtur-input w-full pl-10" placeholder="Informacoes de relacionamento, preferencias, observacoes comerciais e contexto do cliente.">`);
        const $$body = escape_html(formData.notas);
        if ($$body) {
          $$renderer3.push(`${$$body}`);
        }
        $$renderer3.push(`</textarea></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> <div class="flex items-center justify-end gap-3">`);
    Button($$renderer2, {
      type: "button",
      variant: "secondary",
      disabled: loading,
      children: ($$renderer3) => {
        Arrow_left($$renderer3, { size: 16, class: "mr-2" });
        $$renderer3.push(`<!----> Cancelar`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Button($$renderer2, {
      type: "submit",
      variant: "primary",
      color: "clientes",
      loading,
      children: ($$renderer3) => {
        Save($$renderer3, { size: 16, class: "mr-2" });
        $$renderer3.push(`<!----> Salvar cliente`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div></form>`);
  });
}
export {
  _page as default
};
