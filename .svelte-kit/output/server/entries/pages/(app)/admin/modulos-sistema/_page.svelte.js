import { h as head, e as escape_html, t as ensure_array_like, p as attr_class, v as stringify, q as attr } from "../../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { S as Settings } from "../../../../../chunks/settings.js";
import { C as Circle_check_big } from "../../../../../chunks/circle-check-big.js";
import { C as Circle_x } from "../../../../../chunks/circle-x.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let habilitados, desabilitados;
    let modulos = [];
    let loading = true;
    let savingKey = "";
    let tableMissing = false;
    async function load() {
      loading = true;
      try {
        const response = await fetch("/api/v1/admin/modulos-sistema");
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        tableMissing = Boolean(payload.table_missing);
        const catalog = payload.catalog || [];
        const disabled = new Set((payload.disabled || []).map((k) => k.toLowerCase()));
        modulos = catalog.map((item) => ({
          key: item.key,
          label: item.label,
          enabled: !disabled.has(item.key.toLowerCase()),
          reason: ""
        }));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar módulos.");
      } finally {
        loading = false;
      }
    }
    habilitados = modulos.filter((m) => m.enabled).length;
    desabilitados = modulos.filter((m) => !m.enabled).length;
    head("p5aw6s", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Módulos do Sistema | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Módulos do Sistema",
      subtitle: "Habilite ou desabilite módulos para controlar o acesso às funcionalidades.",
      breadcrumbs: [
        { label: "Admin", href: "/admin" },
        { label: "Módulos do Sistema" }
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
    if (tableMissing) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="mb-6 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">A tabela <code>system_module_settings</code> não existe neste ambiente. Os módulos são exibidos com base no catálogo padrão.</div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="vtur-kpi-grid vtur-kpi-grid-3 mb-6"><div class="vtur-kpi-card border-t-[3px] border-t-slate-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">`);
    Settings($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Total de módulos</p> <p class="text-2xl font-bold text-slate-900">${escape_html(modulos.length)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-green-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500">`);
    Circle_check_big($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Habilitados</p> <p class="text-2xl font-bold text-slate-900">${escape_html(habilitados)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-red-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500">`);
    Circle_x($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Desabilitados</p> <p class="text-2xl font-bold text-slate-900">${escape_html(desabilitados)}</p></div></div></div> `);
    if (loading) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="flex items-center justify-center py-20 text-slate-500">Carregando módulos...</div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"><!--[-->`);
      const each_array = ensure_array_like(modulos);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let modulo = each_array[$$index];
        $$renderer2.push(`<div class="vtur-card p-4 flex items-center justify-between gap-4"><div class="flex items-center gap-3"><div${attr_class(`rounded-lg p-2 ${stringify(modulo.enabled ? "bg-green-50" : "bg-slate-100")}`)}>`);
        Settings($$renderer2, {
          size: 18,
          class: modulo.enabled ? "text-green-600" : "text-slate-400"
        });
        $$renderer2.push(`<!----></div> <div><p class="font-medium text-slate-900">${escape_html(modulo.label)}</p> <p class="text-xs text-slate-500 font-mono">${escape_html(modulo.key)}</p></div></div> <button type="button"${attr_class(`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${stringify(modulo.enabled ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}`)}${attr("disabled", savingKey === modulo.key, true)}>`);
        if (modulo.enabled) {
          $$renderer2.push("<!--[0-->");
          Circle_check_big($$renderer2, { size: 14 });
          $$renderer2.push(`<!----> Ativo`);
        } else {
          $$renderer2.push("<!--[-1-->");
          Circle_x($$renderer2, { size: 14 });
          $$renderer2.push(`<!----> Inativo`);
        }
        $$renderer2.push(`<!--]--></button></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
