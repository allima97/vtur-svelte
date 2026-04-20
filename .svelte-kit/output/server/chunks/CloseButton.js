import { c as sanitize_props, d as rest_props, f as fallback, g as getContext, i as attributes, j as clsx, e as escape_html, k as slot, m as bind_props, o as spread_props, y as invalid_default_snippet, p as attr_class } from "./index2.js";
import { twMerge } from "tailwind-merge";
function ToolbarButton($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, ["color", "name", "ariaLabel", "size", "href"]);
  $$renderer.component(($$renderer2) => {
    let color = fallback($$props["color"], "default");
    let name = fallback($$props["name"], () => void 0, true);
    let ariaLabel = fallback($$props["ariaLabel"], () => void 0, true);
    let size = fallback($$props["size"], "md");
    let href = fallback($$props["href"], () => void 0, true);
    const background = getContext("background");
    const colors = {
      dark: "text-gray-500 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600",
      gray: "text-gray-500 focus:ring-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 dark:hover:text-gray-300",
      red: "text-red-500 focus:ring-red-400 hover:bg-red-200 dark:hover:bg-red-800 dark:hover:text-red-300",
      yellow: "text-yellow-500 focus:ring-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-800 dark:hover:text-yellow-300",
      green: "text-green-500 focus:ring-green-400 hover:bg-green-200 dark:hover:bg-green-800 dark:hover:text-green-300",
      indigo: "text-indigo-500 focus:ring-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-800 dark:hover:text-indigo-300",
      purple: "text-purple-500 focus:ring-purple-400 hover:bg-purple-200 dark:hover:bg-purple-800 dark:hover:text-purple-300",
      pink: "text-pink-500 focus:ring-pink-400 hover:bg-pink-200 dark:hover:bg-pink-800 dark:hover:text-pink-300",
      blue: "text-blue-500 focus:ring-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 dark:hover:text-blue-300",
      primary: "text-primary-500 focus:ring-primary-400 hover:bg-primary-200 dark:hover:bg-primary-800 dark:hover:text-primary-300",
      default: "focus:ring-gray-400 hover:bg-gray-100"
    };
    const sizing = {
      xs: "m-0.5 rounded-xs focus:ring-1 p-0.5",
      sm: "m-0.5 rounded-sm focus:ring-1 p-0.5",
      md: "m-0.5 rounded-lg focus:ring-2 p-1.5",
      lg: "m-0.5 rounded-lg focus:ring-2 p-2.5"
    };
    let buttonClass;
    const svgSizes = {
      xs: "w-3 h-3",
      sm: "w-3.5 h-3.5",
      md: "w-5 h-5",
      lg: "w-5 h-5"
    };
    buttonClass = twMerge("focus:outline-hidden whitespace-normal", sizing[size], colors[color], color === "default" && (background ? "dark:hover:bg-gray-600" : "dark:hover:bg-gray-700"), $$sanitized_props.class);
    if (href) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<a${attributes({
        href,
        ...$$restProps,
        class: clsx(buttonClass),
        "aria-label": ariaLabel ?? name
      })}>`);
      if (name) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<span class="sr-only">${escape_html(name)}</span>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <!--[-->`);
      slot($$renderer2, $$props, "default", { svgSize: svgSizes[size] }, null);
      $$renderer2.push(`<!--]--></a>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<button${attributes({
        type: "button",
        ...$$restProps,
        class: clsx(buttonClass),
        "aria-label": ariaLabel ?? name
      })}>`);
      if (name) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<span class="sr-only">${escape_html(name)}</span>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <!--[-->`);
      slot($$renderer2, $$props, "default", { svgSize: svgSizes[size] }, null);
      $$renderer2.push(`<!--]--></button>`);
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { color, name, ariaLabel, size, href });
  });
}
function CloseButton($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, ["name"]);
  $$renderer.component(($$renderer2) => {
    let name = fallback($$props["name"], "Close");
    ToolbarButton($$renderer2, spread_props([
      { name },
      $$restProps,
      {
        class: twMerge("ms-auto", $$sanitized_props.class),
        children: invalid_default_snippet,
        $$slots: {
          default: ($$renderer3, { svgSize }) => {
            $$renderer3.push(`<svg${attr_class(clsx(svgSize))} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>`);
          }
        }
      }
    ]));
    bind_props($$props, { name });
  });
}
export {
  CloseButton as C
};
