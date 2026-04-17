<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import { 
    Plus, Edit2, Trash2, CreditCard, 
    CheckCircle, XCircle, Loader2
  } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';

  interface FormaPagamento {
    id: string;
    nome: string;
    descricao: string | null;
    paga_comissao?: boolean;
    permite_desconto?: boolean;
    desconto_padrao_pct?: number | null;
    ativo: boolean;
    // Colunas opcionais (podem não existir no DB)
    codigo?: string;
    icone?: string;
    cor?: string;
    ordem?: number;
  }

  let formasPagamento: FormaPagamento[] = [];
  let loading = true;
  let showFormDialog = false;
  let showDeleteDialog = false;
  let processando = false;
  let editando: FormaPagamento | null = null;
  let excluindo: FormaPagamento | null = null;

  // Formulário
  let form = {
    nome: '',
    descricao: '',
    paga_comissao: true,
    permite_desconto: false,
    desconto_padrao_pct: null as number | null,
    ativo: true
  };

  const columns = [
    { 
      key: 'nome', 
      label: 'Nome', 
      sortable: true
    },
    { 
      key: 'descricao', 
      label: 'Descrição',
      formatter: (value: string | null) => value || '-'
    },
    { 
      key: 'paga_comissao', 
      label: 'Paga Comissão', 
      width: '130px',
      align: 'center' as const,
      formatter: (value: boolean) => value !== false
        ? '<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Sim</span>'
        : '<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">Não</span>'
    },
    { 
      key: 'ativo', 
      label: 'Status', 
      sortable: true,
      width: '100px',
      formatter: (value: boolean) => value 
        ? '<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Ativo</span>'
        : '<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">Inativo</span>'
    }
  ];

  onMount(() => {
    carregarFormasPagamento();
  });

  async function carregarFormasPagamento() {
    loading = true;
    try {
      const response = await fetch('/api/v1/financeiro/formas-pagamento');
      if (response.ok) {
        const data = await response.json();
        formasPagamento = data.items || [];
      } else {
        toast.error('Erro ao carregar formas de pagamento');
      }
    } catch (err) {
      console.error('Erro:', err);
      toast.error('Erro ao carregar dados');
    } finally {
      loading = false;
    }
  }

  function abrirForm(forma?: FormaPagamento) {
    if (forma) {
      editando = forma;
      form = {
        nome: forma.nome,
        descricao: forma.descricao || '',
        paga_comissao: forma.paga_comissao !== false,
        permite_desconto: Boolean(forma.permite_desconto),
        desconto_padrao_pct: forma.desconto_padrao_pct ?? null,
        ativo: forma.ativo
      };
    } else {
      editando = null;
      form = {
        nome: '',
        descricao: '',
        paga_comissao: true,
        permite_desconto: false,
        desconto_padrao_pct: null,
        ativo: true
      };
    }
    showFormDialog = true;
  }

  function confirmarExclusao(forma: FormaPagamento) {
    excluindo = forma;
    showDeleteDialog = true;
  }

  async function salvar() {
    if (!form.nome) {
      toast.error('Nome é obrigatório');
      return;
    }

    processando = true;
    try {
      const url = '/api/v1/financeiro/formas-pagamento';
      const method = editando ? 'PATCH' : 'POST';
      const body = editando 
        ? { ...form, id: editando.id }
        : form;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao salvar');
      }

      toast.success(editando ? 'Forma de pagamento atualizada!' : 'Forma de pagamento criada!');
      showFormDialog = false;
      await carregarFormasPagamento();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      processando = false;
    }
  }

  async function excluir() {
    if (!excluindo) return;

    processando = true;
    try {
      const response = await fetch(`/api/v1/financeiro/formas-pagamento?id=${excluindo.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao excluir');
      }

      const result = await response.json();
      toast.success(result.message || 'Forma de pagamento excluída!');
      showDeleteDialog = false;
      excluindo = null;
      await carregarFormasPagamento();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir');
    } finally {
      processando = false;
    }
  }
</script>

<svelte:head>
  <title>Formas de Pagamento | VTUR</title>
</svelte:head>

<PageHeader 
  title="Formas de Pagamento"
  subtitle="Cadastre e gerencie as formas de pagamento aceitas"
  color="financeiro"
  breadcrumbs={[
    { label: 'Financeiro', href: '/financeiro' },
    { label: 'Formas de Pagamento' }
  ]}
  actions={[
    {
      label: 'Nova Forma',
      onClick: () => abrirForm(),
      variant: 'primary',
      icon: Plus
    }
  ]}
/>

<!-- Resumo -->
<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
  <div class="vtur-card p-4 border-l-4 border-l-financeiro-500">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-slate-500">Total</p>
        <p class="text-2xl font-bold text-slate-900">{formasPagamento.length}</p>
      </div>
      <div class="p-3 bg-financeiro-50 rounded-lg">
        <CreditCard size={24} class="text-financeiro-600" />
      </div>
    </div>
  </div>

  <div class="vtur-card p-4 border-l-4 border-l-green-500">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-slate-500">Ativas</p>
        <p class="text-2xl font-bold text-slate-900">{formasPagamento.filter(f => f.ativo).length}</p>
      </div>
      <div class="p-3 bg-green-50 rounded-lg">
        <CheckCircle size={24} class="text-green-600" />
      </div>
    </div>
  </div>

  <div class="vtur-card p-4 border-l-4 border-l-slate-400">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-slate-500">Inativas</p>
        <p class="text-2xl font-bold text-slate-900">{formasPagamento.filter(f => !f.ativo).length}</p>
      </div>
      <div class="p-3 bg-slate-100 rounded-lg">
        <XCircle size={24} class="text-slate-600" />
      </div>
    </div>
  </div>
</div>

<!-- Tabela -->
<DataTable
  {columns}
  data={formasPagamento}
  color="financeiro"
  {loading}
  title="Formas de Pagamento Cadastradas"
  emptyMessage="Nenhuma forma de pagamento encontrada"
  searchable={true}
>
  <svelte:fragment slot="actions" let:row>
    <div class="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        on:click={() => abrirForm(row)}
        title="Editar"
      >
        <Edit2 size={16} />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        on:click={() => confirmarExclusao(row)}
        title="Excluir"
        class_name="text-red-600 hover:text-red-700"
      >
        <Trash2 size={16} />
      </Button>
    </div>
  </svelte:fragment>
</DataTable>

<!-- Dialog de Formulário -->
<Dialog
  bind:open={showFormDialog}
  title={editando ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}
  color="financeiro"
  showCancel={true}
  cancelText="Cancelar"
  showConfirm={true}
  confirmText={editando ? 'Salvar' : 'Criar'}
  confirmVariant="primary"
  loading={processando}
  onConfirm={salvar}
>
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
      <input
        type="text"
        bind:value={form.nome}
        placeholder="ex: PIX"
        class="vtur-input w-full"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
      <input
        type="text"
        bind:value={form.descricao}
        placeholder="Descrição opcional"
        class="vtur-input w-full"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">Desconto padrão (%)</label>
      <input
        type="number"
        bind:value={form.desconto_padrao_pct}
        min="0"
        max="100"
        step="0.01"
        placeholder="0"
        class="vtur-input w-full"
      />
    </div>

    <div class="space-y-2">
      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          bind:checked={form.paga_comissao}
          class="rounded border-slate-300 text-financeiro-600 focus:ring-financeiro-500"
        />
        <span class="text-sm text-slate-700">Paga comissão</span>
      </label>

      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          bind:checked={form.permite_desconto}
          class="rounded border-slate-300 text-financeiro-600 focus:ring-financeiro-500"
        />
        <span class="text-sm text-slate-700">Permite desconto</span>
      </label>

      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          bind:checked={form.ativo}
          class="rounded border-slate-300 text-financeiro-600 focus:ring-financeiro-500"
        />
        <span class="text-sm text-slate-700">Ativo</span>
      </label>
    </div>
  </div>
</Dialog>

<!-- Dialog de Confirmação de Exclusão -->
<Dialog
  bind:open={showDeleteDialog}
  title="Excluir Forma de Pagamento"
  color="financeiro"
  showCancel={true}
  cancelText="Cancelar"
  showConfirm={true}
  confirmText="Excluir"
  confirmVariant="danger"
  loading={processando}
  onConfirm={excluir}
>
  {#if excluindo}
    <div class="space-y-3">
      <p class="text-slate-700">
        Tem certeza que deseja excluir a forma de pagamento <strong>{excluindo.nome}</strong>?
      </p>
      <p class="text-sm text-slate-500">
        {#if excluindo.ativo}
          Esta forma de pagamento está ativa. Se houver pagamentos associados, ela será apenas inativada.
        {:else}
          Esta forma de pagamento já está inativa.
        {/if}
      </p>
    </div>
  {/if}
</Dialog>
