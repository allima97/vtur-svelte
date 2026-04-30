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
  let errorMsg = '';

  // Fix fields
  let fixId = '';
  let fixAction = 'fix_vendor';
  let fixVendedorId = '';
  let fixValorLancamentos = '';
  let fixValorVendaReal = '';

  // User search
  let userSearch = '';
  let userResults: {id: string; nome_completo: string}[] = [];
  let userSearchLoading = false;

  async function fetchDocs() {
    loading = true;
    errorMsg = '';
    rows = [];
    try {
      const res = await fetch(`/api/v1/relatorios/ranking-debug?docs=${encodeURIComponent(docs)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || res.statusText);
      rows = data.conciliacao_rows || [];
      message = `${rows.length} linha(s) encontrada(s)`;
    } catch (err: any) {
      errorMsg = err.message || 'Erro ao buscar dados';
    } finally {
      loading = false;
    }
  }

  async function searchUsers() {
    if (!userSearch.trim()) return;
    userSearchLoading = true;
    userResults = [];
    try {
      const res = await fetch(`/api/v1/relatorios/ranking-debug?busca_usuario=${encodeURIComponent(userSearch)}`);
      const data = await res.json();
      userResults = data.usuarios || [];
    } catch {
      // silently ignore
    } finally {
      userSearchLoading = false;
    }
  }

  async function applyFix() {
    if (!fixId) { errorMsg = 'Selecione um registro primeiro'; return; }
    loading = true;
    errorMsg = '';
    message = '';
    try {
      const body: any = { action: fixAction, id: fixId };
      if (fixAction === 'fix_vendor') {
        if (!fixVendedorId.trim()) { errorMsg = 'Informe o vendedor_id'; loading = false; return; }
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
      errorMsg = err.message || 'Erro ao aplicar correção';
    } finally {
      loading = false;
    }
  }

  function selectRow(row: ConcRow) {
    fixId = row.id;
    fixValorLancamentos = String(row.valor_lancamentos ?? '');
    fixValorVendaReal = String(row.valor_venda_real ?? '');
    fixVendedorId = row.ranking_vendedor_id || '';
    errorMsg = '';
    message = '';
  }

  function useUser(user: {id: string; nome_completo: string}) {
    fixVendedorId = user.id;
    userResults = [];
    userSearch = user.nome_completo;
  }

  onMount(fetchDocs);
</script>

<div class="p-6 max-w-5xl mx-auto text-sm">
  <h1 class="text-xl font-bold mb-1">🔧 Correção de Recibos</h1>
  <p class="text-gray-500 mb-4 text-xs">Diagnóstico e correção de dados na tabela conciliacao_recibos</p>

  <div class="flex gap-2 mb-4">
    <input
      class="border px-2 py-1 flex-1 rounded font-mono"
      bind:value={docs}
      placeholder="números separados por vírgula: 084185,083862,084186"
    />
    <button
      class="bg-blue-600 text-white px-4 py-1 rounded"
      on:click={fetchDocs}
      disabled={loading}
    >
      {loading ? '...' : 'Buscar'}
    </button>
  </div>

  {#if errorMsg}
    <div class="bg-red-100 text-red-700 p-3 mb-4 rounded border border-red-200">{errorMsg}</div>
  {/if}
  {#if message}
    <div class="bg-green-100 text-green-700 p-3 mb-4 rounded border border-green-200">{message}</div>
  {/if}

  {#if rows.length > 0}
    <table class="w-full border-collapse text-xs mb-6 shadow-sm">
      <thead>
        <tr class="bg-gray-100 text-gray-700">
          <th class="border px-2 py-1.5 text-left">Doc</th>
          <th class="border px-2 py-1.5 text-left">Data</th>
          <th class="border px-2 py-1.5 text-right">Valor Lanç.</th>
          <th class="border px-2 py-1.5 text-right">Valor Real</th>
          <th class="border px-2 py-1.5 text-left">Vendedor Atual</th>
          <th class="border px-2 py-1.5 text-left">ID (parcial)</th>
          <th class="border px-2 py-1.5"></th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row}
          <tr class="{fixId === row.id ? 'bg-yellow-50 ring-1 ring-yellow-300' : 'hover:bg-gray-50'} transition-colors">
            <td class="border px-2 py-1.5 font-bold font-mono">{row.documento}</td>
            <td class="border px-2 py-1.5">{row.movimento_data?.slice(0,10)}</td>
            <td class="border px-2 py-1.5 text-right font-mono {Number(row.valor_lancamentos) < 1000 ? 'text-red-600 font-bold' : ''}">
              R$ {Number(row.valor_lancamentos)?.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}
            </td>
            <td class="border px-2 py-1.5 text-right font-mono">
              R$ {Number(row.valor_venda_real)?.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}
            </td>
            <td class="border px-2 py-1.5">{row.ranking_vendedor_nome}</td>
            <td class="border px-2 py-1.5 text-gray-400 font-mono">{row.id?.slice(0,8)}…</td>
            <td class="border px-2 py-1.5">
              <button
                class="text-blue-600 underline hover:text-blue-800"
                on:click={() => selectRow(row)}
              >Selecionar</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    <!-- Fix Panel -->
    <div class="border rounded-lg p-4 bg-gray-50 shadow-sm">
      <h2 class="font-bold mb-3 text-base">Aplicar Correção</h2>

      <div class="mb-3">
        <label class="block text-gray-500 text-xs mb-1">ID do registro selecionado</label>
        <input
          class="border px-2 py-1 w-full rounded font-mono text-xs bg-white"
          bind:value={fixId}
          placeholder="Clique em 'Selecionar' na tabela acima"
        />
      </div>

      <div class="mb-4">
        <label class="block text-gray-500 text-xs mb-1">Tipo de correção</label>
        <select class="border px-2 py-1.5 rounded bg-white" bind:value={fixAction}>
          <option value="fix_vendor">Trocar vendedor atribuído (ranking_vendedor_id)</option>
          <option value="fix_valor">Corrigir valores financeiros</option>
        </select>
      </div>

      {#if fixAction === 'fix_vendor'}
        <div class="mb-3">
          <label class="block text-gray-500 text-xs mb-1">Buscar novo vendedor por nome</label>
          <div class="flex gap-2 mb-1">
            <input
              class="border px-2 py-1 flex-1 rounded bg-white"
              bind:value={userSearch}
              placeholder="Ex: Sandra"
              on:keydown={(e) => e.key === 'Enter' && searchUsers()}
            />
            <button
              class="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
              on:click={searchUsers}
              disabled={userSearchLoading}
            >
              {userSearchLoading ? '...' : 'Buscar'}
            </button>
          </div>
          {#if userResults.length > 0}
            <div class="border rounded bg-white shadow-sm mb-2">
              {#each userResults as user}
                <button
                  class="w-full text-left px-3 py-1.5 hover:bg-blue-50 border-b last:border-b-0 flex items-center gap-2"
                  on:click={() => useUser(user)}
                >
                  <span class="font-medium">{user.nome_completo}</span>
                  <span class="text-gray-400 font-mono text-xs">{user.id}</span>
                </button>
              {/each}
            </div>
          {/if}
          <label class="block text-gray-500 text-xs mb-1 mt-2">UUID do novo vendedor</label>
          <input
            class="border px-2 py-1 w-full rounded font-mono text-xs bg-white"
            bind:value={fixVendedorId}
            placeholder="UUID — cole aqui ou use a busca acima"
          />
        </div>
      {:else}
        <div class="mb-3 flex gap-4">
          <div class="flex-1">
            <label class="block text-gray-500 text-xs mb-1">valor_lancamentos (novo valor)</label>
            <input
              class="border px-2 py-1 w-full rounded font-mono bg-white"
              bind:value={fixValorLancamentos}
              placeholder="ex: 18148.00"
              type="number"
              step="0.01"
            />
          </div>
          <div class="flex-1">
            <label class="block text-gray-500 text-xs mb-1">valor_venda_real (novo valor)</label>
            <input
              class="border px-2 py-1 w-full rounded font-mono bg-white"
              bind:value={fixValorVendaReal}
              placeholder="ex: 18148.00"
              type="number"
              step="0.01"
            />
          </div>
        </div>
      {/if}

      <button
        class="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded font-bold disabled:opacity-50 transition-colors"
        on:click={applyFix}
        disabled={loading || !fixId}
      >
        {loading ? 'Aplicando...' : '⚡ Aplicar Correção'}
      </button>
    </div>
  {:else if !loading}
    <p class="text-gray-500 italic">Nenhuma linha encontrada. Verifique os números dos documentos.</p>
  {/if}
</div>
