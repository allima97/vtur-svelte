import { h as head } from "../../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../../chunks/exports.js";
import "../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../chunks/root.js";
import "../../../../../chunks/state.svelte.js";
import "@supabase/ssr";
import { P as PageHeader } from "../../../../../chunks/PageHeader.js";
import "clsx";
import "../../../../../chunks/ui.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let factors = [];
    factors.filter((f) => f.status === "verified");
    factors.filter((f) => f.status !== "verified");
    head("l1h1j1", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Autenticação em Duas Etapas | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Autenticação em Duas Etapas (2FA)",
      subtitle: "Configure um autenticador para proteger sua conta com verificação adicional.",
      breadcrumbs: [{ label: "Perfil", href: "/perfil" }, { label: "2FA" }]
    });
    $$renderer2.push(`<!----> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="flex items-center justify-center py-20 text-slate-500">Carregando...</div>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
