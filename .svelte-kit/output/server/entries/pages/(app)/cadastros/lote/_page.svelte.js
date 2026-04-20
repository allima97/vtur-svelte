import { h as head, t as ensure_array_like, e as escape_html } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import "../../../../../chunks/ui.js";
import { D as Download } from "../../../../../chunks/download.js";
import { U as Upload } from "../../../../../chunks/upload.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let tipos = [];
    let subdivisoes = [];
    let saving = false;
    let tipoId = "";
    let subdivisaoId = "";
    let textoProdutos = "";
    head("1evz93p", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Importação em Lote | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Importação em Lote",
      subtitle: "Importe múltiplos produtos de uma vez colando a lista ou fazendo upload de arquivo.",
      breadcrumbs: [
        { label: "Cadastros", href: "/cadastros" },
        { label: "Importação em Lote" }
      ]
    });
    $$renderer2.push(`<!----> <div class="grid grid-cols-1 lg:grid-cols-3 gap-6"><div class="lg:col-span-2 space-y-6">`);
    Card($$renderer2, {
      title: "Configuração da importação",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="grid grid-cols-1 gap-4 md:grid-cols-2"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="lote-tipo">Tipo de produto *</label> `);
        $$renderer3.select({ id: "lote-tipo", value: tipoId, class: "vtur-input w-full" }, ($$renderer4) => {
          $$renderer4.option({ value: "" }, ($$renderer5) => {
            $$renderer5.push(`Selecione...`);
          });
          $$renderer4.push(`<!--[-->`);
          const each_array = ensure_array_like(tipos);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let t = each_array[$$index];
            $$renderer4.option({ value: t.id }, ($$renderer5) => {
              $$renderer5.push(`${escape_html(t.nome)}`);
            });
          }
          $$renderer4.push(`<!--]-->`);
        });
        $$renderer3.push(`</div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="lote-sub">Estado/Subdivisão (opcional)</label> `);
        $$renderer3.select(
          {
            id: "lote-sub",
            value: subdivisaoId,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "" }, ($$renderer5) => {
              $$renderer5.push(`Todas as cidades`);
            });
            $$renderer4.push(`<!--[-->`);
            const each_array_1 = ensure_array_like(subdivisoes);
            for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
              let s = each_array_1[$$index_1];
              $$renderer4.option({ value: s.id }, ($$renderer5) => {
                $$renderer5.push(`${escape_html(s.nome)}`);
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
      title: "Lista de produtos",
      children: ($$renderer3) => {
        $$renderer3.push(`<p class="text-sm text-slate-500 mb-3">Cole um produto por linha. O nome será usado diretamente.</p> <textarea rows="12" class="vtur-input w-full font-mono text-sm" placeholder="Pacote Europa Clássica Hotel Copacabana Palace Passagem Aérea GRU-LIS ...">`);
        const $$body = escape_html(textoProdutos);
        if ($$body) {
          $$renderer3.push(`${$$body}`);
        }
        $$renderer3.push(`</textarea> <p class="mt-1 text-xs text-slate-500">${escape_html(textoProdutos.split("\n").filter((l) => l.trim()).length)} produto(s) na lista</p>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> <div class="flex justify-end gap-3">`);
    Button($$renderer2, {
      variant: "secondary",
      children: ($$renderer3) => {
        Download($$renderer3, { size: 16, class: "mr-2" });
        $$renderer3.push(`<!----> Baixar template`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Button($$renderer2, {
      variant: "primary",
      loading: saving,
      children: ($$renderer3) => {
        Upload($$renderer3, { size: 16, class: "mr-2" });
        $$renderer3.push(`<!----> Importar produtos`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div></div> <div class="space-y-6">`);
    Card($$renderer2, {
      title: "Instruções",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="space-y-3 text-sm text-slate-600"><p>1. Selecione o <strong>tipo de produto</strong> que será aplicado a todos os itens.</p> <p>2. Opcionalmente, selecione um <strong>estado/subdivisão</strong> para vincular os produtos a uma região.</p> <p>3. Cole a lista de produtos, <strong>um por linha</strong>.</p> <p>4. Clique em <strong>Importar produtos</strong>.</p> <p class="text-amber-600">Produtos com o mesmo nome já existentes serão ignorados.</p></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></div>`);
  });
}
export {
  _page as default
};
