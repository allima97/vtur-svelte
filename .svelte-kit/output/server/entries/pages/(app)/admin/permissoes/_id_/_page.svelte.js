import { b as store_get, h as head, t as ensure_array_like, u as unsubscribe_stores, e as escape_html, q as attr } from "../../../../../../chunks/index2.js";
import { p as page } from "../../../../../../chunks/stores.js";
import { P as PageHeader } from "../../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../../chunks/Card.js";
import { B as Button } from "../../../../../../chunks/Button2.js";
import { B as Badge } from "../../../../../../chunks/Badge.js";
import { t as toast } from "../../../../../../chunks/ui.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let saving = false;
    let userInfo = null;
    let permissions = [];
    let sections = [];
    const levels = [
      { value: "none", label: "Nenhum" },
      { value: "view", label: "Ver" },
      { value: "create", label: "Criar" },
      { value: "edit", label: "Editar" },
      { value: "delete", label: "Excluir" },
      { value: "admin", label: "Admin" }
    ];
    let lastLoadedId = "";
    function entriesForSection(section) {
      return permissions.filter((entry) => section.modulos.includes(entry.label));
    }
    async function loadPage() {
      try {
        const response = await fetch(`/api/v1/admin/permissoes/${store_get($$store_subs ??= {}, "$page", page).params.id}`);
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        userInfo = payload.user;
        permissions = payload.permissions || [];
        sections = payload.sections || [];
      } catch (err) {
        console.error(err);
        toast.error("Nao foi possivel carregar a matriz de permissoes.");
      } finally {
      }
    }
    if (store_get($$store_subs ??= {}, "$page", page).params.id && store_get($$store_subs ??= {}, "$page", page).params.id !== lastLoadedId) {
      lastLoadedId = store_get($$store_subs ??= {}, "$page", page).params.id;
      loadPage();
    }
    head("f77vpk", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Permissoes do usuario | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: userInfo?.nome || "Permissoes do usuario",
      subtitle: "Matriz completa de modulos, niveis e ativacao por usuario.",
      breadcrumbs: [
        { label: "Administracao", href: "/admin" },
        { label: "Permissoes", href: "/admin/permissoes" },
        { label: userInfo?.nome || "Detalhe" }
      ]
    });
    $$renderer2.push(`<!----> <div class="space-y-6">`);
    Card($$renderer2, {
      color: "financeiro",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="flex flex-wrap items-center gap-3">`);
        Badge($$renderer3, {
          color: "blue",
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->${escape_html(userInfo?.email || "Sem e-mail")}`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> `);
        Badge($$renderer3, {
          color: "yellow",
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->${escape_html(permissions.filter((item) => item.ativo).length)} modulos ativos`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> <!--[-->`);
    const each_array = ensure_array_like(sections);
    for (let $$index_2 = 0, $$length = each_array.length; $$index_2 < $$length; $$index_2++) {
      let section = each_array[$$index_2];
      Card($$renderer2, {
        color: "financeiro",
        title: section.titulo,
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="space-y-3"><!--[-->`);
          const each_array_1 = ensure_array_like(entriesForSection(section));
          for (let $$index_1 = 0, $$length2 = each_array_1.length; $$index_1 < $$length2; $$index_1++) {
            let entry = each_array_1[$$index_1];
            $$renderer3.push(`<div class="grid gap-3 rounded-xl border border-slate-200 p-4 lg:grid-cols-[minmax(0,1fr)_180px_100px]"><div><p class="font-medium text-slate-900">${escape_html(entry.label)}</p> <p class="text-xs text-slate-500">${escape_html(entry.modulo)}</p></div> <div><label class="mb-1 block text-sm font-medium text-slate-700"${attr("for", `perm-${entry.modulo}`)}>Nivel</label> `);
            $$renderer3.select(
              {
                id: `perm-${entry.modulo}`,
                value: entry.permissao,
                class: "vtur-input w-full",
                disabled: !entry.ativo
              },
              ($$renderer4) => {
                $$renderer4.push(`<!--[-->`);
                const each_array_2 = ensure_array_like(levels);
                for (let $$index = 0, $$length3 = each_array_2.length; $$index < $$length3; $$index++) {
                  let level = each_array_2[$$index];
                  $$renderer4.option({ value: level.value }, ($$renderer5) => {
                    $$renderer5.push(`${escape_html(level.label)}`);
                  });
                }
                $$renderer4.push(`<!--]-->`);
              }
            );
            $$renderer3.push(`</div> <label class="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 lg:self-end"><input type="checkbox"${attr("checked", entry.ativo, true)}/> <span class="text-sm text-slate-700">Ativo</span></label></div>`);
          }
          $$renderer3.push(`<!--]--></div>`);
        },
        $$slots: { default: true }
      });
    }
    $$renderer2.push(`<!--]--> <div class="flex flex-wrap gap-3">`);
    Button($$renderer2, {
      variant: "secondary",
      href: "/admin/permissoes",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->Voltar`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Button($$renderer2, {
      variant: "primary",
      color: "financeiro",
      loading: saving,
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->Salvar permissoes`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
