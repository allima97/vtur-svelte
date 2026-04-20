import { b as store_get, h as head, e as escape_html, u as unsubscribe_stores, q as attr, t as ensure_array_like } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { p as permissoes } from "../../../../../chunks/permissoes.js";
import { U as Users } from "../../../../../chunks/users.js";
import { U as User_check, a as User_x } from "../../../../../chunks/user-x.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { S as Search } from "../../../../../chunks/search.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let canEdit, usuariosFiltrados, equipeAtual;
    let usuarios = [];
    let relacoes = [];
    let convites = [];
    let loading = true;
    let savingId = "";
    let busca = "";
    async function load() {
      loading = true;
      try {
        const response = await fetch("/api/v1/parametros/equipe");
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        usuarios = payload.usuarios || [];
        relacoes = payload.relacoes || [];
        convites = payload.convites || [];
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar equipe.");
      } finally {
        loading = false;
      }
    }
    function isNaEquipe(vendedorId) {
      return relacoes.some((r) => r.vendedor_id === vendedorId && r.ativo !== false);
    }
    function getTipoNome(usuario) {
      const tipo = usuario.user_types;
      if (!tipo) return "";
      return String(tipo.name || "");
    }
    canEdit = !store_get($$store_subs ??= {}, "$permissoes", permissoes).ready || store_get($$store_subs ??= {}, "$permissoes", permissoes).isSystemAdmin || permissoes.can("equipe", "edit") || permissoes.can("parametros", "edit");
    usuariosFiltrados = usuarios.filter((u) => {
      if (!busca.trim()) return true;
      const q = busca.toLowerCase();
      return String(u.nome_completo || "").toLowerCase().includes(q) || String(u.email || "").toLowerCase().includes(q);
    });
    equipeAtual = usuarios.filter((u) => isNaEquipe(u.id));
    head("1rk7pyo", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Equipe | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Gestão de Equipe",
      subtitle: "Gerencie os vendedores da sua equipe e visualize convites pendentes.",
      color: "financeiro",
      breadcrumbs: [
        { label: "Parâmetros", href: "/parametros" },
        { label: "Equipe" }
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
    $$renderer2.push(`<!----> <div class="vtur-kpi-grid vtur-kpi-grid-3 mb-6"><div class="vtur-kpi-card border-t-[3px] border-t-teal-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-500">`);
    Users($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Total de usuários</p> <p class="text-2xl font-bold text-slate-900">${escape_html(usuarios.length)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-green-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500">`);
    User_check($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Na equipe</p> <p class="text-2xl font-bold text-slate-900">${escape_html(equipeAtual.length)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-amber-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">`);
    User_x($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Convites pendentes</p> <p class="text-2xl font-bold text-slate-900">${escape_html(convites.filter((c) => c.status === "pending").length)}</p></div></div></div> `);
    Card($$renderer2, {
      title: "Usuários da empresa",
      color: "financeiro",
      class: "mb-6",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="mb-4"><div class="relative max-w-sm">`);
        Search($$renderer3, {
          size: 16,
          class: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        });
        $$renderer3.push(`<!----> <input${attr("value", busca)} class="vtur-input w-full pl-9" placeholder="Buscar por nome ou e-mail..."/></div></div> `);
        if (loading) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div class="py-8 text-center text-sm text-slate-500">Carregando...</div>`);
        } else if (usuariosFiltrados.length === 0) {
          $$renderer3.push("<!--[1-->");
          $$renderer3.push(`<div class="rounded-[14px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">Nenhum usuário encontrado.</div>`);
        } else {
          $$renderer3.push("<!--[-1-->");
          $$renderer3.push(`<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-slate-50"><tr><th class="px-4 py-3 text-left font-semibold text-slate-600">Nome</th><th class="px-4 py-3 text-left font-semibold text-slate-600">E-mail</th><th class="px-4 py-3 text-left font-semibold text-slate-600">Tipo</th><th class="px-4 py-3 text-center font-semibold text-slate-600">Na equipe</th>`);
          if (canEdit) {
            $$renderer3.push("<!--[0-->");
            $$renderer3.push(`<th class="px-4 py-3 text-center font-semibold text-slate-600">Ação</th>`);
          } else {
            $$renderer3.push("<!--[-1-->");
          }
          $$renderer3.push(`<!--]--></tr></thead><tbody class="divide-y divide-slate-200"><!--[-->`);
          const each_array = ensure_array_like(usuariosFiltrados);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let usuario = each_array[$$index];
            $$renderer3.push(`<tr class="hover:bg-slate-50"><td class="px-4 py-3 font-medium text-slate-900">${escape_html(usuario.nome_completo || "-")}</td><td class="px-4 py-3 text-slate-600">${escape_html(usuario.email || "-")}</td><td class="px-4 py-3 text-slate-600">${escape_html(getTipoNome(usuario) || "-")}</td><td class="px-4 py-3 text-center">`);
            if (isNaEquipe(usuario.id)) {
              $$renderer3.push("<!--[0-->");
              $$renderer3.push(`<span class="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">Sim</span>`);
            } else {
              $$renderer3.push("<!--[-1-->");
              $$renderer3.push(`<span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Não</span>`);
            }
            $$renderer3.push(`<!--]--></td>`);
            if (canEdit) {
              $$renderer3.push("<!--[0-->");
              $$renderer3.push(`<td class="px-4 py-3 text-center">`);
              Button($$renderer3, {
                variant: isNaEquipe(usuario.id) ? "secondary" : "primary",
                size: "sm",
                color: "financeiro",
                loading: savingId === usuario.id,
                children: ($$renderer4) => {
                  $$renderer4.push(`<!---->${escape_html(isNaEquipe(usuario.id) ? "Remover" : "Adicionar")}`);
                },
                $$slots: { default: true }
              });
              $$renderer3.push(`<!----></td>`);
            } else {
              $$renderer3.push("<!--[-1-->");
            }
            $$renderer3.push(`<!--]--></tr>`);
          }
          $$renderer3.push(`<!--]--></tbody></table></div>`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    if (convites.length > 0) {
      $$renderer2.push("<!--[0-->");
      Card($$renderer2, {
        title: "Convites pendentes",
        color: "financeiro",
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-slate-50"><tr><th class="px-4 py-3 text-left font-semibold text-slate-600">E-mail convidado</th><th class="px-4 py-3 text-left font-semibold text-slate-600">Convidado por</th><th class="px-4 py-3 text-left font-semibold text-slate-600">Status</th><th class="px-4 py-3 text-left font-semibold text-slate-600">Criado em</th><th class="px-4 py-3 text-left font-semibold text-slate-600">Expira em</th></tr></thead><tbody class="divide-y divide-slate-200"><!--[-->`);
          const each_array_1 = ensure_array_like(convites);
          for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
            let convite = each_array_1[$$index_1];
            $$renderer3.push(`<tr class="hover:bg-slate-50"><td class="px-4 py-3 text-slate-900">${escape_html(convite.invited_email)}</td><td class="px-4 py-3 text-slate-600">${escape_html(convite.invited_by_name || "-")}</td><td class="px-4 py-3"><span class="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">${escape_html(convite.status === "pending" ? "Pendente" : convite.status)}</span></td><td class="px-4 py-3 text-slate-600">${escape_html(new Date(convite.created_at).toLocaleDateString("pt-BR"))}</td><td class="px-4 py-3 text-slate-600">${escape_html(convite.expires_at ? new Date(convite.expires_at).toLocaleDateString("pt-BR") : "-")}</td></tr>`);
          }
          $$renderer3.push(`<!--]--></tbody></table></div>`);
        },
        $$slots: { default: true }
      });
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
