import { h as head } from "../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
import { P as PageHeader } from "../../../../chunks/PageHeader.js";
import "../../../../chunks/ui.js";
import { L as Loader_circle } from "../../../../chunks/loader-circle.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let pagamentos = [];
    let comissoes = [];
    function construirMovimentosRecentes(pagamentosLista, comissoesLista) {
      const movimentosPagamentos = pagamentosLista.slice(0, 5).map((pagamento) => ({
        id: `pag-${pagamento.id}`,
        data: pagamento.data_pagamento || pagamento.created_at || "",
        descricao: pagamento.descricao || `Pagamento ${pagamento.codigo || ""}`,
        detalhe: `${pagamento.cliente?.nome || "Cliente não informado"}${pagamento.venda?.codigo ? ` - ${pagamento.venda.codigo}` : ""}`,
        tipo: "Receita",
        valor: Number(pagamento.valor || 0),
        status: pagamento.status === "conciliado" ? "Conciliado" : pagamento.status === "divergente" ? "Divergente" : "Pendente"
      }));
      const movimentosComissoes = comissoesLista.slice(0, 5).map((comissao) => ({
        id: `com-${comissao.id}`,
        data: comissao.data_venda || "",
        descricao: `Comissão ${comissao.vendedor || ""}`.trim(),
        detalhe: `${comissao.cliente || "Cliente não informado"}${comissao.numero_venda ? ` - ${comissao.numero_venda}` : ""}`,
        tipo: "Despesa",
        valor: Number(comissao.valor_comissao || 0),
        status: comissao.status === "pago" ? "Pago" : "Pendente"
      }));
      return [...movimentosPagamentos, ...movimentosComissoes].filter((item) => item.data).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 6);
    }
    construirMovimentosRecentes(pagamentos, comissoes);
    head("e323zm", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Financeiro | VTUR</title>`);
      });
    });
    PageHeader($$renderer2, {
      title: "Financeiro",
      subtitle: "Gestão financeira do sistema",
      color: "financeiro",
      breadcrumbs: [{ label: "Financeiro" }]
    });
    $$renderer2.push(`<!----> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="flex items-center justify-center py-12">`);
      Loader_circle($$renderer2, { size: 40, class: "animate-spin text-financeiro-600" });
      $$renderer2.push(`<!----> <span class="ml-3 text-slate-600">Carregando dashboard financeiro...</span></div>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
