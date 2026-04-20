import { b as store_get, u as unsubscribe_stores, h as head } from "../../../../../../chunks/index2.js";
import { p as page } from "../../../../../../chunks/stores.js";
import "@sveltejs/kit/internal";
import "../../../../../../chunks/exports.js";
import "../../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../../chunks/root.js";
import "../../../../../../chunks/state.svelte.js";
import "clsx";
import { C as Card } from "../../../../../../chunks/Card.js";
/* empty css                                                            */
/* empty css                                                                  */
import { P as PageHeader } from "../../../../../../chunks/PageHeader.js";
import "../../../../../../chunks/ui.js";
import { C as CalculatorModal } from "../../../../../../chunks/CalculatorModal.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let clienteSelecionado, cidadeSelecionada, totalRecibos, totalPagamentos;
    const vendaId = String(store_get($$store_subs ??= {}, "$page", page).params.id || "");
    (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    let showCalculator = false;
    let clienteInput = "";
    let cidadeInput = "";
    let ensuringProdutoId = "";
    let clientes = [];
    let cidades = [];
    let produtos = [];
    let venda = {
      cliente_id: "",
      destino_cidade_id: "",
      desconto_comercial_aplicado: false,
      desconto_comercial_valor: "",
      valor_total: "",
      valor_total_bruto: "",
      valor_taxas: ""
    };
    let recibos = [createRecibo(true)];
    let pagamentos = [createPagamento()];
    function createRecibo(principal = false) {
      return {
        principal,
        tipo_produto_id: "",
        produto_id: "",
        produto_resolvido_id: "",
        numero_recibo: "",
        numero_reserva: "",
        tipo_pacote: "",
        valor_total: "",
        valor_taxas: "0",
        valor_du: "0",
        valor_rav: "0",
        data_inicio: "",
        data_fim: "",
        contrato_url: "",
        contrato_path: ""
      };
    }
    function createPagamento() {
      return {
        forma_pagamento_id: "",
        forma_nome: "",
        operacao: "",
        plano: "",
        valor_bruto: "",
        desconto_valor: "",
        valor_total: "",
        parcelas_qtd: 1,
        parcelas_valor: "",
        vencimento_primeira: "",
        paga_comissao: true,
        parcelas: []
      };
    }
    function parseMoney(value) {
      const raw = String(value ?? "").trim().replace(/[^\d,.-]/g, "");
      const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    function isProdutoCompativelCidade(produto) {
      return produto.todas_as_cidades === true;
    }
    function getClienteSelecionado() {
      return clientes.find((item) => item.id === venda.cliente_id) || null;
    }
    function getClienteLabel(cliente) {
      return `${cliente.nome}${cliente.cpf ? ` • ${cliente.cpf}` : ""}`;
    }
    function getCidadeLabel(cidade) {
      const preferred = String(cidade.label || "").trim();
      if (preferred) return preferred;
      const nome = String(cidade.nome || "").trim();
      const estado = String(cidade.estado || cidade.uf || cidade.sigla || cidade.subdivisao_nome || cidade.subdivisao?.sigla || cidade.subdivisao?.nome || "").trim();
      return estado ? `${nome} (${estado})` : nome;
    }
    async function ensureProdutoLoaded(produtoId) {
      const id = String(produtoId || "").trim();
      if (!id) return;
      if (produtos.some((item) => String(item.id) === id)) return;
      if (ensuringProdutoId === id) return;
      ensuringProdutoId = id;
      try {
        const response = await fetch(`/api/v1/produtos/${encodeURIComponent(id)}`);
        if (!response.ok) return;
        const payload = await response.json();
        if (payload?.id) {
          const todasAsCidades = payload.todas_as_cidades === true || !payload.cidade_id && payload.todas_as_cidades !== false;
          produtos = [
            ...produtos,
            {
              id: String(payload.id),
              nome: payload.nome,
              cidade_id: payload.cidade_id,
              todas_as_cidades: todasAsCidades,
              tipo: payload.tipo,
              tipo_produto: payload.tipo_produto
            }
          ];
        }
      } catch {
      } finally {
        if (ensuringProdutoId === id) ensuringProdutoId = "";
      }
    }
    function applyValoresCalculadora(resultado) {
      venda.valor_total = String(resultado.valorFinal || "");
      venda.valor_total_bruto = String(resultado.valorBruto || "");
      venda.desconto_comercial_aplicado = Number(resultado.descontoValor || 0) > 0;
      venda.desconto_comercial_valor = String(resultado.descontoValor || "");
      venda.valor_taxas = String(resultado.taxas || "");
    }
    clienteSelecionado = getClienteSelecionado();
    if (clienteSelecionado && clienteInput !== getClienteLabel(clienteSelecionado)) {
      clienteInput = getClienteLabel(clienteSelecionado);
    }
    cidadeSelecionada = cidades.find((item) => item.id === venda.destino_cidade_id) || null;
    if (cidadeSelecionada && cidadeInput !== getCidadeLabel(cidadeSelecionada)) {
      cidadeInput = getCidadeLabel(cidadeSelecionada);
    }
    {
      recibos = recibos.map((recibo) => {
        if (recibo.tipo_produto_id) return recibo;
        if (!recibo.produto_id) return recibo;
        const produto = produtos.find((p) => String(p.id) === String(recibo.produto_id));
        if (!produto) {
          ensureProdutoLoaded(recibo.produto_id);
          return recibo;
        }
        return {
          ...recibo,
          tipo_produto_id: String(produto.tipo_produto || "")
        };
      });
    }
    totalRecibos = recibos.reduce((acc, item) => acc + parseMoney(item.valor_total), 0);
    recibos.reduce((acc, item) => acc + parseMoney(item.valor_taxas), 0);
    totalPagamentos = pagamentos.reduce((acc, item) => acc + parseMoney(item.valor_total), 0);
    Number((totalPagamentos - totalRecibos).toFixed(2));
    produtos.filter((item) => isProdutoCompativelCidade(item));
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("recemd", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Editar Venda | VTUR</title>`);
        });
      });
      PageHeader($$renderer3, {
        title: "Editar Venda",
        subtitle: `Registro ${vendaId.slice(0, 8).toUpperCase()} com fluxo completo de venda, recibos e pagamentos.`,
        breadcrumbs: [
          { label: "Vendas", href: "/vendas" },
          { label: "Editar venda" }
        ]
      });
      $$renderer3.push(`<!----> `);
      {
        $$renderer3.push("<!--[0-->");
        Card($$renderer3, {
          title: "Carregando venda",
          color: "vendas",
          children: ($$renderer4) => {
            $$renderer4.push(`<p class="text-sm text-slate-600">Buscando dados da venda, recibos e pagamentos...</p>`);
          },
          $$slots: { default: true }
        });
      }
      $$renderer3.push(`<!--]--> `);
      CalculatorModal($$renderer3, {
        valorBruto: parseMoney(venda.valor_total_bruto || venda.valor_total),
        onClose: () => showCalculator = false,
        onConfirm: applyValoresCalculadora,
        get open() {
          return showCalculator;
        },
        set open($$value) {
          showCalculator = $$value;
          $$settled = false;
        }
      });
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
