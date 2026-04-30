<script lang="ts">
  import { onMount } from 'svelte';

  type ConcRow = {
    id: string;
    documento: string;
    status: string;
    descricao: string;
    movimento_data: string;
    valor_lancamentos: number;
    valor_venda_real: number;
    ranking_vendedor_id: string;
    ranking_vendedor_nome: string;
    company_id: string;
  };

  let docs = '084185,083862,084186';
  let rows: ConcRow[] = [];
  let loading = false;
  let message = '';
  let error = '';

  // Fix fields
  let fixId = '';
  let fixAction = 'fix_vendor';
  let fixVendedorId = '';
  let fixValorLancamentos = '';
  let fixValorVendaReal = '';

  async function fetchDocs() {
    loading = true;
    error = '';
    rows = [];
    try {
      const res = await fetch(`/api/v1/relatorios/ranking-debug?docs=${encodeURIComponent(docs)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || res.statusText);
      rows = data.conciliacao_rows || [];
      message = `${rows.length} linha(s) encontrada(s)`;
    } catch (err: any) {
      error = err.message || 'Erro ao buscar dados';
    } finally {
      loading = false;
    }
  }

  async function applyFix() {
    if (!fixId) { error = 'Selecione um ID'; return; }
    loading = true;
    error = '';
    message = '';
    try {
      const body: any = { action: fixAction, id: fixId };
      if (fixAction === 'fix_vendor') {
        body.vendedor_id = fixVendedorId.trim();
      } else if (fixAction === 'fix_valor') {
        if (fixValorLancamentos) body.valor_lancamentos = parseFloat(fixValorLancamentos);
        if (fixValorVendaReal) body.valor_venda_real = parseFloat(fixValorVendaReal);
      }
      const res = await fetch('/api/v1/relatorios/ranking-debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || res.statusText);
      message = `✅ Corrigido! ${JSON.stringify(data.updated)}`;
      await fetchDocs();
    } catch (err: any) {
      error = err.message || 'Erro ao aplicar correção';
    } finally {
      loading = false;
    }
  }

  function selectRow(row: ConcRow) {
    fixId = row.id;
    fixValorLancamentos = String(row.valor_lancamentos ?? '');
    fixValorVendaReal = String(row.valor_venda_real ?? '');
    fixVendedorId = row.ranking_vendedor_id || '';
  }

  onMount(fetchDocs);
</script>

<div class="p-6 max-w-5xl mx-auto font-mono text-sm">
  <h1 class="text-xl font-bold mb-4">🔧 Correção de Recibos — Conciliação</h1>

  <div class="flex gap-2 mb-4">
    <input
      class="border px-2 py-1 flex-1 rounded"
      bind:value={docs}
      placeholder="números separados por vírgula"
    />
    <button
      class="bg-blue-600 text-white px-4 py-1 rounded"
      on:click={fetchDocs}
      disabled={loading}
    >
      {loading ? '...' : 'Buscar'}
    </button>
  </div>

  {#if error}
    <div class="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>
  {/if}
  {#if message}
    <div class="bg-green-100 text-green-700 p-2 mb-4 rounded">{message}</div>
  {/if}

  {#if rows.length > 0}
    <table class="w-full border-collapse text-xs mb-6">
      <thead>
        <tr class="bg-gray-100">
          <th class="border px-2 py-1 text-left">Doc</th>
          <th class="border px-2 py-1 text-left">Data</th>
          <th class="border px-2 py-1 text-right">Valor Lanç.</th>
          <th class="border px-2 py-1 text-right">Valor Real</th>
          <th class="border px-2 py-1 text-left">Vendedor</th>
          <th class="border px-2 py-1 text-left">ID</th>
          <th class="border px-2 py-1"></th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row}
          <tr class={fixId === row.id ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
            <td class="border px-2 py-1 font-bold">{row.documento}</td>
            <td class="border px-2 py-1">{row.movimento_data?.slice(0,10)}</td>
            <td class="border px-2 py-1 text-right {row.valor_lancamentos < 1000 ? 'text-red-600 font-bold' : ''}">
              {row.valor_lancamentos?.toLocaleString('pt-BR', {minimumFractionDigits:2})}
            </td>
            <td class="border px-2 py-1 text-right">
              {row.valor_venda_real?.toLocaleString('pt-BR', {minimumFractionDigits:2})}
            </td>
            <td class="border px-2 py-1">{row.ranking_vendedor_nome}</td>
            <td class="border px-2 py-1 text-gray-400">{row.id?.slice(0,8)}…</td>
            <td class="border px-2 py-1">
              <button
                class="text-blue-600 underline"
                on:click={() => selectRow(row)}
              >Selecionar</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    <div class="border rounded p-4 bg-gray-50">
      <h2 class="font-bold mb-3">Aplicar Correção</h2>

      <div class="mb-2">
        <label class="block text-gray-600">ID Selecionado:</label>
        <input class="border px-2 py-1 w-full rounded font-mono text-xs" bind:value={fixId} placeholder="UUID do registro" />
      </div>

      <div class="mb-3">
        <label class="block text-gray-600">Tipo de correção:</label>
        <select class="border px-2 py-1 rounded" bind:value={fixAction}>
          <option value="fix_vendor">Trocar vendedor (ranking_vendedor_id)</option>
          <option value="fix_valor">Corrigir valores (valor_lancamentos / valor_venda_real)</option>
        </select>
      </div>

      {#if fixAction === 'fix_vendor'}
        <div class="mb-3">
          <label class="block text-gray-600">Novo vendedor_id (UUID):</label>
          <input class="border px-2 py-1 w-full rounded font-mono text-xs" bind:value={fixVendedorId} placeholder="UUID do novo vendedor" />
        </div>
      {:else}
        <div class="mb-2 flex gap-2">
          <div class="flex-1">
            <label class="block text-gray-600">valor_lancamentos:</label>
            <input class="border px-2 py-1 w-full rounded" bind:value={fixValorLancamentos} placeholder="ex: 18148.00" type="number" step="0.01" />
          </div>
          <div class="flex-1">
            <label class="block text-gray-600">valor_venda_real:</label>
            <input class="border px-2 py-1 w-full rounded" bind:value={fixValorVendaReal} placeholder="ex: 18148.00" type="number" step="0.01" />
          </div>
        </div>
      {/if}

      <button
        class="bg-orange-500 text-white px-6 py-2 rounded font-bold"
        on:click={applyFix}
        disabled={loading || !fixId}
      >
        {loading ? 'Aplicando...' : '⚡ Aplicar Correção'}
      </button>
    </div>
  {/if}
</div>
