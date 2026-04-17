<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import KPICard from '$lib/components/kpis/KPICard.svelte';
  import { toast } from '$lib/stores/ui';
  import {
    Calculator, DollarSign, TrendingUp, Users,
    RefreshCw, FileText, ChevronRight, Loader2
  } from 'lucide-svelte';

  // ─── Tipos ──────────────────────────────────────────────────────────────────
  interface ComissaoItem {
    id: string;
    venda_id: string;
    numero_venda: string;
    vendedor_id: string;
    vendedor: string;
    cliente: string;
    data_venda: string;
    valor_venda: number;
    valor_comissao: number;
    valor_pago: number;
    status: string;
  }

  interface ResumoVendedor {
    vendedor_id: string;
    vendedor_nome: string;
    total_vendas: number;
    total_comissao: number;
    total_pago: number;
    total_pendente: number;
  }

  // ─── Estado ─────────────────────────────────────────────────────────────────
  let items: ComissaoItem[] = [];
  let resumo: ResumoVendedor[] = [];
  let loading = true;

  let filtroMes = new Date().getMonth() + 1;
  let filtroAno = new Date().getFullYear();
  let filtroStatus = 'todas';

  let abortController: AbortController | null = null;

  // ─── KPIs derivados ─────────────────────────────────────────────────────────
  $: totalComissao   = resumo.reduce((a, r) => a + r.total_comissao, 0);
  $: totalPago       = resumo.reduce((a, r) => a + r.total_pago, 0);
  $: totalPendente   = resumo.reduce((a, r) => a + r.total_pendente, 0);
  $: vendedoresAtivos = resumo.length;

  // ─── Helpers ────────────────────────────────────────────────────────────────
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  }

  function progressoPago(r: ResumoVendedor): number {
    if (!r.total_comissao) return 0;
    return Math.min(100, Math.round((r.total_pago / r.total_comissao) * 100));
  }

  function buildMonthOptions() {
    return Array.from({ length: 12 }, (_, i) => ({
      value: i + 1,
      label: new Date(2024, i, 1).toLocaleDateString('pt-BR', { month: 'long' })
    }));
  }

  // ─── Fetch ──────────────────────────────────────────────────────────────────
  async function load() {
    if (abortController) abortController.abort();
    abortController = new AbortController();

    loading = true;
    try {
      const params = new URLSearchParams({ ano: String(filtroAno) });
      if (filtroStatus !== 'todas') params.set('status', filtroStatus);

      const response = await fetch(`/api/v1/financeiro/comissoes?${params.toString()}`, {
        signal: abortController.signal
      });

      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      items   = data.items   ?? [];
      resumo  = data.resumo  ?? [];
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar comissões.');
    } finally {
      loading = false;
    }
  }

  onMount(() => void load());
  onDestroy(() => { if (abortController) abortController.abort(); });
</script>

<svelte:head>
  <title>Comissões | VTUR</title>
</svelte:head>

<PageHeader
  title="Comissões"
  subtitle="Acompanhe comissões por vendedor e acesse o fechamento mensal."
  color="comissoes"
  breadcrumbs={[{ label: 'Comissões' }]}
  actions={[
    { label: 'Atualizar',  onClick: load,                        variant: 'secondary', icon: RefreshCw },
    { label: 'Fechamento', href: '/comissoes/fechamento',         variant: 'primary',   icon: FileText  }
  ]}
/>

<!-- KPIs -->
<div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
  <KPICard title="Total comissões"  value={formatCurrency(totalComissao)}  color="comissoes" icon={DollarSign}  />
  <KPICard title="Total pago"       value={formatCurrency(totalPago)}       color="comissoes" icon={TrendingUp}  />
  <KPICard title="Pendente"         value={formatCurrency(totalPendente)}   color="comissoes" icon={Calculator}  />
  <KPICard title="Vendedores ativos" value={vendedoresAtivos}               color="comissoes" icon={Users}       />
</div>

<!-- Filtros -->
<Card color="comissoes" class="mb-6">
  <div class="flex flex-wrap gap-4 items-end">
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="c-ano">Ano</label>
      <input
        id="c-ano"
        type="number"
        bind:value={filtroAno}
        min="2020" max="2100"
        class="vtur-input w-24"
      />
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700" for="c-status">Status</label>
      <select id="c-status" bind:value={filtroStatus} class="vtur-input">
        <option value="todas">Todas</option>
        <option value="pendente">Pendentes</option>
        <option value="pago">Pagas</option>
      </select>
    </div>
    <Button variant="primary" color="comissoes" on:click={load}>Filtrar</Button>
    <Button variant="secondary" href="/comissoes/fechamento">
      <FileText size={16} class="mr-2" />
      Fechamento mensal
    </Button>
  </div>
</Card>

<!-- Tabela de resumo por vendedor -->
<Card header="Resumo por Vendedor" color="comissoes">
  {#if loading}
    <div class="flex items-center justify-center py-16">
      <Loader2 size={28} class="animate-spin text-comissoes-600" />
      <span class="ml-2 text-slate-500">Carregando...</span>
    </div>
  {:else if resumo.length === 0}
    <div class="flex flex-col items-center justify-center py-16 text-slate-400">
      <Calculator size={40} class="mb-3 opacity-40" />
      <p class="font-medium">Nenhuma comissão encontrada</p>
      <p class="text-sm mt-1">Ajuste os filtros ou verifique se há vendas cadastradas.</p>
    </div>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th class="py-3 pr-4">Vendedor</th>
            <th class="py-3 pr-4 text-right">Vendas</th>
            <th class="py-3 pr-4 text-right">Comissão Total</th>
            <th class="py-3 pr-4 text-right">Pago</th>
            <th class="py-3 pr-4 text-right">Pendente</th>
            <th class="py-3 pr-4">Progresso</th>
            <th class="py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          {#each resumo as r}
            {@const pct = progressoPago(r)}
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="py-3 pr-4 font-medium text-slate-900">{r.vendedor_nome}</td>
              <td class="py-3 pr-4 text-right text-slate-600">{r.total_vendas}</td>
              <td class="py-3 pr-4 text-right font-semibold text-slate-800">{formatCurrency(r.total_comissao)}</td>
              <td class="py-3 pr-4 text-right text-green-600 font-medium">{formatCurrency(r.total_pago)}</td>
              <td class="py-3 pr-4 text-right text-amber-600 font-medium">{formatCurrency(r.total_pendente)}</td>
              <td class="py-3 pr-4 min-w-[120px]">
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      class="h-full rounded-full bg-green-500 transition-all"
                      style="width: {pct}%"
                    ></div>
                  </div>
                  <span class="text-xs text-slate-500 w-8 text-right">{pct}%</span>
                </div>
              </td>
              <td class="py-3">
                <a
                  href="/comissoes/fechamento?vendedor_id={r.vendedor_id}"
                  class="inline-flex items-center text-comissoes-600 hover:text-comissoes-800 text-xs font-medium"
                >
                  Ver <ChevronRight size={14} />
                </a>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</Card>
