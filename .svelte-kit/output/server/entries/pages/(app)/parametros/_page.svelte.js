import { b as store_get, h as head, u as unsubscribe_stores, e as escape_html, q as attr, t as ensure_array_like } from "../../../../chunks/index2.js";
import { P as PageHeader } from "../../../../chunks/PageHeader.js";
import { C as Card } from "../../../../chunks/Card.js";
import { B as Button } from "../../../../chunks/Button2.js";
import { t as toast } from "../../../../chunks/ui.js";
import { p as permissoes } from "../../../../chunks/permissoes.js";
import { c as createDefaultConciliacaoBandRules, s as sanitizeConciliacaoTiers, n as normalizeConciliacaoTipo, a as sanitizeConciliacaoBandRules } from "../../../../chunks/conciliacao.js";
import { R as Refresh_cw } from "../../../../chunks/refresh-cw.js";
import { P as Percent } from "../../../../chunks/percent.js";
import { T as Trash_2 } from "../../../../chunks/trash-2.js";
import { S as Save } from "../../../../chunks/save.js";
import { S as Shield } from "../../../../chunks/shield.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let canEdit, readOnly, bloqueado, bloqueadoConciliacao, bandasAtivas;
    function createDefaultForm() {
      const base = {
        id: null,
        company_id: null,
        owner_user_id: null,
        owner_user_nome: null,
        usar_taxas_na_meta: false,
        foco_valor: "bruto",
        modo_corporativo: false,
        politica_cancelamento: "cancelar_venda",
        foco_faturamento: "bruto",
        conciliacao_sobrepoe_vendas: false,
        conciliacao_regra_ativa: false,
        conciliacao_tipo: "GERAL",
        conciliacao_meta_nao_atingida: null,
        conciliacao_meta_atingida: null,
        conciliacao_super_meta: null,
        conciliacao_tiers: [],
        conciliacao_faixas_loja: [],
        mfa_obrigatorio: false,
        exportacao_pdf: false,
        exportacao_excel: false
      };
      return {
        ...base,
        conciliacao_faixas_loja: createDefaultConciliacaoBandRules(base)
      };
    }
    function cloneTier(tier) {
      return { ...tier };
    }
    function cloneBand(band) {
      return { ...band, tiers: band.tiers.map(cloneTier) };
    }
    function hydrateForm(payload) {
      const base = { ...createDefaultForm(), ...payload || {} };
      const normalized = {
        ...base,
        foco_valor: base.foco_valor === "liquido" ? "liquido" : "bruto",
        foco_faturamento: base.foco_faturamento === "liquido" ? "liquido" : "bruto",
        politica_cancelamento: base.politica_cancelamento === "estornar_recibos" ? "estornar_recibos" : "cancelar_venda",
        conciliacao_tipo: normalizeConciliacaoTipo(base.conciliacao_tipo),
        conciliacao_tiers: sanitizeConciliacaoTiers(base.conciliacao_tiers),
        conciliacao_faixas_loja: [],
        usar_taxas_na_meta: Boolean(base.usar_taxas_na_meta),
        modo_corporativo: Boolean(base.modo_corporativo),
        conciliacao_sobrepoe_vendas: Boolean(base.conciliacao_sobrepoe_vendas),
        conciliacao_regra_ativa: Boolean(base.conciliacao_regra_ativa),
        mfa_obrigatorio: Boolean(base.mfa_obrigatorio),
        exportacao_pdf: Boolean(base.exportacao_pdf),
        exportacao_excel: Boolean(base.exportacao_excel)
      };
      normalized.conciliacao_faixas_loja = sanitizeConciliacaoBandRules(base.conciliacao_faixas_loja, normalized).map(cloneBand);
      return {
        ...normalized,
        conciliacao_tiers: normalized.conciliacao_tiers.map(cloneTier)
      };
    }
    function formatDateTime(value) {
      if (!value) return "Ainda nao salvo";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "Ainda nao salvo";
      return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(date);
    }
    let loading = true;
    let saving = false;
    let accessDenied = false;
    let form = createDefaultForm();
    let ultimaAtualizacao = null;
    let origemDados = "default";
    let ownerNome = null;
    async function loadPage() {
      loading = true;
      accessDenied = false;
      try {
        const response = await fetch("/api/v1/parametros/sistema");
        if (response.status === 403) {
          accessDenied = true;
          form = createDefaultForm();
          return;
        }
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        form = hydrateForm(payload.params);
        ultimaAtualizacao = payload.ultima_atualizacao || null;
        origemDados = payload.origem === "banco" ? "banco" : "default";
        ownerNome = payload.owner_nome || payload.params?.owner_user_nome || null;
      } catch (err) {
        console.error(err);
        toast.error("Nao foi possivel carregar os parametros do sistema.");
      } finally {
        loading = false;
      }
    }
    canEdit = !store_get($$store_subs ??= {}, "$permissoes", permissoes).ready || store_get($$store_subs ??= {}, "$permissoes", permissoes).isSystemAdmin || store_get($$store_subs ??= {}, "$permissoes", permissoes).isMaster || permissoes.can("parametros", "edit") || permissoes.can("admin", "edit") || permissoes.can("admin_financeiro", "edit");
    readOnly = !canEdit;
    bloqueado = loading || saving || accessDenied || readOnly;
    bloqueadoConciliacao = bloqueado || !form.conciliacao_regra_ativa;
    bandasAtivas = form.conciliacao_faixas_loja.filter((item) => item.ativo).length;
    head("48sigo", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Parametros do Sistema | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Parametros do Sistema",
      subtitle: "Metas, seguranca, conciliacao e regras operacionais alinhadas ao fluxo administrativo do vtur-app.",
      color: "financeiro",
      breadcrumbs: [{ label: "Parametros" }],
      actions: [
        {
          label: "Atualizar",
          onClick: loadPage,
          variant: "secondary",
          icon: Refresh_cw
        }
      ]
    });
    $$renderer2.push(`<!----> `);
    if (accessDenied) {
      $$renderer2.push("<!--[0-->");
      Card($$renderer2, {
        color: "financeiro",
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="flex items-start gap-3">`);
          Shield($$renderer3, { size: 22, class: "mt-0.5 text-amber-600" });
          $$renderer3.push(`<!----> <div class="space-y-1"><p class="font-semibold text-slate-900">Acesso restrito</p> <p class="text-sm text-slate-600">Seu perfil nao possui acesso a este conjunto de parametros. As regras
          de leitura e edicao continuam sendo validadas pela API conforme o
          escopo do usuario.</p></div></div>`);
        },
        $$slots: { default: true }
      });
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="space-y-6">`);
      Card($$renderer2, {
        color: "financeiro",
        title: "Resumo da configuracao",
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5"><div class="rounded-xl border border-slate-200 bg-slate-50 p-4"><p class="text-xs font-medium uppercase tracking-wide text-slate-500">Ultima atualizacao</p> <p class="mt-2 text-sm font-semibold text-slate-900">${escape_html(formatDateTime(ultimaAtualizacao))}</p></div> <div class="rounded-xl border border-slate-200 bg-slate-50 p-4"><p class="text-xs font-medium uppercase tracking-wide text-slate-500">Origem</p> <p class="mt-2 text-sm font-semibold text-slate-900">${escape_html(origemDados === "banco" ? "Banco de dados" : "Valores padrao")}</p></div> <div class="rounded-xl border border-slate-200 bg-slate-50 p-4"><p class="text-xs font-medium uppercase tracking-wide text-slate-500">Ultima edicao por</p> <p class="mt-2 text-sm font-semibold text-slate-900">${escape_html(ownerNome || "Sem registro")}</p></div> <div class="rounded-xl border border-slate-200 bg-slate-50 p-4"><p class="text-xs font-medium uppercase tracking-wide text-slate-500">Regra de conciliacao</p> <p class="mt-2 text-sm font-semibold text-slate-900">${escape_html(form.conciliacao_regra_ativa ? form.conciliacao_tipo === "ESCALONAVEL" ? "Escalonavel" : "Geral" : "Desativada")}</p></div> <div class="rounded-xl border border-slate-200 bg-slate-50 p-4"><p class="text-xs font-medium uppercase tracking-wide text-slate-500">Faixas ativas</p> <p class="mt-2 text-sm font-semibold text-slate-900">${escape_html(bandasAtivas)}</p></div></div> `);
          if (readOnly) {
            $$renderer3.push("<!--[0-->");
            $$renderer3.push(`<div class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Seu perfil esta em modo de consulta. A API continua protegendo o
          escopo e as edicoes administrativas.</div>`);
          } else {
            $$renderer3.push("<!--[-1-->");
          }
          $$renderer3.push(`<!--]-->`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----> <div class="grid gap-6 xl:grid-cols-3">`);
      Card($$renderer2, {
        color: "financeiro",
        title: "Metas e faturamento",
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="space-y-4"><label class="flex items-start gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox"${attr("checked", form.usar_taxas_na_meta, true)}${attr("disabled", bloqueado, true)}/> <div><p class="font-medium text-slate-900">Meta considera taxas</p> <p class="text-sm text-slate-500">Inclui taxas no calculo da meta geral e no resumo operacional da
                equipe.</p></div></label> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="foco-valores">Foco das metas</label> `);
          $$renderer3.select(
            {
              id: "foco-valores",
              class: "vtur-input w-full",
              value: form.foco_valor,
              disabled: bloqueado
            },
            ($$renderer4) => {
              $$renderer4.option({ value: "bruto" }, ($$renderer5) => {
                $$renderer5.push(`Valor bruto`);
              });
              $$renderer4.option({ value: "liquido" }, ($$renderer5) => {
                $$renderer5.push(`Valor liquido`);
              });
            }
          );
          $$renderer3.push(`</div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="foco-faturamento">Foco de faturamento</label> `);
          $$renderer3.select(
            {
              id: "foco-faturamento",
              class: "vtur-input w-full",
              value: form.foco_faturamento,
              disabled: bloqueado
            },
            ($$renderer4) => {
              $$renderer4.option({ value: "bruto" }, ($$renderer5) => {
                $$renderer5.push(`Valor bruto`);
              });
              $$renderer4.option({ value: "liquido" }, ($$renderer5) => {
                $$renderer5.push(`Valor liquido`);
              });
            }
          );
          $$renderer3.push(`</div></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----> `);
      Card($$renderer2, {
        color: "financeiro",
        title: "Operacao da empresa",
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="space-y-4"><label class="flex items-start gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox"${attr("checked", form.modo_corporativo, true)}${attr("disabled", bloqueado, true)}/> <div><p class="font-medium text-slate-900">Modo corporativo</p> <p class="text-sm text-slate-500">Ativa controles multiempresa e comportamentos extras para
                estruturas corporativas.</p></div></label> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="politica-cancelamento">Politica de cancelamento</label> `);
          $$renderer3.select(
            {
              id: "politica-cancelamento",
              class: "vtur-input w-full",
              value: form.politica_cancelamento,
              disabled: bloqueado
            },
            ($$renderer4) => {
              $$renderer4.option({ value: "cancelar_venda" }, ($$renderer5) => {
                $$renderer5.push(`Cancelar venda (exclui venda)`);
              });
              $$renderer4.option({ value: "estornar_recibos" }, ($$renderer5) => {
                $$renderer5.push(`Estornar recibos (manter venda)`);
              });
            }
          );
          $$renderer3.push(` <p class="mt-1 text-xs text-slate-500">Define o comportamento padrao do sistema ao cancelar uma venda.</p></div></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----> `);
      Card($$renderer2, {
        color: "financeiro",
        title: "Seguranca e exportacoes",
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="space-y-4"><label class="flex items-start gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox"${attr("checked", form.mfa_obrigatorio, true)}${attr("disabled", bloqueado, true)}/> <div><p class="font-medium text-slate-900">Exigir verificacao em duas etapas (2FA)</p> <p class="text-sm text-slate-500">Usuarios sem autenticador configurado precisam regularizar o
                acesso antes de entrar nos modulos.</p></div></label> <label class="flex items-start gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox"${attr("checked", form.exportacao_pdf, true)}${attr("disabled", bloqueado, true)}/> <div><p class="font-medium text-slate-900">Exportacao em PDF</p> <p class="text-sm text-slate-500">Libera relatorios e documentos administrativos em PDF.</p></div></label> <label class="flex items-start gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox"${attr("checked", form.exportacao_excel, true)}${attr("disabled", bloqueado, true)}/> <div><p class="font-medium text-slate-900">Exportacao em Excel</p> <p class="text-sm text-slate-500">Mantem exportacao tabular ativa para relatorios, conciliacao e
                operacao administrativa.</p></div></label></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----></div> `);
      Card($$renderer2, {
        color: "financeiro",
        title: "Conciliacao e comissionamento",
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="space-y-6"><div class="grid gap-4 xl:grid-cols-2"><label class="flex items-start gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox"${attr("checked", form.conciliacao_sobrepoe_vendas, true)}${attr("disabled", bloqueado, true)}/> <div><p class="font-medium text-slate-900">Conciliacao como fonte principal</p> <p class="text-sm text-slate-500">Faz a movimentacao conciliada prevalecer sobre a venda lancada
                manualmente.</p></div></label> <label class="flex items-start gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox"${attr("checked", form.conciliacao_regra_ativa, true)}${attr("disabled", bloqueado, true)}/> <div><p class="font-medium text-slate-900">Regra propria de comissao</p> <p class="text-sm text-slate-500">Coloca a regra de conciliacao antes do template geral e das
                regras por produto.</p></div></label></div> <div class="grid gap-4 xl:grid-cols-4"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="conciliacao-tipo">Tipo da regra</label> `);
          $$renderer3.select(
            {
              id: "conciliacao-tipo",
              class: "vtur-input w-full",
              value: form.conciliacao_tipo,
              disabled: bloqueadoConciliacao
            },
            ($$renderer4) => {
              $$renderer4.option({ value: "GERAL" }, ($$renderer5) => {
                $$renderer5.push(`Geral (percentuais fixos)`);
              });
              $$renderer4.option({ value: "ESCALONAVEL" }, ($$renderer5) => {
                $$renderer5.push(`Escalonavel (faixas)`);
              });
            }
          );
          $$renderer3.push(`</div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="conciliacao-nao-batida">% Concil. meta nao batida</label> <input id="conciliacao-nao-batida" type="number" step="0.01"${attr("value", form.conciliacao_meta_nao_atingida ?? "")} class="vtur-input w-full"${attr("disabled", bloqueadoConciliacao, true)}/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="conciliacao-batida">% Concil. meta batida</label> <input id="conciliacao-batida" type="number" step="0.01"${attr("value", form.conciliacao_meta_atingida ?? "")} class="vtur-input w-full"${attr("disabled", bloqueadoConciliacao, true)}/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="conciliacao-super-meta">% Concil. super meta</label> <input id="conciliacao-super-meta" type="number" step="0.01"${attr("value", form.conciliacao_super_meta ?? "")} class="vtur-input w-full"${attr("disabled", bloqueadoConciliacao, true)}/></div></div> <p class="text-sm text-slate-500">Quando ativa, essa regra entra antes do template geral e das regras
          por produto para recibos conciliados.</p> `);
          if (form.conciliacao_regra_ativa && form.conciliacao_tipo === "ESCALONAVEL") {
            $$renderer3.push("<!--[0-->");
            $$renderer3.push(`<div class="rounded-[18px] border border-orange-200 bg-orange-50/40 p-4"><div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div class="flex items-center gap-2">`);
            Percent($$renderer3, { size: 18, class: "text-orange-600" });
            $$renderer3.push(`<!----> <h3 class="text-base font-semibold text-slate-900">Faixas escalonaveis da conciliacao</h3></div> <p class="text-sm text-slate-500">Reaproveita a logica do legado com faixas PRE e POS para
                  incremento por meta e comissao.</p></div> <div class="flex flex-wrap gap-2">`);
            Button($$renderer3, {
              type: "button",
              size: "sm",
              variant: "secondary",
              disabled: bloqueado,
              children: ($$renderer4) => {
                $$renderer4.push(`<!---->+ Faixa PRE`);
              },
              $$slots: { default: true }
            });
            $$renderer3.push(`<!----> `);
            Button($$renderer3, {
              type: "button",
              size: "sm",
              variant: "primary",
              color: "financeiro",
              disabled: bloqueado,
              children: ($$renderer4) => {
                $$renderer4.push(`<!---->+ Faixa POS`);
              },
              $$slots: { default: true }
            });
            $$renderer3.push(`<!----></div></div> `);
            if (form.conciliacao_tiers.length === 0) {
              $$renderer3.push("<!--[0-->");
              $$renderer3.push(`<div class="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">Nenhuma faixa escalonavel cadastrada.</div>`);
            } else {
              $$renderer3.push("<!--[-1-->");
              $$renderer3.push(`<div class="overflow-x-auto"><table class="min-w-full divide-y divide-slate-200 text-sm"><thead class="bg-white/80"><tr class="text-left text-slate-600"><th class="px-3 py-2 font-medium">Faixa</th><th class="px-3 py-2 font-medium">De (%)</th><th class="px-3 py-2 font-medium">Ate (%)</th><th class="px-3 py-2 font-medium">Inc. Meta (%)</th><th class="px-3 py-2 font-medium">Inc. Comissao (%)</th><th class="px-3 py-2 text-right font-medium">Acoes</th></tr></thead><tbody class="divide-y divide-slate-200 bg-white"><!--[-->`);
              const each_array = ensure_array_like(form.conciliacao_tiers);
              for (let index = 0, $$length = each_array.length; index < $$length; index++) {
                let tier = each_array[index];
                $$renderer3.push(`<tr><td class="px-3 py-2">`);
                $$renderer3.select(
                  {
                    class: "vtur-input min-w-[110px]",
                    value: tier.faixa,
                    disabled: bloqueado
                  },
                  ($$renderer4) => {
                    $$renderer4.option({ value: "PRE" }, ($$renderer5) => {
                      $$renderer5.push(`PRE`);
                    });
                    $$renderer4.option({ value: "POS" }, ($$renderer5) => {
                      $$renderer5.push(`POS`);
                    });
                  }
                );
                $$renderer3.push(`</td><td class="px-3 py-2"><input type="number" step="0.01"${attr("value", tier.de_pct)} class="vtur-input min-w-[120px]"${attr("disabled", bloqueado, true)}/></td><td class="px-3 py-2"><input type="number" step="0.01"${attr("value", tier.ate_pct)} class="vtur-input min-w-[120px]"${attr("disabled", bloqueado, true)}/></td><td class="px-3 py-2"><input type="number" step="0.01"${attr("value", tier.inc_pct_meta)} class="vtur-input min-w-[140px]"${attr("disabled", bloqueado, true)}/></td><td class="px-3 py-2"><input type="number" step="0.01"${attr("value", tier.inc_pct_comissao)} class="vtur-input min-w-[160px]"${attr("disabled", bloqueado, true)}/></td><td class="px-3 py-2 text-right">`);
                Button($$renderer3, {
                  type: "button",
                  size: "sm",
                  variant: "danger",
                  disabled: bloqueado,
                  children: ($$renderer4) => {
                    $$renderer4.push(`<!---->Remover`);
                  },
                  $$slots: { default: true }
                });
                $$renderer3.push(`<!----></td></tr>`);
              }
              $$renderer3.push(`<!--]--></tbody></table></div>`);
            }
            $$renderer3.push(`<!--]--></div>`);
          } else {
            $$renderer3.push("<!--[-1-->");
          }
          $$renderer3.push(`<!--]--> <div class="rounded-[18px] border border-slate-200 bg-slate-50/60 p-4"><div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 class="text-base font-semibold text-slate-900">Faixas de comissionamento da loja</h3> <p class="text-sm text-slate-500">Define como a regra de conciliacao deve ser aplicada conforme a
                % de comissao da loja em cada recibo.</p></div> `);
          Button($$renderer3, {
            type: "button",
            variant: "primary",
            color: "financeiro",
            disabled: bloqueado,
            children: ($$renderer4) => {
              $$renderer4.push(`<!---->+ Nova faixa`);
            },
            $$slots: { default: true }
          });
          $$renderer3.push(`<!----></div> <div class="space-y-4"><!--[-->`);
          const each_array_1 = ensure_array_like(form.conciliacao_faixas_loja);
          for (let bandIndex = 0, $$length = each_array_1.length; bandIndex < $$length; bandIndex++) {
            let band = each_array_1[bandIndex];
            $$renderer3.push(`<div class="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm"><div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p class="text-base font-semibold text-slate-900">${escape_html(band.nome || `Faixa ${bandIndex + 1}`)}</p> <p class="text-sm text-slate-500">Faixa da loja entre <span class="font-medium text-slate-700">${escape_html(band.percentual_min == null ? " sem minimo" : ` ${band.percentual_min}%`)}</span> e <span class="font-medium text-slate-700">${escape_html(band.percentual_max == null ? " sem maximo" : ` ${band.percentual_max}%`)}</span> .</p></div> `);
            Button($$renderer3, {
              type: "button",
              variant: "danger",
              size: "sm",
              disabled: bloqueado || form.conciliacao_faixas_loja.length <= 1,
              children: ($$renderer4) => {
                Trash_2($$renderer4, { size: 16, class: "mr-1" });
                $$renderer4.push(`<!----> Excluir faixa`);
              },
              $$slots: { default: true }
            });
            $$renderer3.push(`<!----></div> <div class="grid gap-4 xl:grid-cols-4"><div><label class="mb-1 block text-sm font-medium text-slate-700"${attr("for", `band-name-${bandIndex}`)}>Nome da faixa</label> <input${attr("id", `band-name-${bandIndex}`)} class="vtur-input w-full"${attr("value", band.nome)}${attr("disabled", bloqueado, true)}/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700"${attr("for", `band-min-${bandIndex}`)}>% minimo</label> <input${attr("id", `band-min-${bandIndex}`)} type="number" step="0.01"${attr("value", band.percentual_min ?? "")} class="vtur-input w-full"${attr("disabled", bloqueado, true)}/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700"${attr("for", `band-max-${bandIndex}`)}>% maximo</label> <input${attr("id", `band-max-${bandIndex}`)} type="number" step="0.01"${attr("value", band.percentual_max ?? "")} class="vtur-input w-full"${attr("disabled", bloqueado, true)}/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700"${attr("for", `band-base-${bandIndex}`)}>Base do pagamento</label> `);
            $$renderer3.select(
              {
                id: `band-base-${bandIndex}`,
                class: "vtur-input w-full",
                value: band.tipo_calculo,
                disabled: bloqueadoConciliacao
              },
              ($$renderer4) => {
                $$renderer4.option({ value: "CONCILIACAO" }, ($$renderer5) => {
                  $$renderer5.push(`Regra da conciliacao`);
                });
                $$renderer4.option({ value: "PRODUTO_DIFERENCIADO" }, ($$renderer5) => {
                  $$renderer5.push(`Produto diferenciado`);
                });
              }
            );
            $$renderer3.push(`</div></div> <label class="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox"${attr("checked", band.ativo, true)}${attr("disabled", bloqueadoConciliacao, true)}/> <div><p class="font-medium text-slate-900">Faixa ativa</p> <p class="text-sm text-slate-500">Quando ativa, essa faixa entra no calculo dos recibos
                      conciliados.</p></div></label> `);
            if (band.tipo_calculo === "CONCILIACAO") {
              $$renderer3.push("<!--[0-->");
              $$renderer3.push(`<div class="mt-4 grid gap-4 xl:grid-cols-4"><div><label class="mb-1 block text-sm font-medium text-slate-700"${attr("for", `band-type-${bandIndex}`)}>Tipo da regra</label> `);
              $$renderer3.select(
                {
                  id: `band-type-${bandIndex}`,
                  class: "vtur-input w-full",
                  value: band.tipo,
                  disabled: bloqueadoConciliacao || !band.ativo
                },
                ($$renderer4) => {
                  $$renderer4.option({ value: "GERAL" }, ($$renderer5) => {
                    $$renderer5.push(`Geral (percentuais fixos)`);
                  });
                  $$renderer4.option({ value: "ESCALONAVEL" }, ($$renderer5) => {
                    $$renderer5.push(`Escalonavel (faixas)`);
                  });
                }
              );
              $$renderer3.push(`</div> <div><label class="mb-1 block text-sm font-medium text-slate-700"${attr("for", `band-nao-${bandIndex}`)}>% Meta nao batida</label> <input${attr("id", `band-nao-${bandIndex}`)} type="number" step="0.01"${attr("value", band.meta_nao_atingida ?? "")} class="vtur-input w-full"${attr("disabled", bloqueadoConciliacao || !band.ativo, true)}/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700"${attr("for", `band-sim-${bandIndex}`)}>% Meta batida</label> <input${attr("id", `band-sim-${bandIndex}`)} type="number" step="0.01"${attr("value", band.meta_atingida ?? "")} class="vtur-input w-full"${attr("disabled", bloqueadoConciliacao || !band.ativo, true)}/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700"${attr("for", `band-super-${bandIndex}`)}>% Super meta</label> <input${attr("id", `band-super-${bandIndex}`)} type="number" step="0.01"${attr("value", band.super_meta ?? "")} class="vtur-input w-full"${attr("disabled", bloqueadoConciliacao || !band.ativo, true)}/></div></div> <p class="mt-3 text-sm text-slate-500">Use produto diferenciado somente quando esta faixa precisa
                    obedecer as regras especificas ja cadastradas para produtos
                    especiais.</p> `);
              if (band.tipo === "ESCALONAVEL") {
                $$renderer3.push("<!--[0-->");
                $$renderer3.push(`<div class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p class="font-medium text-slate-900">Faixas escalonaveis desta banda</p> <p class="text-sm text-slate-500">Monte o comportamento PRE/POS que sera aplicado so
                            para esta faixa da loja.</p></div> <div class="flex flex-wrap gap-2">`);
                Button($$renderer3, {
                  type: "button",
                  size: "sm",
                  variant: "secondary",
                  disabled: bloqueadoConciliacao || !band.ativo,
                  children: ($$renderer4) => {
                    $$renderer4.push(`<!---->+ Faixa PRE`);
                  },
                  $$slots: { default: true }
                });
                $$renderer3.push(`<!----> `);
                Button($$renderer3, {
                  type: "button",
                  size: "sm",
                  variant: "primary",
                  color: "financeiro",
                  disabled: bloqueadoConciliacao || !band.ativo,
                  children: ($$renderer4) => {
                    $$renderer4.push(`<!---->+ Faixa POS`);
                  },
                  $$slots: { default: true }
                });
                $$renderer3.push(`<!----></div></div> `);
                if (band.tiers.length === 0) {
                  $$renderer3.push("<!--[0-->");
                  $$renderer3.push(`<div class="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">Nenhuma faixa escalonavel cadastrada para esta banda.</div>`);
                } else {
                  $$renderer3.push("<!--[-1-->");
                  $$renderer3.push(`<div class="overflow-x-auto"><table class="min-w-full divide-y divide-slate-200 text-sm"><thead class="bg-white/80"><tr class="text-left text-slate-600"><th class="px-3 py-2 font-medium">Faixa</th><th class="px-3 py-2 font-medium">De (%)</th><th class="px-3 py-2 font-medium">Ate (%)</th><th class="px-3 py-2 font-medium">Inc. Meta (%)</th><th class="px-3 py-2 font-medium">Inc. Comissao (%)</th><th class="px-3 py-2 text-right font-medium">Acoes</th></tr></thead><tbody class="divide-y divide-slate-200 bg-white"><!--[-->`);
                  const each_array_2 = ensure_array_like(band.tiers);
                  for (let tierIndex = 0, $$length2 = each_array_2.length; tierIndex < $$length2; tierIndex++) {
                    let tier = each_array_2[tierIndex];
                    $$renderer3.push(`<tr><td class="px-3 py-2">`);
                    $$renderer3.select(
                      {
                        class: "vtur-input min-w-[110px]",
                        value: tier.faixa,
                        disabled: bloqueadoConciliacao || !band.ativo
                      },
                      ($$renderer4) => {
                        $$renderer4.option({ value: "PRE" }, ($$renderer5) => {
                          $$renderer5.push(`PRE`);
                        });
                        $$renderer4.option({ value: "POS" }, ($$renderer5) => {
                          $$renderer5.push(`POS`);
                        });
                      }
                    );
                    $$renderer3.push(`</td><td class="px-3 py-2"><input type="number" step="0.01"${attr("value", tier.de_pct)} class="vtur-input min-w-[120px]"${attr("disabled", bloqueadoConciliacao || !band.ativo, true)}/></td><td class="px-3 py-2"><input type="number" step="0.01"${attr("value", tier.ate_pct)} class="vtur-input min-w-[120px]"${attr("disabled", bloqueadoConciliacao || !band.ativo, true)}/></td><td class="px-3 py-2"><input type="number" step="0.01"${attr("value", tier.inc_pct_meta)} class="vtur-input min-w-[140px]"${attr("disabled", bloqueadoConciliacao || !band.ativo, true)}/></td><td class="px-3 py-2"><input type="number" step="0.01"${attr("value", tier.inc_pct_comissao)} class="vtur-input min-w-[160px]"${attr("disabled", bloqueadoConciliacao || !band.ativo, true)}/></td><td class="px-3 py-2 text-right">`);
                    Button($$renderer3, {
                      type: "button",
                      size: "sm",
                      variant: "danger",
                      disabled: bloqueadoConciliacao || !band.ativo,
                      children: ($$renderer4) => {
                        $$renderer4.push(`<!---->Remover`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer3.push(`<!----></td></tr>`);
                  }
                  $$renderer3.push(`<!--]--></tbody></table></div>`);
                }
                $$renderer3.push(`<!--]--></div>`);
              } else {
                $$renderer3.push("<!--[-1-->");
              }
              $$renderer3.push(`<!--]-->`);
            } else {
              $$renderer3.push("<!--[-1-->");
              $$renderer3.push(`<div class="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">Esta faixa usara as regras de produto diferenciado ja
                    cadastradas no sistema.</div>`);
            }
            $$renderer3.push(`<!--]--></div>`);
          }
          $$renderer3.push(`<!--]--></div></div></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----> `);
      Card($$renderer2, {
        color: "financeiro",
        title: "Acoes",
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><p class="text-sm text-slate-600">Revise cada bloco antes de salvar para manter metas, seguranca e
          conciliacao consistentes para toda a empresa.</p> <div class="flex flex-wrap gap-3">`);
          Button($$renderer3, {
            variant: "secondary",
            disabled: saving,
            children: ($$renderer4) => {
              Refresh_cw($$renderer4, { size: 16, class: "mr-2" });
              $$renderer4.push(`<!----> Recarregar`);
            },
            $$slots: { default: true }
          });
          $$renderer3.push(`<!----> `);
          Button($$renderer3, {
            variant: "primary",
            color: "financeiro",
            loading: saving,
            disabled: bloqueado,
            children: ($$renderer4) => {
              Save($$renderer4, { size: 16, class: "mr-2" });
              $$renderer4.push(`<!----> Salvar parametros`);
            },
            $$slots: { default: true }
          });
          $$renderer3.push(`<!----></div></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----></div>`);
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
