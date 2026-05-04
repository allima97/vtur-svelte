<script lang="ts">
  import { Search, Wrench } from 'lucide-svelte';
  import AlertMessage from '$lib/components/ui/AlertMessage.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import SimpleTable from '$lib/components/ui/SimpleTable.svelte';
  import FieldInput from '$lib/components/ui/form/FieldInput.svelte';
  import FieldSelect from '$lib/components/ui/form/FieldSelect.svelte';
  import { apiGet, apiPost } from '$lib/services/api';

  const API_ENDPOINT = '/api/v1/admin/fix-recibos';

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

  type UserOption = {
    id: string;
    nome_completo: string;
  };

  const FIX_OPTIONS = [
    { value: 'fix_vendor', label: 'Trocar vendedor atribuido no ranking' },
    { value: 'fix_valor', label: 'Corrigir valores financeiros' }
  ];

  let docs = '';
  let rows: ConcRow[] = [];
  let loading = false;
  let message = '';
  let errorMsg = '';

  let fixId = '';
  let fixAction = 'fix_vendor';
  let fixVendedorId = '';
  let fixValorLancamentos = '';
  let fixValorVendaReal = '';

  let userSearch = '';
  let userResults: UserOption[] = [];
  let userSearchLoading = false;

  function formatMoney(value: number) {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function parseMoneyInput(value: string) {
    const normalized = String(value || '')
      .trim()
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  async function fetchDocs() {
    if (!docs.trim()) {
      errorMsg = 'Informe pelo menos um recibo/documento.';
      rows = [];
      message = '';
      return;
    }

    loading = true;
    errorMsg = '';
    rows = [];

    try {
      const data: any = await apiGet(API_ENDPOINT, { docs });
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
      const data: any = await apiGet(API_ENDPOINT, { busca_usuario: userSearch });
      userResults = data.usuarios || [];
    } finally {
      userSearchLoading = false;
    }
  }

  async function applyFix() {
    if (!fixId) {
      errorMsg = 'Selecione um registro primeiro.';
      return;
    }

    loading = true;
    errorMsg = '';
    message = '';

    try {
      const body: any = { action: fixAction, id: fixId };

      if (fixAction === 'fix_vendor') {
        if (!fixVendedorId.trim()) {
          errorMsg = 'Informe o vendedor_id.';
          loading = false;
          return;
        }
        body.vendedor_id = fixVendedorId.trim();
      } else if (fixAction === 'fix_valor') {
        if (fixValorLancamentos) {
          const parsed = parseMoneyInput(fixValorLancamentos);
          if (parsed == null) {
            errorMsg = 'valor_lancamentos invalido.';
            loading = false;
            return;
          }
          body.valor_lancamentos = parsed;
        }
        if (fixValorVendaReal) {
          const parsed = parseMoneyInput(fixValorVendaReal);
          if (parsed == null) {
            errorMsg = 'valor_venda_real invalido.';
            loading = false;
            return;
          }
          body.valor_venda_real = parsed;
        }
      }

      const data: any = await apiPost(API_ENDPOINT, body);
      message = `Correção aplicada. Registro atualizado: ${JSON.stringify(data.updated)}`;
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

  function useUser(user: UserOption) {
    fixVendedorId = user.id;
    userResults = [];
    userSearch = user.nome_completo;
  }
</script>

<PageHeader
  title="Correção de recibos"
  subtitle="Ferramenta administrativa para diagnosticar e corrigir registros de conciliação."
  color="financeiro"
  breadcrumbs={[
    { label: 'Admin' },
    { label: 'Correção de recibos' }
  ]}
/>

<div class="space-y-4">
  <Card title="Busca">
    <div class="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
      <FieldInput
        label="Documentos"
        bind:value={docs}
        placeholder="Ex.: 5630-0000084181, 084181 ou 84181"
        helper="Use recibos completos ou apenas os números. A busca normaliza os formatos CVC."
      />
      <Button variant="primary" color="financeiro" loading={loading} on:click={fetchDocs}>
        <Search size={16} class="mr-2" />
        Buscar
      </Button>
    </div>
  </Card>

  {#if errorMsg}
    <AlertMessage variant="error" title="Nao foi possivel concluir" message={errorMsg} />
  {/if}

  {#if message}
    <AlertMessage variant="success" message={message} />
  {/if}

  <SimpleTable title="Registros encontrados" empty={rows.length === 0 && !loading} emptyMessage="Nenhuma linha encontrada. Verifique os documentos informados.">
    <thead>
      <tr>
        <th>Documento</th>
        <th>Data</th>
        <th class="text-right">Valor lanc.</th>
        <th class="text-right">Valor real</th>
        <th>Vendedor atual</th>
        <th>ID</th>
        <th class="text-right">Acao</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as row}
        <tr class={fixId === row.id ? 'bg-amber-50' : ''}>
          <td class="font-mono font-semibold">{row.documento}</td>
          <td>{row.movimento_data?.slice(0, 10)}</td>
          <td class="text-right font-mono {Number(row.valor_lancamentos) < 1000 ? 'font-semibold text-red-600' : ''}">
            {formatMoney(row.valor_lancamentos)}
          </td>
          <td class="text-right font-mono">{formatMoney(row.valor_venda_real)}</td>
          <td>{row.ranking_vendedor_nome || '-'}</td>
          <td class="font-mono text-xs text-slate-400">{row.id?.slice(0, 8)}...</td>
          <td class="text-right">
            <Button variant="ghost" size="xs" on:click={() => selectRow(row)}>
              Selecionar
            </Button>
          </td>
        </tr>
      {/each}
    </tbody>
  </SimpleTable>

  <Card title="Aplicar correcao" subtitle="Use somente para ajustes auditados. A alteracao chama o endpoint administrativo existente.">
    <div class="space-y-4">
      <FieldInput
        label="ID do registro selecionado"
        bind:value={fixId}
        placeholder="Clique em Selecionar na tabela acima"
        readonly={Boolean(fixId)}
      />

      <FieldSelect
        label="Tipo de correcao"
        bind:value={fixAction}
        options={FIX_OPTIONS}
        placeholder={null}
      />

      {#if fixAction === 'fix_vendor'}
        <div class="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <FieldInput
            label="Buscar vendedor por nome"
            bind:value={userSearch}
            placeholder="Ex: Sandra"
            on:keydown={(e) => e.key === 'Enter' && searchUsers()}
          />
          <Button variant="secondary" loading={userSearchLoading} on:click={searchUsers}>
            Buscar vendedor
          </Button>
        </div>

        {#if userResults.length > 0}
          <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {#each userResults as user}
              <Button
                variant="ghost"
                class_name="w-full justify-start rounded-none border-b border-slate-100 text-left last:border-b-0"
                on:click={() => useUser(user)}
              >
                <span class="font-medium">{user.nome_completo}</span>
                <span class="ml-2 font-mono text-xs text-slate-400">{user.id}</span>
              </Button>
            {/each}
          </div>
        {/if}

        <FieldInput
          label="UUID do novo vendedor"
          bind:value={fixVendedorId}
          placeholder="Cole o UUID aqui ou use a busca acima"
        />
      {:else}
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FieldInput
            label="valor_lancamentos"
            type="number"
            step="0.01"
            bind:value={fixValorLancamentos}
            placeholder="ex: 18148.00"
          />
          <FieldInput
            label="valor_venda_real"
            type="number"
            step="0.01"
            bind:value={fixValorVendaReal}
            placeholder="ex: 18148.00"
          />
        </div>
      {/if}

      <div class="flex justify-end">
        <Button
          variant="primary"
          color="financeiro"
          loading={loading}
          disabled={loading || !fixId}
          on:click={applyFix}
        >
          <Wrench size={16} class="mr-2" />
          Aplicar correcao
        </Button>
      </div>
    </div>
  </Card>
</div>
