<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { 
    Plus, Edit2, Trash2, Percent, TrendingUp, 
    CheckCircle, XCircle, Layers, Users 
  } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';

  interface Tier {
    id?: string;
    faixa: 'PRE' | 'POS';
    ordem: number;
    de_pct: number;
    ate_pct: number;
    inc_pct_meta: number;
    inc_pct_comissao: number;
  }

  interface Regra {
    id: string;
    nome: string;
    descricao: string | null;
    tipo: 'GERAL' | 'ESCALONAVEL';
    meta_nao_atingida: number;
    meta_atingida: number;
    super_meta: number;
    ativo: boolean;
    company_id: string;
    created_at: string;
    updated_at: string;
    tiers: Tier[];
    vendedores_count?: number;
  }

  let regras: Regra[] = [];
  let loading = true;
  let showDialog = false;
  let showDeleteDialog = false;
  let showVendedoresDialog = false;
  let editingRegra: Regra | null = null;
  let deletingRegra: Regra | null = null;
  let selectedRegra: Regra | null = null;
  let vendedoresRegra: any[] = [];
  
  // Formulário
  let formData = {
    nome: '',
    descricao: '',
    tipo: 'GERAL' as 'GERAL' | 'ESCALONAVEL',
    meta_nao_atingida: 0,
    meta_atingida: 0,
    super_meta: 0,
    ativo: true,
    tiers: [] as Tier[]
  };

  // Vendedores disponíveis
  let vendedoresDisponiveis: any[] = [];
  let selectedVendedor = '';

  const columns = [
    { key: 'nome', label: 'Nome', sortable: true },
    { key: 'tipo', label: 'Tipo', sortable: true, width: '140px' },
    { 
      key: 'percentual', 
      label: '% Base', 
      sortable: true, 
      width: '100px',
      align: 'center' as const,
      formatter: (_: any, row: Regra) => `${row.meta_atingida}%`
    },
    { 
      key: 'vendedores', 
      label: 'Vendedores', 
      sortable: false, 
      width: '120px',
      align: 'center' as const,
      formatter: (_: any, row: Regra) => String(row.vendedores_count || 0)
    },
    { 
      key: 'ativo', 
      label: 'Status', 
      sortable: true, 
      width: '100px',
      formatter: (value: boolean) => value 
        ? '<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Ativo</span>'
        : '<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">Inativo</span>'
    },
    { 
      key: 'updated_at', 
      label: 'Atualizado', 
      sortable: true, 
      width: '150px',
      formatter: (value: string) => value ? new Date(value).toLocaleDateString('pt-BR') : '-'
    }
  ];

  onMount(() => {
    loadRegras();
    loadVendedores();
  });

  async function loadRegras() {
    loading = true;
    try {
      const response = await fetch('/api/v1/financeiro/comissoes/regras');
      if (!response.ok) throw new Error('Erro ao carregar regras');
      
      const data = await response.json();
      regras = data.items || [];
      
      // Carrega contagem de vendedores para cada regra
      await loadVendedoresCount();
    } catch (err) {
      toast.error('Erro ao carregar regras de comissão');
      console.error(err);
    } finally {
      loading = false;
    }
  }

  async function loadVendedoresCount() {
    try {
      const response = await fetch('/api/v1/financeiro/comissoes/vendedores');
      if (!response.ok) return;
      
      const data = await response.json();
      const vendedoresPorRegra = (data.items || []).reduce((acc: any, item: any) => {
        if (!acc[item.regra_id]) acc[item.regra_id] = 0;
        if (item.vigente) acc[item.regra_id]++;
        return acc;
      }, {});
      
      regras = regras.map(r => ({
        ...r,
        vendedores_count: vendedoresPorRegra[r.id] || 0
      }));
    } catch (err) {
      console.error('Erro ao carregar contagem de vendedores:', err);
    }
  }

  async function loadVendedores() {
    try {
      const response = await fetch('/api/v1/tarefas/usuarios');
      if (response.ok) {
        const data = await response.json();
        vendedoresDisponiveis = data.items || [];
      }
    } catch (err) {
      console.error('Erro ao carregar vendedores:', err);
    }
  }

  async function loadVendedoresRegra(regraId: string) {
    try {
      const response = await fetch(`/api/v1/financeiro/comissoes/vendedores?regra_id=${regraId}`);
      if (!response.ok) throw new Error('Erro ao carregar vendedores');
      
      const data = await response.json();
      vendedoresRegra = data.items || [];
    } catch (err) {
      toast.error('Erro ao carregar vendedores da regra');
    }
  }

  function openNewDialog() {
    editingRegra = null;
    formData = {
      nome: '',
      descricao: '',
      tipo: 'GERAL',
      meta_nao_atingida: 0,
      meta_atingida: 0,
      super_meta: 0,
      ativo: true,
      tiers: []
    };
    showDialog = true;
  }

  function openEditDialog(regra: Regra) {
    editingRegra = regra;
    formData = {
      nome: regra.nome,
      descricao: regra.descricao || '',
      tipo: regra.tipo,
      meta_nao_atingida: regra.meta_nao_atingida,
      meta_atingida: regra.meta_atingida,
      super_meta: regra.super_meta,
      ativo: regra.ativo,
      tiers: regra.tiers || []
    };
    showDialog = true;
  }

  function openDeleteDialog(regra: Regra) {
    deletingRegra = regra;
    showDeleteDialog = true;
  }

  async function openVendedoresDialog(regra: Regra) {
    selectedRegra = regra;
    selectedVendedor = '';
    await loadVendedoresRegra(regra.id);
    showVendedoresDialog = true;
  }

  function addTier() {
    formData.tiers = [...formData.tiers, {
      faixa: 'PRE',
      ordem: formData.tiers.length,
      de_pct: 0,
      ate_pct: 100,
      inc_pct_meta: 0,
      inc_pct_comissao: 0
    }];
  }

  function removeTier(index: number) {
    formData.tiers = formData.tiers.filter((_, i) => i !== index);
  }

  async function handleSave() {
    try {
      const url = editingRegra 
        ? `/api/v1/financeiro/comissoes/regras/${editingRegra.id}`
        : '/api/v1/financeiro/comissoes/regras';
      
      const method = editingRegra ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      toast.success(editingRegra ? 'Regra atualizada com sucesso' : 'Regra criada com sucesso');
      showDialog = false;
      await loadRegras();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar regra');
    }
  }

  async function handleDelete() {
    if (!deletingRegra) return;

    try {
      const response = await fetch(`/api/v1/financeiro/comissoes/regras/${deletingRegra.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      toast.success('Regra excluída com sucesso');
      showDeleteDialog = false;
      deletingRegra = null;
      await loadRegras();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir regra');
    }
  }

  async function handleAddVendedor() {
    if (!selectedRegra || !selectedVendedor) return;

    try {
      const response = await fetch('/api/v1/financeiro/comissoes/vendedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendedor_id: selectedVendedor,
          regra_id: selectedRegra.id
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      toast.success('Vendedor associado com sucesso');
      selectedVendedor = '';
      await loadVendedoresRegra(selectedRegra.id);
      await loadRegras();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao associar vendedor');
    }
  }

  $: regrasAtivas = regras.filter(r => r.ativo).length;
  $: regrasEscalonaveis = regras.filter(r => r.tipo === 'ESCALONAVEL').length;
</script>

<svelte:head>
  <title>Regras de Comissão | VTUR</title>
</svelte:head>

<PageHeader 
  title="Regras de Comissão"
  subtitle="Configure as regras de comissão para vendedores"
  color="financeiro"
  breadcrumbs={[
    { label: 'Financeiro', href: '/financeiro' },
    { label: 'Comissões', href: '/financeiro/comissoes' },
    { label: 'Regras' }
  ]}
  actions={[
    {
      label: 'Nova Regra',
      onClick: openNewDialog,
      variant: 'primary',
      icon: Plus
    }
  ]}
/>

<!-- Resumo -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  <div class="vtur-card p-4 border-l-4 border-l-financeiro-500">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-slate-500">Total de Regras</p>
        <p class="text-2xl font-bold text-slate-900">{regras.length}</p>
      </div>
      <div class="p-3 bg-financeiro-50 rounded-lg">
        <Percent size={24} class="text-financeiro-600" />
      </div>
    </div>
  </div>

  <div class="vtur-card p-4 border-l-4 border-l-green-500">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-slate-500">Regras Ativas</p>
        <p class="text-2xl font-bold text-slate-900">{regrasAtivas}</p>
      </div>
      <div class="p-3 bg-green-50 rounded-lg">
        <CheckCircle size={24} class="text-green-600" />
      </div>
    </div>
  </div>

  <div class="vtur-card p-4 border-l-4 border-l-blue-500">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-slate-500">Escalonáveis</p>
        <p class="text-2xl font-bold text-slate-900">{regrasEscalonaveis}</p>
      </div>
      <div class="p-3 bg-blue-50 rounded-lg">
        <TrendingUp size={24} class="text-blue-600" />
      </div>
    </div>
  </div>

  <div class="vtur-card p-4 border-l-4 border-l-amber-500">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-slate-500">Vendedores</p>
        <p class="text-2xl font-bold text-slate-900">
          {regras.reduce((acc, r) => acc + (r.vendedores_count || 0), 0)}
        </p>
      </div>
      <div class="p-3 bg-amber-50 rounded-lg">
        <Users size={24} class="text-amber-600" />
      </div>
    </div>
  </div>
</div>

<!-- Lista de Regras -->
<DataTable
  {columns}
  data={regras}
  color="financeiro"
  {loading}
  title="Regras Cadastradas"
  searchable={true}
  filterable={true}
  filters={[
    {
      key: 'tipo',
      label: 'Tipo',
      type: 'select',
      options: [
        { value: 'GERAL', label: 'Geral' },
        { value: 'ESCALONAVEL', label: 'Escalonável' }
      ]
    },
    {
      key: 'ativo',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'true', label: 'Ativo' },
        { value: 'false', label: 'Inativo' }
      ]
    }
  ]}
  emptyMessage="Nenhuma regra de comissão encontrada"
>
  <svelte:fragment slot="actions" let:row>
    <div class="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        on:click={() => openVendedoresDialog(row)}
        title="Gerenciar vendedores"
      >
        <Users size={16} />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        on:click={() => openEditDialog(row)}
        title="Editar"
      >
        <Edit2 size={16} />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        color="danger"
        on:click={() => openDeleteDialog(row)}
        title="Excluir"
      >
        <Trash2 size={16} />
      </Button>
    </div>
  </svelte:fragment>
</DataTable>

<!-- Dialog de Cadastro/Edição -->
<Dialog
  bind:open={showDialog}
  title={editingRegra ? 'Editar Regra' : 'Nova Regra de Comissão'}
  color="financeiro"
  showCancel={true}
  cancelText="Cancelar"
  showConfirm={true}
  confirmText={editingRegra ? 'Salvar' : 'Criar'}
  onConfirm={handleSave}
>
  <div class="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">
        Nome <span class="text-red-500">*</span>
      </label>
      <input
        type="text"
        bind:value={formData.nome}
        class="vtur-input w-full"
        placeholder="Ex: Comissão Padrão 10%"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
      <textarea
        bind:value={formData.descricao}
        rows="2"
        class="vtur-input w-full"
        placeholder="Descrição opcional da regra..."
      />
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
        <select bind:value={formData.tipo} class="vtur-input w-full">
          <option value="GERAL">Geral (Fixo)</option>
          <option value="ESCALONAVEL">Escalonável (Faixas)</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Status</label>
        <select bind:value={formData.ativo} class="vtur-input w-full">
          <option value={true}>Ativo</option>
          <option value={false}>Inativo</option>
        </select>
      </div>
    </div>

    <div class="border-t pt-4">
      <h4 class="font-medium text-slate-900 mb-3 flex items-center gap-2">
        <Percent size={16} />
        Percentuais
      </h4>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Meta Não Atingida (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            bind:value={formData.meta_nao_atingida}
            class="vtur-input w-full"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Meta Atingida (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            bind:value={formData.meta_atingida}
            class="vtur-input w-full"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Super Meta (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            bind:value={formData.super_meta}
            class="vtur-input w-full"
          />
        </div>
      </div>
    </div>

    {#if formData.tipo === 'ESCALONAVEL'}
      <div class="border-t pt-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-medium text-slate-900 flex items-center gap-2">
            <Layers size={16} />
            Faixas Escalonáveis
          </h4>
          <Button variant="secondary" size="sm" on:click={addTier}>
            <Plus size={14} class="mr-1" />
            Adicionar Faixa
          </Button>
        </div>

        {#if formData.tiers.length === 0}
          <p class="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded">
            Nenhuma faixa configurada. Clique em "Adicionar Faixa" para criar.
          </p>
        {:else}
          <div class="space-y-2 max-h-48 overflow-y-auto">
            {#each formData.tiers as tier, index}
              <div class="p-3 bg-slate-50 rounded-lg border">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium">Faixa {index + 1}</span>
                  <button
                    on:click={() => removeTier(index)}
                    class="text-red-500 hover:text-red-700"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <select bind:value={tier.faixa} class="vtur-input">
                    <option value="PRE">Pré-meta</option>
                    <option value="POS">Pós-meta</option>
                  </select>
                  <input
                    type="number"
                    bind:value={tier.de_pct}
                    placeholder="De %"
                    class="vtur-input"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                  <input
                    type="number"
                    bind:value={tier.ate_pct}
                    placeholder="Até %"
                    class="vtur-input"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                  <input
                    type="number"
                    bind:value={tier.inc_pct_comissao}
                    placeholder="Inc. Comissão %"
                    class="vtur-input"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</Dialog>

<!-- Dialog de Confirmação de Exclusão -->
<Dialog
  bind:open={showDeleteDialog}
  title="Confirmar Exclusão"
  color="danger"
  showCancel={true}
  cancelText="Cancelar"
  showConfirm={true}
  confirmText="Excluir"
  onConfirm={handleDelete}
>
  {#if deletingRegra}
    <p class="text-slate-700">
      Tem certeza que deseja excluir a regra <strong>{deletingRegra.nome}</strong>?
    </p>
    <p class="text-sm text-slate-500 mt-2">
      Esta ação não pode ser desfeita. Comissões já calculadas com esta regra não serão afetadas.
    </p>
  {/if}
</Dialog>

<!-- Dialog de Vendedores -->
<Dialog
  bind:open={showVendedoresDialog}
  title={selectedRegra ? `Vendedores - ${selectedRegra.nome}` : 'Vendedores'}
  color="financeiro"
  showCancel={true}
  cancelText="Fechar"
  showConfirm={false}
>
  {#if selectedRegra}
    <div class="space-y-4">
      <!-- Adicionar Vendedor -->
      <div class="flex gap-2">
        <select bind:value={selectedVendedor} class="vtur-input flex-1">
          <option value="">Selecione um vendedor...</option>
          {#each vendedoresDisponiveis as v}
            <option value={v.id}>{v.nome_completo || v.email}</option>
          {/each}
        </select>
        <Button
          variant="primary"
          size="sm"
          on:click={handleAddVendedor}
          disabled={!selectedVendedor}
        >
          <Plus size={16} />
        </Button>
      </div>

      <!-- Lista de Vendedores -->
      <div class="max-h-64 overflow-y-auto">
        {#if vendedoresRegra.length === 0}
          <p class="text-sm text-slate-500 text-center py-4">
            Nenhum vendedor associado a esta regra.
          </p>
        {:else}
          <table class="w-full text-sm">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-3 py-2 text-left">Vendedor</th>
                <th class="px-3 py-2 text-center">Status</th>
                <th class="px-3 py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              {#each vendedoresRegra as v}
                <tr class="hover:bg-slate-50">
                  <td class="px-3 py-2">{v.vendedor_nome}</td>
                  <td class="px-3 py-2 text-center">
                    {#if v.vigente}
                      <span class="inline-flex px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                        Vigente
                      </span>
                    {:else if !v.ativo}
                      <span class="inline-flex px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                        Inativo
                      </span>
                    {:else}
                      <span class="inline-flex px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
                        Fora Período
                      </span>
                    {/if}
                  </td>
                  <td class="px-3 py-2 text-right font-medium">
                    {v.percentual_base}%
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </div>
    </div>
  {/if}
</Dialog>
