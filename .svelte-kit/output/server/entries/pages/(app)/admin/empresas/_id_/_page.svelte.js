import { b as store_get, h as head, u as unsubscribe_stores, e as escape_html, q as attr, t as ensure_array_like } from "../../../../../../chunks/index2.js";
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
    const emptyForm = {
      id: "",
      nome_empresa: "",
      nome_fantasia: "",
      cnpj: "",
      telefone: "",
      endereco: "",
      cidade: "",
      estado: "",
      active: true,
      billing_status: "active",
      billing_plan_id: "",
      billing_valor_mensal: "",
      billing_ultimo_pagamento: "",
      billing_proximo_vencimento: ""
    };
    let saving = false;
    let linkSaving = false;
    let form = { ...emptyForm };
    let plans = [];
    let masterLinks = [];
    let mastersDisponiveis = [];
    let newLink = { master_id: "", status: "approved" };
    let lastLoadedId = "";
    async function loadPage() {
      try {
        if (isCreateMode) {
          form = { ...emptyForm };
          plans = [];
          masterLinks = [];
          mastersDisponiveis = [];
        } else {
          const response = await fetch(`/api/v1/admin/empresas/${store_get($$store_subs ??= {}, "$page", page).params.id}`);
          if (!response.ok) throw new Error(await response.text());
          const payload = await response.json();
          form = {
            id: payload.empresa.id,
            nome_empresa: payload.empresa.nome_empresa || "",
            nome_fantasia: payload.empresa.nome_fantasia || "",
            cnpj: payload.empresa.cnpj || "",
            telefone: payload.empresa.telefone || "",
            endereco: payload.empresa.endereco || "",
            cidade: payload.empresa.cidade || "",
            estado: payload.empresa.estado || "",
            active: payload.empresa.active !== false,
            billing_status: payload.billing?.status || "active",
            billing_plan_id: payload.billing?.plan_id || "",
            billing_valor_mensal: payload.billing?.valor_mensal == null ? "" : String(payload.billing.valor_mensal),
            billing_ultimo_pagamento: payload.billing?.ultimo_pagamento || "",
            billing_proximo_vencimento: payload.billing?.proximo_vencimento || ""
          };
          plans = payload.plans || [];
          masterLinks = payload.master_links || [];
          mastersDisponiveis = payload.masters_disponiveis || [];
        }
      } catch (err) {
        console.error(err);
        toast.error("Nao foi possivel carregar a empresa.");
      } finally {
      }
    }
    isCreateMode = store_get($$store_subs ??= {}, "$page", page).params.id === "nova";
    if (store_get($$store_subs ??= {}, "$page", page).params.id && store_get($$store_subs ??= {}, "$page", page).params.id !== lastLoadedId) {
      lastLoadedId = store_get($$store_subs ??= {}, "$page", page).params.id;
      loadPage();
    }
    head("i9ep90", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(isCreateMode ? "Nova empresa" : form.nome_fantasia || "Empresa")} | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: isCreateMode ? "Nova empresa" : form.nome_fantasia || "Empresa",
      subtitle: "Cadastro corporativo com status de billing e portfolio master.",
      breadcrumbs: [
        { label: "Administracao", href: "/admin" },
        { label: "Empresas", href: "/admin/empresas" },
        {
          label: isCreateMode ? "Nova" : form.nome_fantasia || "Detalhe"
        }
      ]
    });
    $$renderer2.push(`<!----> <div class="space-y-6">`);
    Card($$renderer2, {
      color: "financeiro",
      title: "Dados da empresa",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="grid gap-4 md:grid-cols-2"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="empresa-legal">Nome da empresa</label> <input id="empresa-legal"${attr("value", form.nome_empresa)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="empresa-fantasia">Nome fantasia</label> <input id="empresa-fantasia"${attr("value", form.nome_fantasia)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="empresa-cnpj">CNPJ</label> <input id="empresa-cnpj"${attr("value", form.cnpj)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="empresa-telefone">Telefone</label> <input id="empresa-telefone"${attr("value", form.telefone)} class="vtur-input w-full"/></div> <div class="md:col-span-2"><label class="mb-1 block text-sm font-medium text-slate-700" for="empresa-endereco">Endereco</label> <input id="empresa-endereco"${attr("value", form.endereco)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="empresa-cidade">Cidade</label> <input id="empresa-cidade"${attr("value", form.cidade)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="empresa-estado">Estado</label> <input id="empresa-estado"${attr("value", form.estado)} class="vtur-input w-full"/></div> <label class="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox"${attr("checked", form.active, true)}/> <div><p class="font-medium text-slate-900">Empresa ativa</p> <p class="text-sm text-slate-500">Controla uso operacional do tenant.</p></div></label></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      color: "financeiro",
      title: "Billing",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="grid gap-4 md:grid-cols-2"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="billing-status">Status</label> `);
        $$renderer3.select(
          {
            id: "billing-status",
            value: form.billing_status,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "active" }, ($$renderer5) => {
              $$renderer5.push(`Active`);
            });
            $$renderer4.option({ value: "trial" }, ($$renderer5) => {
              $$renderer5.push(`Trial`);
            });
            $$renderer4.option({ value: "past_due" }, ($$renderer5) => {
              $$renderer5.push(`Past due`);
            });
            $$renderer4.option({ value: "suspended" }, ($$renderer5) => {
              $$renderer5.push(`Suspended`);
            });
            $$renderer4.option({ value: "canceled" }, ($$renderer5) => {
              $$renderer5.push(`Canceled`);
            });
          }
        );
        $$renderer3.push(`</div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="billing-plan">Plano</label> `);
        $$renderer3.select(
          {
            id: "billing-plan",
            value: form.billing_plan_id,
            class: "vtur-input w-full"
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "" }, ($$renderer5) => {
              $$renderer5.push(`Sem plano`);
            });
            $$renderer4.push(`<!--[-->`);
            const each_array = ensure_array_like(plans);
            for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
              let plan = each_array[$$index];
              $$renderer4.option({ value: plan.id }, ($$renderer5) => {
                $$renderer5.push(`${escape_html(plan.nome)}`);
              });
            }
            $$renderer4.push(`<!--]-->`);
          }
        );
        $$renderer3.push(`</div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="billing-valor">Valor mensal</label> <input id="billing-valor"${attr("value", form.billing_valor_mensal)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="billing-ultimo">Ultimo pagamento</label> <input id="billing-ultimo" type="date"${attr("value", form.billing_ultimo_pagamento)} class="vtur-input w-full"/></div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="billing-proximo">Proximo vencimento</label> <input id="billing-proximo" type="date"${attr("value", form.billing_proximo_vencimento)} class="vtur-input w-full"/></div></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    if (!isCreateMode) {
      $$renderer2.push("<!--[0-->");
      Card($$renderer2, {
        color: "financeiro",
        title: "Portfolio master",
        children: ($$renderer3) => {
          $$renderer3.push(`<div class="space-y-4"><div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px_auto]"><div><label class="mb-1 block text-sm font-medium text-slate-700" for="link-master">Master</label> `);
          $$renderer3.select(
            {
              id: "link-master",
              value: newLink.master_id,
              class: "vtur-input w-full"
            },
            ($$renderer4) => {
              $$renderer4.option({ value: "" }, ($$renderer5) => {
                $$renderer5.push(`Selecione`);
              });
              $$renderer4.push(`<!--[-->`);
              const each_array_1 = ensure_array_like(mastersDisponiveis);
              for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                let master = each_array_1[$$index_1];
                $$renderer4.option({ value: master.id }, ($$renderer5) => {
                  $$renderer5.push(`${escape_html(master.nome_completo)}`);
                });
              }
              $$renderer4.push(`<!--]-->`);
            }
          );
          $$renderer3.push(`</div> <div><label class="mb-1 block text-sm font-medium text-slate-700" for="link-status">Status</label> `);
          $$renderer3.select(
            {
              id: "link-status",
              value: newLink.status,
              class: "vtur-input w-full"
            },
            ($$renderer4) => {
              $$renderer4.option({ value: "approved" }, ($$renderer5) => {
                $$renderer5.push(`Approved`);
              });
              $$renderer4.option({ value: "pending" }, ($$renderer5) => {
                $$renderer5.push(`Pending`);
              });
              $$renderer4.option({ value: "rejected" }, ($$renderer5) => {
                $$renderer5.push(`Rejected`);
              });
            }
          );
          $$renderer3.push(`</div> <div class="lg:self-end">`);
          Button($$renderer3, {
            variant: "primary",
            color: "financeiro",
            loading: linkSaving,
            children: ($$renderer4) => {
              $$renderer4.push(`<!---->Adicionar vinculo`);
            },
            $$slots: { default: true }
          });
          $$renderer3.push(`<!----></div></div> <div class="space-y-3"><!--[-->`);
          const each_array_2 = ensure_array_like(masterLinks);
          for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
            let link = each_array_2[$$index_2];
            $$renderer3.push(`<div class="grid gap-3 rounded-xl border border-slate-200 p-4 lg:grid-cols-[minmax(0,1fr)_160px_auto_auto]"><div><p class="font-medium text-slate-900">${escape_html(link.master?.nome_completo || link.master_id)}</p> <p class="text-xs text-slate-500">${escape_html(link.master?.email || "-")}</p></div> <div><label class="mb-1 block text-sm font-medium text-slate-700"${attr("for", `status-${link.id}`)}>Status</label> `);
            $$renderer3.select(
              {
                id: `status-${link.id}`,
                class: "vtur-input w-full",
                value: link.status
              },
              ($$renderer4) => {
                $$renderer4.option({ value: "approved" }, ($$renderer5) => {
                  $$renderer5.push(`Approved`);
                });
                $$renderer4.option({ value: "pending" }, ($$renderer5) => {
                  $$renderer5.push(`Pending`);
                });
                $$renderer4.option({ value: "rejected" }, ($$renderer5) => {
                  $$renderer5.push(`Rejected`);
                });
              }
            );
            $$renderer3.push(`</div> <div class="lg:self-end">`);
            Button($$renderer3, {
              variant: "danger",
              children: ($$renderer4) => {
                $$renderer4.push(`<!---->Excluir`);
              },
              $$slots: { default: true }
            });
            $$renderer3.push(`<!----></div></div>`);
          }
          $$renderer3.push(`<!--]--> `);
          if (masterLinks.length === 0) {
            $$renderer3.push("<!--[0-->");
            $$renderer3.push(`<p class="text-sm text-slate-500">Nenhum vinculo master cadastrado.</p>`);
          } else {
            $$renderer3.push("<!--[-1-->");
          }
          $$renderer3.push(`<!--]--></div></div>`);
        },
        $$slots: { default: true }
      });
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="flex flex-wrap gap-3">`);
    Button($$renderer2, {
      variant: "secondary",
      href: "/admin/empresas",
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
        $$renderer3.push(`<!---->Salvar empresa`);
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
