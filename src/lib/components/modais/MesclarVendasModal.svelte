<script lang="ts">
  import { onMount } from 'svelte';
  import { Merge, X, AlertTriangle, CheckCircle, Loader2, Calendar, MapPin, Receipt, DollarSign, Search } from 'lucide-svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { toast } from '$lib/stores/ui';

  // ─── Props ─────────────────────────────────────────────────────────────────
  export let open = false;
  export let vendaId: string = '';
  export let vendaCodigo: string = '';
  export let onClose: () => void = () => {};
  export let onMerged: () => void = () => {};

  // ─── Estado ────────────────────────────────────────────────────────────────
  interface Candidato {
    id: string;
    cliente_nome: string;
    destino_nome: string;
    destino_cidade_nome: string;
    data_venda: string | null;
    data_embarque: string | null;
    data_final: string | null;
    valor_total: number | null;
    numero_recibo_principal: string | null;
    numeros_recibo: string[];
  }

  let candidatos: Candidato[] = [];
  let selecionados = new Set<string>();
  let loading = false;
  let mesclando = false;
  let erro: string | null = null;
  let filtro = '';
  let confirmando = false;

  // ─── Derivados ─────────────────────────────────────────────────────────────
  $: candidatosFiltrados = candidatos.filter(c => {
    if (!filtro.trim()) return true;
    const f = filtro.toLowerCase();
    return (
      c.destino_nome?.toLowerCase().includes(f) ||
      c.destino_cidade_nome?.toLowerCase().includes(f) ||
      c.numero_recibo_principal?.toLowerCase().includes(f) ||
      c.numeros_recibo?.some(n => n.toLowerCase().includes(f))
    );
  });

  $: totalSelecionados = selecionados.size;
  $: podeMesclar = totalSelecionados > 0 && !mesclando;

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function fmt(v: number | null) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  }

  function fmtDate(d: string | null) {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  }

  function toggleSelecionado(id: string) {
    const novo = new Set(selecionados);
    if (novo.has(id)) {
      novo.delete(id);
    } else {
      novo.add(id);
    }
    selecionados = novo;
  }

  // ─── Carregar candidatos ───────────────────────────────────────────────────
  async function carregarCandidatos() {
    if (!vendaId) return;
    loading = true;
    erro = null;
    candidatos = [];
    selecionados = new Set();
    confirmando = false;
    filtro = '';
    try {
      const res = await fetch(`/api/v1/vendas/merge-candidates?venda_id=${vendaId}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      candidatos = data.items || [];
    } catch (e: any) {
      erro = e?.message || 'Erro ao carregar vendas do cliente.';
    } finally {
      loading = false;
    }
  }

  // ─── Mesclar ───────────────────────────────────────────────────────────────
  async function executarMescla() {
    if (!podeMesclar) return;
    mesclando = true;
    erro = null;
    try {
      const res = await fetch('/api/v1/vendas/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venda_id: vendaId,
          merge_ids: Array.from(selecionados)
        })
      });
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      toast.success(
        `Vendas mescladas com sucesso! ${result.removed_pagamentos > 0 ? `${result.removed_pagamentos} pagamento(s) duplicado(s) removido(s).` : ''}`
      );
      onMerged();
      fechar();
    } catch (e: any) {
      erro = e?.message || 'Erro ao mesclar vendas.';
      confirmando = false;
    } finally {
      mesclando = false;
    }
  }

  function fechar() {
    if (mesclando) return;
    selecionados = new Set();
    candidatos = [];
    erro = null;
    confirmando = false;
    filtro = '';
    onClose();
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────
  $: if (open && vendaId) carregarCandidatos();
</script>

{#if open}
  <div
    class="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"
    on:click|self={fechar}
    on:keydown={(e) => e.key === 'Escape' && fechar()}
    role="dialog"
    aria-modal="true"
    tabindex="0"
  >
    <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden">

      <!-- Header -->
      <div class="vtur-modal-header border-b border-slate-100 bg-vendas-50 flex-shrink-0">
        <div class="vtur-modal-header__lead">
          <div class="vtur-modal-header__icon bg-vendas-100">
            <Merge size={20} class="text-vendas-600" />
          </div>
          <div class="vtur-modal-header__copy">
            <h3 class="vtur-modal-header__title">Mesclar Vendas</h3>
            <p class="vtur-modal-header__subtitle">
              Venda principal: <span class="font-semibold text-slate-700">{vendaCodigo || vendaId.slice(0,8).toUpperCase()}</span>
            </p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" class_name="vtur-modal-header__close p-2" ariaLabel="Fechar" on:click={fechar}>
          <X size={18} />
        </Button>
      </div>

      <!-- Aviso -->
      <div class="vtur-modal-notice flex-shrink-0 mx-4 mt-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 flex gap-2 items-start">
        <AlertTriangle size={15} class="text-amber-600 mt-0.5 flex-shrink-0" />
        <p class="text-xs text-amber-800">
          As vendas selecionadas serão <strong>absorvidas</strong> pela venda principal — seus recibos e pagamentos serão migrados e as vendas secundárias excluídas. Esta ação <strong>não pode ser desfeita</strong>.
        </p>
      </div>

      <!-- Conteúdo -->
      <div class="vtur-modal-body-dense flex-1 space-y-3">

        {#if loading}
          <div class="flex items-center justify-center py-12 gap-3 text-slate-500">
            <Loader2 size={20} class="animate-spin" />
            <span class="text-sm">Buscando outras vendas do cliente...</span>
          </div>

        {:else if erro}
          <div class="vtur-modal-notice rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex gap-2 items-center">
            <AlertTriangle size={16} class="text-red-500 flex-shrink-0" />
            <p class="text-sm text-red-700">{erro}</p>
          </div>

        {:else if candidatos.length === 0}
          <div class="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
            <CheckCircle size={32} class="text-slate-300" />
            <div class="text-center">
              <p class="text-sm font-medium text-slate-600">Nenhuma venda encontrada</p>
              <p class="text-xs text-slate-400 mt-1">Não há outras vendas do mesmo cliente e vendedor para mesclar.</p>
            </div>
          </div>

        {:else}
          <!-- Filtro e contador -->
          <div class="vtur-modal-grid-compact flex items-center gap-3">
            <div class="relative flex-1">
              <Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                bind:value={filtro}
                placeholder="Filtrar por destino ou recibo..."
                class="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-vendas-200 focus:border-vendas-400"
              />
            </div>
            <span class="text-xs text-slate-500 whitespace-nowrap">
              {candidatos.length} venda{candidatos.length !== 1 ? 's' : ''} disponível{candidatos.length !== 1 ? 'is' : ''}
            </span>
          </div>

          <!-- Lista de candidatos -->
          <div class="space-y-2">
            {#each candidatosFiltrados as c (c.id)}
              {@const sel = selecionados.has(c.id)}
              <button
                type="button"
                on:click={() => toggleSelecionado(c.id)}
                class="vtur-modal-list-item w-full text-left rounded-xl border-2 px-4 py-3 transition-all
                  {sel
                    ? 'border-vendas-400 bg-vendas-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}"
              >
                <div class="flex items-start justify-between gap-3">
                  <!-- Checkbox visual -->
                  <div class="mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors
                    {sel ? 'bg-vendas-500 border-vendas-500' : 'border-slate-300 bg-white'}">
                    {#if sel}
                      <svg class="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                        <path d="M1 4l3 3 5-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    {/if}
                  </div>

                  <!-- Dados da venda -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      {#if c.numeros_recibo.length > 0}
                        {#each c.numeros_recibo as nr}
                          <span class="inline-flex items-center gap-1 text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            <Receipt size={10} />
                            {nr}
                          </span>
                        {/each}
                      {:else}
                        <span class="text-xs text-slate-400 italic">Sem recibo</span>
                      {/if}
                    </div>

                    <div class="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1">
                      {#if c.destino_nome || c.destino_cidade_nome}
                        <div class="flex items-center gap-1.5 text-xs text-slate-600">
                          <MapPin size={11} class="text-slate-400 flex-shrink-0" />
                          <span class="truncate">{c.destino_nome || c.destino_cidade_nome}</span>
                        </div>
                      {/if}
                      {#if c.data_embarque}
                        <div class="flex items-center gap-1.5 text-xs text-slate-600">
                          <Calendar size={11} class="text-slate-400 flex-shrink-0" />
                          <span>{fmtDate(c.data_embarque)}{c.data_final ? ` → ${fmtDate(c.data_final)}` : ''}</span>
                        </div>
                      {/if}
                      {#if c.data_venda}
                        <div class="flex items-center gap-1.5 text-xs text-slate-500">
                          <span class="text-slate-400">Lançada:</span>
                          <span>{fmtDate(c.data_venda)}</span>
                        </div>
                      {/if}
                      {#if c.valor_total}
                        <div class="flex items-center gap-1.5 text-xs text-slate-600">
                          <DollarSign size={11} class="text-slate-400 flex-shrink-0" />
                          <span class="font-medium">{fmt(c.valor_total)}</span>
                        </div>
                      {/if}
                    </div>
                  </div>
                </div>
              </button>
            {/each}

            {#if candidatosFiltrados.length === 0 && filtro}
              <p class="text-center text-sm text-slate-400 py-4">Nenhuma venda corresponde ao filtro.</p>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="flex-shrink-0 border-t border-slate-100 p-4">

        {#if confirmando}
          <!-- Passo de confirmação -->
          <div class="vtur-modal-notice rounded-lg bg-red-50 border border-red-200 px-4 py-3 mb-3">
            <p class="text-sm font-semibold text-red-800 mb-1">Confirmar mesclagem?</p>
            <p class="text-xs text-red-700">
              {totalSelecionados} venda{totalSelecionados !== 1 ? 's' : ''} será{totalSelecionados !== 1 ? 'ão' : ''} mesclada{totalSelecionados !== 1 ? 's' : ''} na venda principal e excluída{totalSelecionados !== 1 ? 's' : ''} permanentemente.
            </p>
          </div>
          <div class="flex justify-end gap-2">
            <Button variant="secondary" on:click={() => confirmando = false} disabled={mesclando}>
              Cancelar
            </Button>
            <Button variant="primary" color="vendas" on:click={executarMescla} disabled={mesclando}>
              {#if mesclando}
                <Loader2 size={15} class="animate-spin mr-1.5" />
                Mesclando...
              {:else}
                <Merge size={15} class="mr-1.5" />
                Confirmar Mesclagem
              {/if}
            </Button>
          </div>

        {:else}
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm text-slate-500">
              {#if totalSelecionados > 0}
                <span class="font-semibold text-vendas-700">{totalSelecionados}</span>
                venda{totalSelecionados !== 1 ? 's' : ''} selecionada{totalSelecionados !== 1 ? 's' : ''}
              {:else}
                Selecione ao menos uma venda para mesclar
              {/if}
            </span>
            <div class="flex gap-2">
              <Button variant="secondary" on:click={fechar}>Cancelar</Button>
              <Button
                variant="primary"
                color="vendas"
                disabled={!podeMesclar}
                on:click={() => confirmando = true}
              >
                <Merge size={15} class="mr-1.5" />
                Mesclar vendas
              </Button>
            </div>
          </div>
        {/if}

      </div>
    </div>
  </div>
{/if}
