import { c as sanitize_props, d as rest_props, f as fallback, i as attributes, j as clsx, k as slot, m as bind_props, z as sanitize_slots, g as getContext, p as attr_class, v as stringify, e as escape_html, t as ensure_array_like, h as head } from "../../../../../../chunks/index2.js";
import "clsx";
import { B as Button } from "../../../../../../chunks/Button2.js";
import { C as Card } from "../../../../../../chunks/Card.js";
import { D as DataTable } from "../../../../../../chunks/DataTable.js";
import { D as Dialog } from "../../../../../../chunks/Dialog.js";
import { twMerge } from "tailwind-merge";
import { W as Wrapper } from "../../../../../../chunks/Wrapper.js";
import { C as CloseButton } from "../../../../../../chunks/CloseButton.js";
/* empty css                                                                  */
import { P as PageHeader } from "../../../../../../chunks/PageHeader.js";
import { t as toast } from "../../../../../../chunks/ui.js";
import "@sveltejs/kit/internal";
import "../../../../../../chunks/exports.js";
import "../../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../../chunks/root.js";
import "../../../../../../chunks/state.svelte.js";
import { R as Refresh_cw } from "../../../../../../chunks/refresh-cw.js";
import { C as Calculator } from "../../../../../../chunks/calculator.js";
import { T as Trending_up } from "../../../../../../chunks/trending-up.js";
import { D as Dollar_sign } from "../../../../../../chunks/dollar-sign.js";
import { P as Percent } from "../../../../../../chunks/percent.js";
import { C as Circle_alert } from "../../../../../../chunks/circle-alert.js";
function Label($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, ["color", "defaultClass", "show"]);
  $$renderer.component(($$renderer2) => {
    let labelClass;
    let color = fallback($$props["color"], "gray");
    let defaultClass = fallback($$props["defaultClass"], "text-sm rtl:text-right font-medium block");
    let show = fallback($$props["show"], true);
    const colorClasses = {
      gray: "text-gray-900 dark:text-gray-300",
      green: "text-green-700 dark:text-green-500",
      red: "text-red-700 dark:text-red-500",
      disabled: "text-gray-400 dark:text-gray-500 grayscale contrast-50"
    };
    {
      color = color;
    }
    labelClass = twMerge(defaultClass, colorClasses[color], $$sanitized_props.class);
    if (show) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<label${attributes({ ...$$restProps, class: clsx(labelClass) })}><!--[-->`);
      slot($$renderer2, $$props, "default", {}, null);
      $$renderer2.push(`<!--]--></label>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<!--[-->`);
      slot($$renderer2, $$props, "default", {}, null);
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { color, defaultClass, show });
  });
}
function clampSize(s) {
  return s && s === "xs" ? "sm" : s === "xl" ? "lg" : s;
}
function Input($$renderer, $$props) {
  const $$slots = sanitize_slots($$props);
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, [
    "type",
    "value",
    "size",
    "clearable",
    "defaultClass",
    "color",
    "floatClass",
    "classLeft",
    "classRight",
    "wrapperClass"
  ]);
  $$renderer.component(($$renderer2) => {
    let _size;
    let type = fallback($$props["type"], "text");
    let value = fallback($$props["value"], () => void 0, true);
    let size = fallback($$props["size"], () => void 0, true);
    let clearable = fallback($$props["clearable"], false);
    let defaultClass = fallback($$props["defaultClass"], "block w-full disabled:cursor-not-allowed disabled:opacity-50 rtl:text-right");
    let color = fallback($$props["color"], "base");
    let floatClass = fallback($$props["floatClass"], "flex absolute inset-y-0 items-center text-gray-500 dark:text-gray-400");
    let classLeft = fallback($$props["classLeft"], "");
    let classRight = fallback($$props["classRight"], "");
    let wrapperClass = fallback($$props["wrapperClass"], "relative w-auto");
    const borderClasses = {
      base: "border border-gray-300 dark:border-gray-600",
      tinted: "border border-gray-300 dark:border-gray-500",
      green: "border border-green-500 dark:border-green-400",
      red: "border border-red-500 dark:border-red-400"
    };
    const ringClasses = {
      base: "focus:border-primary-500 focus:ring-primary-500 dark:focus:border-primary-500 dark:focus:ring-primary-500",
      green: "focus:ring-green-500 focus:border-green-500 dark:focus:border-green-500 dark:focus:ring-green-500",
      red: "focus:ring-red-500 focus:border-red-500 dark:focus:ring-red-500 dark:focus:border-red-500"
    };
    const colorClasses = {
      base: "bg-gray-50 text-gray-900 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400",
      tinted: "bg-gray-50 text-gray-900 dark:bg-gray-600 dark:text-white dark:placeholder-gray-400",
      green: "bg-green-50 text-green-900 placeholder-green-700 dark:text-green-400 dark:placeholder-green-500 dark:bg-gray-700",
      red: "bg-red-50 text-red-900 placeholder-red-700 dark:text-red-500 dark:placeholder-red-500 dark:bg-gray-700"
    };
    let background = getContext("background");
    let group = getContext("group");
    const textSizes = { sm: "sm:text-xs", md: "text-sm", lg: "sm:text-base" };
    const leftPadding = { sm: "ps-9", md: "ps-10", lg: "ps-11" };
    const rightPadding = { sm: "pe-9", md: "pe-10", lg: "pe-11" };
    const inputPadding = { sm: "p-2", md: "p-2.5", lg: "p-3" };
    let inputClass;
    _size = size || clampSize(group?.size) || "md";
    {
      const _color = color === "base" && background ? "tinted" : color;
      inputClass = twMerge([
        defaultClass,
        inputPadding[_size],
        $$slots.left && leftPadding[_size] || (clearable || $$slots.right) && rightPadding[_size],
        ringClasses[color],
        colorClasses[_color],
        borderClasses[_color],
        textSizes[_size],
        group || "rounded-lg",
        group && "first:rounded-s-lg last:rounded-e-lg",
        group && "not-first:-ms-px",
        $$sanitized_props.class
      ]);
    }
    Wrapper($$renderer2, {
      class: wrapperClass,
      show: $$slots.left || $$slots.right || !!clearable,
      children: ($$renderer3) => {
        if ($$slots.left) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div${attr_class(`${stringify(twMerge(floatClass, classLeft))} start-0 ps-2.5 pointer-events-none`)}><!--[-->`);
          slot($$renderer3, $$props, "left", {}, null);
          $$renderer3.push(`<!--]--></div>`);
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--> <!--[-->`);
        slot($$renderer3, $$props, "default", { props: { ...$$restProps, class: inputClass } }, () => {
          $$renderer3.push(`<input${attributes(
            {
              ...$$restProps,
              value,
              ...{ type },
              class: clsx(inputClass)
            },
            void 0,
            void 0,
            void 0,
            4
          )}/>`);
        });
        $$renderer3.push(`<!--]--> `);
        if ($$slots.right) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<div${attr_class(`${stringify(twMerge(floatClass, classRight))} end-0 pe-2.5`)}><!--[-->`);
          slot($$renderer3, $$props, "right", {}, null);
          $$renderer3.push(`<!--]--></div>`);
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--> `);
        if (clearable && value && `${value}`.length > 0) {
          $$renderer3.push("<!--[0-->");
          CloseButton($$renderer3, {
            size,
            color: "none",
            class: `${stringify(twMerge(floatClass, classRight))} focus:ring-0 end-1`,
            tabindex: -1
          });
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    bind_props($$props, {
      type,
      value,
      size,
      clearable,
      defaultClass,
      color,
      floatClass,
      classLeft,
      classRight,
      wrapperClass
    });
  });
}
function Helper($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, ["helperClass", "color"]);
  $$renderer.component(($$renderer2) => {
    let helperClass = fallback($$props["helperClass"], "text-xs font-normal text-gray-500 dark:text-gray-300");
    let color = fallback($$props["color"], "gray");
    const colorClasses = {
      gray: "text-gray-900 dark:text-gray-300",
      green: "text-green-700 dark:text-green-500",
      red: "text-red-700 dark:text-red-500",
      disabled: "text-gray-400 dark:text-gray-500 grayscale contrast-50"
    };
    $$renderer2.push(`<p${attributes({
      ...$$restProps,
      class: clsx(twMerge(helperClass, colorClasses[color], $$sanitized_props.class))
    })}><!--[-->`);
    slot($$renderer2, $$props, "default", {}, null);
    $$renderer2.push(`<!--]--></p>`);
    bind_props($$props, { helperClass, color });
  });
}
function Select($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, [
    "items",
    "value",
    "placeholder",
    "underline",
    "size",
    "defaultClass",
    "underlineClass"
  ]);
  $$renderer.component(($$renderer2) => {
    let items = fallback($$props["items"], () => [], true);
    let value = fallback($$props["value"], "");
    let placeholder = fallback($$props["placeholder"], "Choose option ...");
    let underline = fallback($$props["underline"], false);
    let size = fallback($$props["size"], "md");
    let defaultClass = fallback($$props["defaultClass"], "text-gray-900 disabled:text-gray-400 bg-gray-50 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:disabled:text-gray-500 dark:focus:ring-primary-500 dark:focus:border-primary-500");
    let underlineClass = fallback($$props["underlineClass"], "text-gray-500 disabled:text-gray-400 bg-transparent border-0 border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:disabled:text-gray-500 dark:border-gray-700 focus:outline-hidden focus:ring-0 focus:border-gray-200 peer");
    const common = "block w-full";
    const sizes = {
      sm: "text-sm p-2",
      md: "text-sm p-2.5",
      lg: "text-base py-3 px-4"
    };
    let selectClass;
    selectClass = twMerge(common, underline ? underlineClass : defaultClass, sizes[size], underline && "px-0!", $$sanitized_props.class);
    $$renderer2.select(
      { ...$$restProps, value, class: selectClass },
      ($$renderer3) => {
        if (placeholder) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.option(
            {
              disabled: true,
              selected: value === void 0 ? true : void 0,
              value: ""
            },
            ($$renderer4) => {
              $$renderer4.push(`${escape_html(placeholder)}`);
            }
          );
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]-->`);
        if (items && items.length > 0) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<!--[-->`);
          const each_array = ensure_array_like(items);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let { value: itemValue, name, disabled } = each_array[$$index];
            $$renderer3.option(
              {
                disabled,
                value: itemValue,
                selected: itemValue === value ? true : void 0
              },
              ($$renderer4) => {
                $$renderer4.push(`${escape_html(name)}`);
              }
            );
          }
          $$renderer3.push(`<!--]-->`);
        } else {
          $$renderer3.push("<!--[-1-->");
          $$renderer3.push(`<!--[-->`);
          slot($$renderer3, $$props, "default", {}, null);
          $$renderer3.push(`<!--]-->`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      void 0,
      void 0,
      void 0,
      void 0,
      true
    );
    bind_props($$props, {
      items,
      value,
      placeholder,
      underline,
      size,
      defaultClass,
      underlineClass
    });
  });
}
function FieldInput($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let fieldId;
    let label = fallback($$props["label"], null);
    let value = fallback($$props["value"], "");
    let placeholder = fallback($$props["placeholder"], "");
    let type = fallback($$props["type"], "text");
    let required = fallback($$props["required"], false);
    let disabled = fallback($$props["disabled"], false);
    let readonly = fallback($$props["readonly"], false);
    let error = fallback($$props["error"], null);
    let helper = fallback($$props["helper"], null);
    let icon = fallback($$props["icon"], null);
    let id = fallback($$props["id"], null);
    let name = fallback($$props["name"], null);
    let min = fallback($$props["min"], null);
    let max = fallback($$props["max"], null);
    let step = fallback($$props["step"], null);
    let maxlength = fallback($$props["maxlength"], null);
    let class_name = fallback($$props["class_name"], "");
    fieldId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : void 0);
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<div${attr_class(clsx(class_name))}>`);
      if (label) {
        $$renderer3.push("<!--[0-->");
        Label($$renderer3, {
          for: fieldId,
          class: "mb-1.5 block text-sm font-medium text-slate-700",
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->${escape_html(label)}`);
            if (required) {
              $$renderer4.push("<!--[0-->");
              $$renderer4.push(`<span class="ml-0.5 text-red-500">*</span>`);
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]-->`);
          },
          $$slots: { default: true }
        });
      } else {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--> `);
      Input($$renderer3, {
        id: fieldId,
        name,
        type,
        placeholder,
        disabled,
        required,
        readonly,
        min,
        max,
        step,
        maxlength,
        color: error ? "red" : "base",
        class: `text-sm ${stringify(error ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "focus:ring-blue-200")}`,
        get value() {
          return value;
        },
        set value($$value) {
          value = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          if (icon) {
            $$renderer4.push("<!--[0-->");
            if (icon) {
              $$renderer4.push("<!--[-->");
              icon($$renderer4, { slot: "left", class: "h-4 w-4 text-slate-400" });
              $$renderer4.push("<!--]-->");
            } else {
              $$renderer4.push("<!--[!-->");
              $$renderer4.push("<!--]-->");
            }
          } else {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]-->`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      if (error) {
        $$renderer3.push("<!--[0-->");
        Helper($$renderer3, {
          class: "mt-1 text-red-600",
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->${escape_html(error)}`);
          },
          $$slots: { default: true }
        });
      } else if (helper) {
        $$renderer3.push("<!--[1-->");
        Helper($$renderer3, {
          class: "mt-1 text-slate-500",
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->${escape_html(helper)}`);
          },
          $$slots: { default: true }
        });
      } else {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--></div>`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, {
      label,
      value,
      placeholder,
      type,
      required,
      disabled,
      readonly,
      error,
      helper,
      icon,
      id,
      name,
      min,
      max,
      step,
      maxlength,
      class_name
    });
  });
}
function FieldSelect($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let fieldId;
    let label = fallback($$props["label"], null);
    let value = fallback($$props["value"], "");
    let options = fallback($$props["options"], () => [], true);
    let placeholder = fallback($$props["placeholder"], "Selecione uma opção");
    let required = fallback($$props["required"], false);
    let disabled = fallback($$props["disabled"], false);
    let error = fallback($$props["error"], null);
    let helper = fallback($$props["helper"], null);
    let id = fallback($$props["id"], null);
    let name = fallback($$props["name"], null);
    let class_name = fallback($$props["class_name"], "");
    fieldId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : void 0);
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<div${attr_class(clsx(class_name))}>`);
      if (label) {
        $$renderer3.push("<!--[0-->");
        Label($$renderer3, {
          for: fieldId,
          class: "mb-1.5 block text-sm font-medium text-slate-700",
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->${escape_html(label)}`);
            if (required) {
              $$renderer4.push("<!--[0-->");
              $$renderer4.push(`<span class="ml-0.5 text-red-500">*</span>`);
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]-->`);
          },
          $$slots: { default: true }
        });
      } else {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--> `);
      Select($$renderer3, {
        id: fieldId,
        name,
        disabled,
        required,
        class: `text-sm ${stringify(error ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "focus:ring-blue-200")}`,
        get value() {
          return value;
        },
        set value($$value) {
          value = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          if (placeholder) {
            $$renderer4.push("<!--[0-->");
            $$renderer4.option({ value: "" }, ($$renderer5) => {
              $$renderer5.push(`${escape_html(placeholder)}`);
            });
          } else {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]--> <!--[-->`);
          const each_array = ensure_array_like(options);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let option = each_array[$$index];
            $$renderer4.option({ value: option.value, disabled: option.disabled }, ($$renderer5) => {
              $$renderer5.push(`${escape_html(option.label)}`);
            });
          }
          $$renderer4.push(`<!--]-->`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      if (error) {
        $$renderer3.push("<!--[0-->");
        Helper($$renderer3, {
          class: "mt-1 text-red-600",
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->${escape_html(error)}`);
          },
          $$slots: { default: true }
        });
      } else if (helper) {
        $$renderer3.push("<!--[1-->");
        Helper($$renderer3, {
          class: "mt-1 text-slate-500",
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->${escape_html(helper)}`);
          },
          $$slots: { default: true }
        });
      } else {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--></div>`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, {
      label,
      value,
      options,
      placeholder,
      required,
      disabled,
      error,
      helper,
      id,
      name,
      class_name
    });
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let totalVendasPeriodo, totalComissoesPeriodo, mediaPercentual;
    let loading = false;
    let calculando = false;
    let showConfirmDialog = false;
    let showResultDialog = false;
    let resultadoCalculo = null;
    let comissoesPendentes = [];
    let resumoComissoes = { total_pendente: 0, total_pago: 0, total_geral: 0 };
    let filtroDataInicio = "";
    let filtroDataFim = "";
    let filtroMes = (/* @__PURE__ */ new Date()).getMonth() + 1;
    let filtroAno = (/* @__PURE__ */ new Date()).getFullYear();
    let filtroVendedor = "";
    let vendedores = [];
    async function loadComissoes() {
      loading = true;
      try {
        const params = new URLSearchParams();
        params.set("status", "PENDENTE");
        params.set("mes", String(filtroMes));
        params.set("ano", String(filtroAno));
        if (filtroVendedor) params.set("vendedor_id", filtroVendedor);
        const response = await fetch(`/api/v1/financeiro/comissoes/calcular?${params}`);
        if (!response.ok) throw new Error("Erro ao carregar comissões");
        const data = await response.json();
        comissoesPendentes = data.items || [];
        resumoComissoes = data.resumo || { total_pendente: 0, total_pago: 0, total_geral: 0 };
      } catch (err) {
        toast.error("Erro ao carregar comissões pendentes");
        console.error(err);
      } finally {
        loading = false;
      }
    }
    async function handleCalcular() {
      calculando = true;
      try {
        const response = await fetch("/api/v1/financeiro/comissoes/calcular", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data_inicio: filtroDataInicio,
            data_fim: filtroDataFim,
            mes_referencia: filtroMes,
            ano_referencia: filtroAno,
            vendedor_ids: filtroVendedor ? [filtroVendedor] : void 0
          })
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText);
        }
        const data = await response.json();
        resultadoCalculo = data;
        showResultDialog = true;
        await loadComissoes();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao calcular comissões");
      } finally {
        calculando = false;
      }
    }
    function getStatusBadge(status) {
      switch (status) {
        case "calculada":
          return '<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Calculada</span>';
        case "ignorada":
          return '<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">Ignorada</span>';
        case "erro":
          return '<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Erro</span>';
        default:
          return status;
      }
    }
    const columnsResultado = [
      {
        key: "numero_venda",
        label: "Venda",
        sortable: true,
        width: "120px"
      },
      { key: "cliente", label: "Cliente", sortable: true },
      {
        key: "valor_venda",
        label: "Valor Venda",
        sortable: true,
        align: "right",
        formatter: (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
      },
      {
        key: "percentual",
        label: "%",
        sortable: true,
        width: "80px",
        align: "center",
        formatter: (value) => `${value}%`
      },
      {
        key: "valor_comissao",
        label: "Comissão",
        sortable: true,
        align: "right",
        formatter: (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
      },
      { key: "regra", label: "Regra", sortable: true, width: "150px" },
      {
        key: "status",
        label: "Status",
        sortable: true,
        width: "100px",
        formatter: (value) => getStatusBadge(value)
      }
    ];
    const columnsPendentes = [
      {
        key: "numero_venda",
        label: "Venda",
        sortable: true,
        width: "120px"
      },
      { key: "cliente", label: "Cliente", sortable: true },
      {
        key: "vendedor",
        label: "Vendedor",
        sortable: true,
        width: "150px"
      },
      {
        key: "data_venda",
        label: "Data",
        sortable: true,
        width: "100px",
        formatter: (value) => value ? new Date(value).toLocaleDateString("pt-BR") : "-"
      },
      {
        key: "valor_venda",
        label: "Valor Venda",
        sortable: true,
        align: "right",
        formatter: (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
      },
      {
        key: "percentual_aplicado",
        label: "%",
        sortable: true,
        width: "60px",
        align: "center",
        formatter: (value) => `${value}%`
      },
      {
        key: "valor_comissao",
        label: "Comissão",
        sortable: true,
        align: "right",
        formatter: (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
      }
    ];
    totalVendasPeriodo = comissoesPendentes.reduce((acc, c) => acc + c.valor_venda, 0);
    totalComissoesPeriodo = comissoesPendentes.reduce((acc, c) => acc + c.valor_comissao, 0);
    mediaPercentual = totalVendasPeriodo > 0 ? (totalComissoesPeriodo / totalVendasPeriodo * 100).toFixed(2) : "0.00";
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("6e6rkw", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Cálculo de Comissões | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Cálculo de Comissões",
        subtitle: "Calcule e gere comissões para os vendedores",
        color: "financeiro",
        breadcrumbs: [
          { label: "Financeiro", href: "/financeiro" },
          { label: "Comissões", href: "/financeiro/comissoes" },
          { label: "Cálculo" }
        ]
      });
      $$renderer3.push(`<!----> `);
      Card($$renderer3, {
        header: "Filtros de Cálculo",
        color: "financeiro",
        class: "mb-6",
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">`);
          FieldInput($$renderer4, {
            label: "Data Início",
            type: "date",
            class_name: "w-full",
            get value() {
              return filtroDataInicio;
            },
            set value($$value) {
              filtroDataInicio = $$value;
              $$settled = false;
            }
          });
          $$renderer4.push(`<!----> `);
          FieldInput($$renderer4, {
            label: "Data Fim",
            type: "date",
            class_name: "w-full",
            get value() {
              return filtroDataFim;
            },
            set value($$value) {
              filtroDataFim = $$value;
              $$settled = false;
            }
          });
          $$renderer4.push(`<!----> `);
          FieldSelect($$renderer4, {
            label: "Mês Referência",
            options: Array.from({ length: 12 }, (_, i) => ({
              value: String(i + 1),
              label: new Date(2024, i, 1).toLocaleDateString("pt-BR", { month: "long" })
            })),
            class_name: "w-full",
            get value() {
              return filtroMes;
            },
            set value($$value) {
              filtroMes = $$value;
              $$settled = false;
            }
          });
          $$renderer4.push(`<!----> `);
          FieldInput($$renderer4, {
            label: "Ano",
            type: "number",
            class_name: "w-full",
            get value() {
              return filtroAno;
            },
            set value($$value) {
              filtroAno = $$value;
              $$settled = false;
            }
          });
          $$renderer4.push(`<!----> `);
          FieldSelect($$renderer4, {
            label: "Vendedor (opcional)",
            options: [
              { value: "", label: "Todos os vendedores" },
              ...vendedores.map((v) => ({
                value: v.id,
                label: String(v.nome_completo || v.email || "Vendedor")
              }))
            ],
            class_name: "w-full",
            get value() {
              return filtroVendedor;
            },
            set value($$value) {
              filtroVendedor = $$value;
              $$settled = false;
            }
          });
          $$renderer4.push(`<!----></div> <div class="flex justify-end gap-3 mt-6 pt-4 border-t">`);
          Button($$renderer4, {
            variant: "secondary",
            disabled: loading,
            children: ($$renderer5) => {
              Refresh_cw($$renderer5, { size: 16, class: "mr-2" });
              $$renderer5.push(`<!----> Atualizar`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----> `);
          Button($$renderer4, {
            variant: "primary",
            color: "financeiro",
            disabled: calculando,
            children: ($$renderer5) => {
              if (calculando) {
                $$renderer5.push("<!--[0-->");
                Refresh_cw($$renderer5, { size: 16, class: "mr-2 animate-spin" });
                $$renderer5.push(`<!----> Calculando...`);
              } else {
                $$renderer5.push("<!--[-1-->");
                Calculator($$renderer5, { size: 16, class: "mr-2" });
                $$renderer5.push(`<!----> Calcular Comissões`);
              }
              $$renderer5.push(`<!--]-->`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> <div class="vtur-kpi-grid mb-6"><div class="vtur-kpi-card border-t-[3px] border-t-orange-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">`);
      Calculator($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Comissões Pendentes</p> <p class="text-2xl font-bold text-slate-900">${escape_html(comissoesPendentes.length)}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-green-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500">`);
      Trending_up($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Total em Vendas</p> <p class="text-2xl font-bold text-slate-900">${escape_html(new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(totalVendasPeriodo))}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-blue-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">`);
      Dollar_sign($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">Comissões no Período</p> <p class="text-2xl font-bold text-slate-900">${escape_html(new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(totalComissoesPeriodo))}</p></div></div> <div class="vtur-kpi-card border-t-[3px] border-t-amber-400"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">`);
      Percent($$renderer3, { size: 20 });
      $$renderer3.push(`<!----></div> <div><p class="text-sm font-medium text-slate-500">% Médio</p> <p class="text-2xl font-bold text-slate-900">${escape_html(mediaPercentual)}%</p></div></div></div> `);
      Card($$renderer3, {
        header: `Comissões Calculadas - ${comissoesPendentes.length} registros`,
        color: "financeiro",
        children: ($$renderer4) => {
          DataTable($$renderer4, {
            columns: columnsPendentes,
            data: comissoesPendentes,
            color: "financeiro",
            loading,
            pageSize: 25,
            searchable: true,
            exportable: true,
            emptyMessage: "Nenhuma comissão pendente encontrada para o período selecionado"
          });
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      Dialog($$renderer3, {
        title: "Confirmar Cálculo",
        color: "financeiro",
        showCancel: true,
        cancelText: "Cancelar",
        showConfirm: true,
        confirmText: "Calcular",
        onConfirm: handleCalcular,
        get open() {
          return showConfirmDialog;
        },
        set open($$value) {
          showConfirmDialog = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="space-y-4"><div class="p-4 bg-amber-50 rounded-lg border border-amber-200"><div class="flex items-start gap-3">`);
          Circle_alert($$renderer4, { class: "text-amber-600 mt-0.5", size: 20 });
          $$renderer4.push(`<!----> <div><p class="font-medium text-amber-800">Atenção</p> <p class="text-sm text-amber-700">O cálculo de comissões irá processar todas as vendas do período selecionado 
            que ainda não possuem comissão calculada ou que precisam ser recalculadas.</p></div></div></div> <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm"><div><p class="text-slate-500">Período</p> <p class="font-medium">${escape_html(new Date(filtroDataInicio).toLocaleDateString("pt-BR"))} até ${escape_html(new Date(filtroDataFim).toLocaleDateString("pt-BR"))}</p></div> <div><p class="text-slate-500">Referência</p> <p class="font-medium">${escape_html(new Date(filtroAno, filtroMes - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }))}</p></div> <div><p class="text-slate-500">Vendedor</p> <p class="font-medium">${escape_html(filtroVendedor ? vendedores.find((v) => v.id === filtroVendedor)?.nome_completo || "Selecionado" : "Todos")}</p></div> <div><p class="text-slate-500">Status Atual</p> <p class="font-medium">${escape_html(comissoesPendentes.length)} comissões pendentes</p></div></div></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      Dialog($$renderer3, {
        title: "Resultado do Cálculo",
        color: "financeiro",
        showCancel: true,
        cancelText: "Fechar",
        showConfirm: false,
        maxWidth: "4xl",
        get open() {
          return showResultDialog;
        },
        set open($$value) {
          showResultDialog = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          if (resultadoCalculo) {
            $$renderer4.push("<!--[0-->");
            $$renderer4.push(`<div class="space-y-4"><div class="grid grid-cols-1 sm:grid-cols-3 gap-4"><div class="p-4 bg-green-50 rounded-lg text-center"><p class="text-sm text-green-600">Processadas</p> <p class="text-2xl font-bold text-green-700">${escape_html(resultadoCalculo.processadas)}</p></div> <div class="p-4 bg-red-50 rounded-lg text-center"><p class="text-sm text-red-600">Erros</p> <p class="text-2xl font-bold text-red-700">${escape_html(resultadoCalculo.erro)}</p></div> <div class="p-4 bg-blue-50 rounded-lg text-center"><p class="text-sm text-blue-600">Total Vendas</p> <p class="text-2xl font-bold text-blue-700">${escape_html(resultadoCalculo.total_vendas)}</p></div></div> `);
            if (resultadoCalculo.detalhes.length > 0) {
              $$renderer4.push("<!--[0-->");
              $$renderer4.push(`<div class="max-h-96 overflow-auto">`);
              DataTable($$renderer4, {
                columns: columnsResultado,
                data: resultadoCalculo.detalhes,
                color: "financeiro",
                pageSize: 10,
                searchable: true,
                emptyMessage: "Nenhum resultado"
              });
              $$renderer4.push(`<!----></div>`);
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--> <div class="flex justify-end gap-3 pt-4 border-t">`);
            Button($$renderer4, {
              variant: "secondary",
              children: ($$renderer5) => {
                Dollar_sign($$renderer5, { size: 16, class: "mr-2" });
                $$renderer5.push(`<!----> Ir para Pagamentos`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----></div></div>`);
          } else {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]-->`);
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
