import { b as store_get, h as head, t as ensure_array_like, u as unsubscribe_stores, e as escape_html, q as attr } from "../../../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../../../chunks/exports.js";
import "../../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../../chunks/root.js";
import "../../../../../../chunks/state.svelte.js";
import { p as page } from "../../../../../../chunks/stores.js";
import { P as PageHeader } from "../../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../../chunks/Card.js";
import { B as Button } from "../../../../../../chunks/Button2.js";
import { t as toast } from "../../../../../../chunks/ui.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let isCreateMode;
    const emptyForm = { id: "", name: "", description: "" };
    let saving = false;
    let deleting = false;
    let form = { ...emptyForm };
    let users = [];
    let permissions = [];
    let levels = [
      { value: "none", label: "Nenhum" },
      { value: "view", label: "Ver" },
      { value: "create", label: "Criar" },
      { value: "edit", label: "Editar" },
      { value: "delete", label: "Excluir" },
      { value: "admin", label: "Admin" }
    ];
    let sections = [];
    let lastLoadedId = "";
    function entriesForSection(section) {
      return permissions.filter((entry) => section.modulos.includes(entry.label));
    }
    async function loadPage() {
      try {
        if (isCreateMode) {
          const permsResponse = await fetch("/api/v1/admin/permissoes");
          if (!permsResponse.ok) throw new Error(await permsResponse.text());
          const payload = await permsResponse.json();
          permissions = (payload.system_module_catalog || []).map((item) => ({
            label: item.label,
            modulo: item.key,
            permissao: "none",
            ativo: false
          }));
          sections = payload.sections || [];
          users = [];
          form = { ...emptyForm };
        } else {
          const [detailResponse, permsResponse] = await Promise.all([
            fetch(`/api/v1/admin/tipos-usuario/${store_get($$store_subs ??= {}, "$page", page).params.id}`),
            fetch(`/api/v1/admin/tipos-usuario/${store_get($$store_subs ??= {}, "$page", page).params.id}/permissoes`)
          ]);
          if (!detailResponse.ok) throw new Error(await detailResponse.text());
          if (!permsResponse.ok) throw new Error(await permsResponse.text());
          const [detailPayload, permsPayload] = await Promise.all([detailResponse.json(), permsResponse.json()]);
          form = {
            id: detailPayload.tipo.id,
            name: detailPayload.tipo.name,
            description: detailPayload.tipo.description || ""
          };
          users = detailPayload.usuarios || [];
          permissions = permsPayload.permissions || [];
          sections = permsPayload.sections || [];
        }
      } catch (err) {
        console.error(err);
        toast.error("Nao foi possivel carregar o tipo de usuario.");
      } finally {
      }
    }
    isCreateMode = store_get($$store_subs ??= {}, "$page", page).params.id === "novo";
    if (store_get($$store_subs ??= {}, "$page", page).params.id && store_get($$store_subs ??= {}, "$page", page).params.id !== lastLoadedId) {
      lastLoadedId = store_get($$store_subs ??= {}, "$page", page).params.id;
      loadPage();
    }
    head("cfturk", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(isCreateMode ? "Novo tipo de usuario" : form.name || "Tipo de usuario")} | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: isCreateMode ? "Novo tipo de usuario" : form.name || "Tipo de usuario",
      subtitle: "Definicao do cargo e da matriz default que sera aplicada aos novos usuarios.",
      breadcrumbs: [
        { label: "Administracao", href: "/admin" },
        { label: "Tipos de usuario", href: "/admin/tipos-usuario" },
        { label: isCreateMode ? "Novo" : form.name || "Detalhe" }
      ]
    });
    $$renderer2.push(`<!----> <div class="space-y-6">`);
    Card($$renderer2, {
      color: "financeiro",
      title: "Dados do perfil",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="grid gap-4 md:grid-cols-2"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="tipo-nome">Nome</label> <input id="tipo-nome"${attr("value", form.name)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="tipo-descricao">Descricao</label> <input id="tipo-descricao"${attr("value", form.description)} class="vtur-input w-full"/></div></div>`);
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
            $$renderer3.push(`<div class="grid gap-3 rounded-xl border border-slate-200 p-4 lg:grid-cols-[minmax(0,1fr)_180px_100px]"><div><p class="font-medium text-slate-900">${escape_html(entry.label)}</p> <p class="text-xs text-slate-500">${escape_html(entry.modulo)}</p></div> <div><label class="mb-1 block text-sm font-medium text-slate-700"${attr("for", `tipo-perm-${entry.modulo}`)}>Nivel</label> `);
            $$renderer3.select(
              {
                id: `tipo-perm-${entry.modulo}`,
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
    $$renderer2.push(`<!--]--> `);
    if (!isCreateMode) {
      $$renderer2.push("<!--[0-->");
      Card($$renderer2, {
        color: "financeiro",
        title: "Usuarios vinculados",
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="space-y-3"><!--[-->`);
          const each_array_3 = ensure_array_like(users);
          for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
            let user = each_array_3[$$index_3];
            $$renderer3.push(`<div class="rounded-xl border border-slate-200 p-3"><p class="font-medium text-slate-900">${escape_html(user.nome)}</p> <p class="text-sm text-slate-500">${escape_html(user.email || "-")}</p></div>`);
          }
          $$renderer3.push(`<!--]--> `);
          if (users.length === 0) {
            $$renderer3.push("<!--[0-->");
            $$renderer3.push(`<p class="text-sm text-slate-500">Nenhum usuario vinculado a este perfil.</p>`);
          } else {
            $$renderer3.push("<!--[-1-->");
          }
          $$renderer3.push(`<!--]--></div>`);
        },
        $$slots: { default: true }
      });
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="flex flex-wrap gap-3">`);
    Button($$renderer2, {
      variant: "secondary",
      href: "/admin/tipos-usuario",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->Voltar`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    if (!isCreateMode) {
      $$renderer2.push("<!--[0-->");
      Button($$renderer2, {
        variant: "danger",
        loading: deleting,
        children: ($$renderer3) => {
          $$renderer3.push(`<!---->Excluir tipo`);
        },
        $$slots: { default: true }
      });
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    Button($$renderer2, {
      variant: "primary",
      color: "financeiro",
      loading: saving,
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->Salvar tipo`);
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
