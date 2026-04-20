import { h as head, e as escape_html, t as ensure_array_like, q as attr, p as attr_class, v as stringify } from "../../../../../chunks/index2.js";
import { P as PageHeader, C as Chevron_right } from "../../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../../chunks/Card.js";
import { B as Button } from "../../../../../chunks/Button2.js";
import { D as Dialog } from "../../../../../chunks/Dialog.js";
import { t as toast } from "../../../../../chunks/ui.js";
import { R as Refresh_cw } from "../../../../../chunks/refresh-cw.js";
import { C as Chevron_left } from "../../../../../chunks/chevron-left.js";
import { C as Calendar } from "../../../../../chunks/calendar.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let diasDoMes, periodoLabel;
    const TIPO_OPCOES = [
      { value: "", label: "Sem registro" },
      { value: "TRABALHO", label: "Trabalho" },
      { value: "PLANTAO", label: "Plantão" },
      { value: "FOLGA", label: "Folga" },
      { value: "FERIAS", label: "Férias" },
      { value: "LICENCA", label: "Licença" },
      { value: "FERIADO", label: "Feriado" }
    ];
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
    let loading = true;
    let saving = false;
    let meses = [];
    let dias = [];
    let usuarios = [];
    let feriados = [];
    let mesAtualId = "";
    let modalOpen = false;
    let cellForm = { tipo: "", observacao: "" };
    const now = /* @__PURE__ */ new Date();
    let periodoAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    function buildMonthOptions() {
      const items = [];
      for (let i = -6; i <= 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
        items.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
      }
      return items;
    }
    buildMonthOptions();
    function getDaysInMonth(periodo) {
      const [year, month] = periodo.split("-").map(Number);
      const days = [];
      const daysCount = new Date(year, month, 0).getDate();
      for (let d = 1; d <= daysCount; d++) {
        const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const dow = (/* @__PURE__ */ new Date(date + "T00:00:00")).getDay();
        days.push({ date, dow, day: d });
      }
      return days;
    }
    function getDiaRegistro(usuarioId, data) {
      return dias.find((d) => d.usuario_id === usuarioId && d.data === data) || null;
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
        meses = payload.meses || [];
        dias = payload.dias || [];
        usuarios = payload.usuarios || [];
        feriados = payload.feriados || [];
        const mes = meses.find((m) => m.periodo.startsWith(periodoAtual));
        mesAtualId = mes?.id || "";
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar escalas.");
      } finally {
        loading = false;
      }
    }
    async function saveCell() {
      return;
    }
    diasDoMes = getDaysInMonth(periodoAtual);
    periodoLabel = (/* @__PURE__ */ new Date(periodoAtual + "-01T00:00:00")).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("16iy99x", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Escalas | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Escalas de Trabalho",
        subtitle: "Gerencie a escala mensal da equipe com tipos de dia, horários e feriados.",
        color: "financeiro",
        breadcrumbs: [
          { label: "Parâmetros", href: "/parametros" },
          { label: "Escalas" }
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
      $$renderer3.push(`<!----> `);
      Card($$renderer3, {
        color: "financeiro",
        class: "mb-6",
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="flex items-center justify-between gap-4">`);
          Button($$renderer4, {
            variant: "secondary",
            size: "sm",
            children: ($$renderer5) => {
              Chevron_left($$renderer5, { size: 16 });
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----> <div class="flex items-center gap-3">`);
          Calendar($$renderer4, { size: 18, class: "text-financeiro-600" });
          $$renderer4.push(`<!----> <span class="text-lg font-semibold text-slate-900 capitalize">${escape_html(periodoLabel)}</span></div> `);
          Button($$renderer4, {
            variant: "secondary",
            size: "sm",
            children: ($$renderer5) => {
              Chevron_right($$renderer5, { size: 16 });
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      if (loading) {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="flex items-center justify-center py-20 text-slate-500">Carregando escala...</div>`);
      } else if (usuarios.length === 0) {
        $$renderer3.push("<!--[1-->");
        Card($$renderer3, {
          color: "financeiro",
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="py-12 text-center text-slate-500">`);
            Calendar($$renderer4, { size: 48, class: "mx-auto mb-4 opacity-30" });
            $$renderer4.push(`<!----> <p>Nenhum usuário encontrado na equipe.</p></div>`);
          },
          $$slots: { default: true }
        });
      } else {
        $$renderer3.push("<!--[-1-->");
        Card($$renderer3, {
          color: "financeiro",
          padding: "none",
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="overflow-x-auto"><table class="min-w-full text-xs"><thead class="bg-slate-50 border-b border-slate-200"><tr><th class="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left font-semibold text-slate-700 min-w-[160px]">Colaborador</th><!--[-->`);
            const each_array = ensure_array_like(diasDoMes);
            for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
              let { date, dow, day } = each_array[$$index];
              $$renderer4.push(`<th${attr_class(`px-1 py-3 text-center font-medium min-w-[36px] ${stringify(dow === 0 || dow === 6 ? "text-red-500" : "text-slate-600")} ${stringify(isFeriado(date) ? "bg-red-50" : "")}`)}${attr("title", isFeriado(date)?.nome || "")}><div>${escape_html(day)}</div> <div class="text-[10px] opacity-60">${escape_html("DSTQQSS"[dow])}</div></th>`);
            }
            $$renderer4.push(`<!--]--></tr></thead><tbody class="divide-y divide-slate-100"><!--[-->`);
            const each_array_1 = ensure_array_like(usuarios);
            for (let $$index_2 = 0, $$length = each_array_1.length; $$index_2 < $$length; $$index_2++) {
              let usuario = each_array_1[$$index_2];
              $$renderer4.push(`<tr class="hover:bg-slate-50/50"><td class="sticky left-0 z-10 bg-white px-4 py-2 font-medium text-slate-900 border-r border-slate-100">${escape_html(usuario.nome_completo || usuario.email || "Usuário")}</td><!--[-->`);
              const each_array_2 = ensure_array_like(diasDoMes);
              for (let $$index_1 = 0, $$length2 = each_array_2.length; $$index_1 < $$length2; $$index_1++) {
                let { date, dow } = each_array_2[$$index_1];
                const registro = getDiaRegistro(usuario.id, date);
                const feriado = isFeriado(date);
                $$renderer4.push(`<td${attr_class(`px-0.5 py-1 text-center cursor-pointer hover:bg-financeiro-50 transition-colors ${stringify(dow === 0 || dow === 6 ? "bg-slate-50/50" : "")}`)}${attr("title", registro ? `${registro.tipo}${registro.hora_inicio ? " " + registro.hora_inicio + "-" + registro.hora_fim : ""}` : feriado?.nome || "")}>`);
                if (registro?.tipo) {
                  $$renderer4.push("<!--[0-->");
                  $$renderer4.push(`<span${attr_class(`inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold ${stringify(TIPO_COLOR[registro.tipo] || "bg-slate-100 text-slate-600")}`)}>${escape_html(TIPO_CODIGO[registro.tipo] || "?")}</span>`);
                } else if (feriado) {
                  $$renderer4.push("<!--[1-->");
                  $$renderer4.push(`<span class="inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold bg-red-100 text-red-600">H</span>`);
                } else {
                  $$renderer4.push("<!--[-1-->");
                  $$renderer4.push(`<span class="inline-flex h-6 w-6 items-center justify-center rounded text-[10px] text-slate-300">·</span>`);
                }
                $$renderer4.push(`<!--]--></td>`);
              }
              $$renderer4.push(`<!--]--></tr>`);
            }
            $$renderer4.push(`<!--]--></tbody></table></div> <div class="flex flex-wrap gap-3 px-4 py-3 border-t border-slate-100 text-xs text-slate-600"><!--[-->`);
            const each_array_3 = ensure_array_like(TIPO_OPCOES.filter((t) => t.value));
            for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
              let opt = each_array_3[$$index_3];
              $$renderer4.push(`<span class="inline-flex items-center gap-1"><span${attr_class(`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${stringify(TIPO_COLOR[opt.value] || "bg-slate-100")}`)}>${escape_html(TIPO_CODIGO[opt.value] || "?")}</span> ${escape_html(opt.label)}</span>`);
            }
            $$renderer4.push(`<!--]--></div>`);
          },
          $$slots: { default: true }
        });
      }
      $$renderer3.push(`<!--]--> `);
      Dialog($$renderer3, {
        title: "Escala",
        color: "financeiro",
        size: "sm",
        showCancel: true,
        cancelText: "Cancelar",
        showConfirm: true,
        confirmText: "Salvar",
        loading: saving,
        onConfirm: saveCell,
        onCancel: () => modalOpen = false,
        get open() {
          return modalOpen;
        },
        set open($$value) {
          modalOpen = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="space-y-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="esc-tipo">Tipo</label> `);
          $$renderer4.select(
            {
              id: "esc-tipo",
              value: cellForm.tipo,
              class: "vtur-input w-full"
            },
            ($$renderer5) => {
              $$renderer5.push(`<!--[-->`);
              const each_array_4 = ensure_array_like(TIPO_OPCOES);
              for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
                let opt = each_array_4[$$index_4];
                $$renderer5.option({ value: opt.value }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(opt.label)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            }
          );
          $$renderer4.push(`</div> `);
          {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]--> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="esc-obs">Observação</label> <input id="esc-obs"${attr("value", cellForm.observacao)} class="vtur-input w-full" placeholder="Opcional"/></div></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
  });
}
export {
  _page as default
};
