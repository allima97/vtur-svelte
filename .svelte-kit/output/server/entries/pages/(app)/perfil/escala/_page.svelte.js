import { h as head, e as escape_html, b as store_get, t as ensure_array_like, p as attr_class, v as stringify, u as unsubscribe_stores } from "../../../../../chunks/index2.js";
import { P as PageHeader, C as Chevron_right } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { a as auth } from "../../../../../chunks/auth.js";
import { C as Calendar } from "../../../../../chunks/calendar.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { C as Chevron_left } from "../../../../../chunks/chevron-left.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let diasDoMes, periodoLabel, diasTrabalhados, diasFolga;
    const TIPO_CODIGO = {
      TRABALHO: "T",
      PLANTAO: "P",
      FOLGA: "F",
      FERIAS: "X",
      LICENCA: "L",
      FERIADO: "H"
    };
    const TIPO_COLOR = {
      TRABALHO: "bg-green-100 text-green-700",
      PLANTAO: "bg-blue-100 text-blue-700",
      FOLGA: "bg-slate-100 text-slate-600",
      FERIAS: "bg-amber-100 text-amber-700",
      LICENCA: "bg-purple-100 text-purple-700",
      FERIADO: "bg-red-100 text-red-700"
    };
    const TIPO_LABEL = {
      TRABALHO: "Trabalho",
      PLANTAO: "Plantão",
      FOLGA: "Folga",
      FERIAS: "Férias",
      LICENCA: "Licença",
      FERIADO: "Feriado"
    };
    let loading = true;
    let dias = [];
    let feriados = [];
    const now = /* @__PURE__ */ new Date();
    let periodoAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    function getDaysInMonth(periodo) {
      const [year, month] = periodo.split("-").map(Number);
      const daysCount = new Date(year, month, 0).getDate();
      return Array.from({ length: daysCount }, (_, i) => {
        const d = i + 1;
        const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        return { date, dow: (/* @__PURE__ */ new Date(date + "T00:00:00")).getDay(), day: d };
      });
    }
    function getDia(data) {
      return dias.find((d) => d.data === data) || null;
    }
    function isFeriado(data) {
      return feriados.find((f) => f.data === data) || null;
    }
    async function load() {
      loading = true;
      try {
        const response = await fetch(`/api/v1/parametros/escalas?periodo=${periodoAtual}`);
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        const userId = store_get($$store_subs ??= {}, "$auth", auth).user?.id;
        dias = (payload.dias || []).filter((d) => d.usuario_id === userId);
        feriados = payload.feriados || [];
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar escala.");
      } finally {
        loading = false;
      }
    }
    diasDoMes = getDaysInMonth(periodoAtual);
    periodoLabel = (/* @__PURE__ */ new Date(periodoAtual + "-01T00:00:00")).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    diasTrabalhados = dias.filter((d) => d.tipo === "TRABALHO" || d.tipo === "PLANTAO").length;
    diasFolga = dias.filter((d) => d.tipo === "FOLGA" || d.tipo === "FERIAS" || d.tipo === "LICENCA").length;
    head("1a1b3ie", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Minha Escala | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Minha Escala",
      subtitle: "Visualize sua escala de trabalho mensal.",
      breadcrumbs: [
        { label: "Perfil", href: "/perfil" },
        { label: "Minha Escala" }
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
        $$renderer3.push(`<div class="flex items-center justify-between gap-4">`);
        Button($$renderer3, {
          variant: "secondary",
          size: "sm",
          children: ($$renderer4) => {
            Chevron_left($$renderer4, { size: 16 });
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> <div class="flex items-center gap-3">`);
        Calendar($$renderer3, { size: 18, class: "text-slate-500" });
        $$renderer3.push(`<!----> <span class="text-lg font-semibold text-slate-900 capitalize">${escape_html(periodoLabel)}</span></div> `);
        Button($$renderer3, {
          variant: "secondary",
          size: "sm",
          children: ($$renderer4) => {
            Chevron_right($$renderer4, { size: 16 });
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> <div class="vtur-kpi-grid mb-6"><div class="vtur-kpi-card border-t-[3px] border-t-green-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500">`);
    Calendar($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Dias trabalhados</p> <p class="text-2xl font-bold text-slate-900">${escape_html(diasTrabalhados)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-slate-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">`);
    Calendar($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Folgas / Ferias</p> <p class="text-2xl font-bold text-slate-900">${escape_html(diasFolga)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-red-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500">`);
    Calendar($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Feriados no mes</p> <p class="text-2xl font-bold text-slate-900">${escape_html(feriados.filter((f) => f.data.startsWith(periodoAtual)).length)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-slate-300"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">`);
    Calendar($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Sem registro</p> <p class="text-2xl font-bold text-slate-900">${escape_html(diasDoMes.length - diasTrabalhados - diasFolga)}</p></div></div></div> `);
    if (loading) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="flex items-center justify-center py-20 text-slate-500">Carregando escala...</div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      Card($$renderer2, {
        padding: "none",
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="overflow-x-auto"><table class="min-w-full text-sm"><thead class="bg-slate-50 border-b border-slate-200"><tr><th class="px-4 py-3 text-left font-semibold text-slate-600">Data</th><th class="px-4 py-3 text-left font-semibold text-slate-600">Dia</th><th class="px-4 py-3 text-left font-semibold text-slate-600">Tipo</th><th class="px-4 py-3 text-left font-semibold text-slate-600">Horário</th><th class="px-4 py-3 text-left font-semibold text-slate-600">Observação</th></tr></thead><tbody class="divide-y divide-slate-100"><!--[-->`);
          const each_array = ensure_array_like(diasDoMes);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let { date, dow, day } = each_array[$$index];
            const registro = getDia(date);
            const feriado = isFeriado(date);
            $$renderer3.push(`<tr${attr_class(`${stringify(dow === 0 || dow === 6 ? "bg-slate-50/50" : "")} ${stringify(feriado ? "bg-red-50/30" : "")}`)}><td class="px-4 py-2 text-slate-700">${escape_html((/* @__PURE__ */ new Date(date + "T00:00:00")).toLocaleDateString("pt-BR"))}</td><td class="px-4 py-2 text-slate-500 text-xs">${escape_html(["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][dow])} `);
            if (feriado) {
              $$renderer3.push("<!--[0-->");
              $$renderer3.push(`<span class="ml-1 text-red-500">(${escape_html(feriado.nome)})</span>`);
            } else {
              $$renderer3.push("<!--[-1-->");
            }
            $$renderer3.push(`<!--]--></td><td class="px-4 py-2">`);
            if (registro?.tipo) {
              $$renderer3.push("<!--[0-->");
              $$renderer3.push(`<span${attr_class(`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${stringify(TIPO_COLOR[registro.tipo] || "bg-slate-100 text-slate-600")}`)}>${escape_html(TIPO_LABEL[registro.tipo] || registro.tipo)}</span>`);
            } else if (feriado) {
              $$renderer3.push("<!--[1-->");
              $$renderer3.push(`<span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-600">Feriado</span>`);
            } else {
              $$renderer3.push("<!--[-1-->");
              $$renderer3.push(`<span class="text-slate-300 text-xs">—</span>`);
            }
            $$renderer3.push(`<!--]--></td><td class="px-4 py-2 text-slate-600 text-xs">`);
            if (registro?.hora_inicio && registro?.hora_fim) {
              $$renderer3.push("<!--[0-->");
              $$renderer3.push(`${escape_html(registro.hora_inicio.slice(0, 5))} – ${escape_html(registro.hora_fim.slice(0, 5))}`);
            } else {
              $$renderer3.push("<!--[-1-->");
              $$renderer3.push(`—`);
            }
            $$renderer3.push(`<!--]--></td><td class="px-4 py-2 text-slate-500 text-xs">${escape_html(registro?.observacao || "—")}</td></tr>`);
          }
          $$renderer3.push(`<!--]--></tbody></table></div> <div class="flex flex-wrap gap-3 px-4 py-3 border-t border-slate-100 text-xs text-slate-600"><!--[-->`);
          const each_array_1 = ensure_array_like(Object.entries(TIPO_LABEL));
          for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
            let [key, label] = each_array_1[$$index_1];
            $$renderer3.push(`<span class="inline-flex items-center gap-1"><span${attr_class(`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${stringify(TIPO_COLOR[key] || "bg-slate-100")}`)}>${escape_html(TIPO_CODIGO[key] || "?")}</span> ${escape_html(label)}</span>`);
          }
          $$renderer3.push(`<!--]--></div>`);
        },
        $$slots: { default: true }
      });
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
