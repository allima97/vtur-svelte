import { h as head, t as ensure_array_like, e as escape_html } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import "clsx";
import { t as toast } from "../../../../../chunks/ui.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { G as Gift } from "../../../../../chunks/gift.js";
import { U as Users } from "../../../../../chunks/users.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let hoje;
    const MESES = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro"
    ];
    let colaboradores = [];
    let loading = true;
    let mesSelecionado = (/* @__PURE__ */ new Date()).getMonth() + 1;
    async function load() {
      loading = true;
      try {
        const response = await fetch(`/api/v1/users/aniversariantes?month=${mesSelecionado}`);
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        colaboradores = payload.items || [];
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar aniversariantes.");
      } finally {
        loading = false;
      }
    }
    hoje = colaboradores.filter((c) => c.aniversario_hoje).length;
    head("va2kwh", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Aniversariantes da Equipe | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Aniversariantes da Equipe",
      subtitle: "Colaboradores com aniversário no mês selecionado.",
      breadcrumbs: [
        { label: "Admin", href: "/admin" },
        { label: "Aniversariantes" }
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
    Card($$renderer2, {
      class: "mb-6",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="flex items-center gap-4"><label class="text-sm font-medium text-slate-700" for="mes-colab">Mês</label> `);
        $$renderer3.select({ id: "mes-colab", value: mesSelecionado, class: "vtur-input" }, ($$renderer4) => {
          $$renderer4.push(`<!--[-->`);
          const each_array = ensure_array_like(MESES);
          for (let i = 0, $$length = each_array.length; i < $$length; i++) {
            let mes = each_array[i];
            $$renderer4.option({ value: i + 1 }, ($$renderer5) => {
              $$renderer5.push(`${escape_html(mes)}`);
            });
          }
          $$renderer4.push(`<!--]-->`);
        });
        $$renderer3.push(` `);
        if (hoje > 0) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<span class="inline-flex items-center gap-1 rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-pink-700">`);
          Gift($$renderer3, { size: 12 });
          $$renderer3.push(`<!----> ${escape_html(hoje)} aniversariante(s) hoje!</span>`);
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    if (loading) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="flex items-center justify-center py-20 text-slate-500">Carregando...</div>`);
    } else if (colaboradores.length === 0) {
      $$renderer2.push("<!--[1-->");
      Card($$renderer2, {
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="flex flex-col items-center justify-center py-12 text-slate-500">`);
          Users($$renderer3, { size: 48, class: "mb-4 opacity-30" });
          $$renderer3.push(`<!----> <p>Nenhum colaborador com aniversário em ${escape_html(MESES[mesSelecionado - 1])}.</p></div>`);
        },
        $$slots: { default: true }
      });
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"><!--[-->`);
      const each_array_1 = ensure_array_like(colaboradores);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let colab = each_array_1[$$index_1];
        Card($$renderer2, {
          class: colab.aniversario_hoje ? "border-2 border-pink-300 bg-pink-50/30" : "",
          children: ($$renderer3) => {
            $$renderer3.push(`<div class="flex items-center gap-4"><div class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-semibold text-lg flex-shrink-0">${escape_html((colab.nome_completo || "U").slice(0, 2).toUpperCase())}</div> <div class="min-w-0 flex-1"><div class="flex items-center gap-2"><p class="font-semibold text-slate-900 truncate">${escape_html(colab.nome_completo || "Colaborador")}</p> `);
            if (colab.aniversario_hoje) {
              $$renderer3.push("<!--[0-->");
              Gift($$renderer3, { size: 14, class: "text-pink-500 flex-shrink-0" });
            } else {
              $$renderer3.push("<!--[-1-->");
            }
            $$renderer3.push(`<!--]--></div> <p class="text-xs text-slate-500">${escape_html(colab.role || "Colaborador")}</p> `);
            if (colab.company_nome) {
              $$renderer3.push("<!--[0-->");
              $$renderer3.push(`<p class="text-xs text-slate-400">${escape_html(colab.company_nome)}</p>`);
            } else {
              $$renderer3.push("<!--[-1-->");
            }
            $$renderer3.push(`<!--]--> `);
            if (colab.data_nascimento) {
              $$renderer3.push("<!--[0-->");
              $$renderer3.push(`<p class="text-xs text-slate-600 mt-1">${escape_html((/* @__PURE__ */ new Date(colab.data_nascimento + "T00:00:00")).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" }))}</p>`);
            } else {
              $$renderer3.push("<!--[-1-->");
            }
            $$renderer3.push(`<!--]--></div></div>`);
          },
          $$slots: { default: true }
        });
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
