<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import KPICard from '$lib/components/kpis/KPICard.svelte';
  import ModalAvisoCliente from '$lib/components/modais/ModalAvisoCliente.svelte';
  import AcompanhantesManager from '$lib/components/clientes/AcompanhantesManager.svelte';
  import {
    ArrowLeft,
    Calendar,
    Edit,
    FileText,
    Loader2,
    Mail,
    MapPin,
    MessageCircle,
    Send,
    ShoppingCart,
    Ticket,
    User,
    Wallet
  } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';

  type ClienteDetalhe = {
    id: string;
    nome: string;
    cpf: string | null;
    documento_formatado: string;
    rg: string | null;
    telefone: string | null;
    whatsapp: string | null;
    email: string | null;
    nascimento: string | null;
    genero: string | null;
    nacionalidade: string | null;
    tipo_pessoa: string | null;
    tipo_cliente: string | null;
    classificacao: string | null;
    cep: string | null;
    endereco: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
    notas: string | null;
    observacoes: string | null;
    tags: string[] | null;
    ativo: boolean;
    active: boolean;
    status: 'ativo' | 'inativo' | 'prospect';
    ultima_compra: string | null;
    total_gasto: number;
    total_viagens: number;
    total_orcamentos: number;
    acompanhantes_count: number;
  };

  type HistoricoVenda = {
    id: string;
    data_lancamento: string | null;
    data_embarque: string | null;
    destino_nome: string;
    destino_cidade_nome: string;
    valor_total: number;
    valor_taxas: number;
    origem_vinculo?: 'titular' | 'passageiro';
  };

  type HistoricoOrcamento = {
    id: string;
    data_orcamento: string | null;
    status: string | null;
    valor: number | null;
    produto_nome?: string | null;
  };

  const clienteId = $page.params.id;

  let cliente: ClienteDetalhe | null = null;
  let historicoVendas: HistoricoVenda[] = [];
  let historicoOrcamentos: HistoricoOrcamento[] = [];
  let loading = true;
  let errorMessage: string | null = null;
  let showAvisoModal = false;

  $: totalTaxas = historicoVendas.reduce((acc, item) => acc + Number(item.valor_taxas || 0), 0);
  $: totalGasto = historicoVendas.reduce((acc, item) => acc + Number(item.valor_total || 0), 0);
  $: ticketMedio = historicoVendas.length > 0 ? totalGasto / historicoVendas.length : 0;

  function formatCurrency(value: number | null | undefined) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value || 0));
  }

  function formatDate(value: string | null | undefined) {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('pt-BR');
  }

  function calculateAge(value: string | null | undefined) {
    if (!value) return null;
    const today = new Date();
    const birth = new Date(value);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }
    return age;
  }

  function getStatusBadge(status: string | null | undefined) {
    const styles: Record<string, string> = {
      ativo: 'bg-green-100 text-green-700',
      inativo: 'bg-red-100 text-red-700',
      prospect: 'bg-blue-100 text-blue-700',
      aprovado: 'bg-green-100 text-green-700',
      pendente: 'bg-amber-100 text-amber-700',
      rejeitado: 'bg-red-100 text-red-700',
      fechado: 'bg-emerald-100 text-emerald-700'
    };

    return styles[String(status || '').toLowerCase()] || 'bg-slate-100 text-slate-700';
  }

  function getStatusLabel(status: string | null | undefined) {
    const key = String(status || '').toLowerCase();
    const labels: Record<string, string> = {
      ativo: 'Ativo',
      inativo: 'Inativo',
      prospect: 'Prospect',
      aprovado: 'Aprovado',
      pendente: 'Pendente',
      rejeitado: 'Rejeitado',
      fechado: 'Convertido em Venda'
    };
    return labels[key] || String(status || '-');
  }

  function getTipoPessoaLabel(value: string | null | undefined) {
    return value === 'PJ' ? 'Pessoa Juridica' : 'Pessoa Fisica';
  }

  async function carregarCliente() {
    loading = true;
    errorMessage = null;

    try {
      const [clienteResponse, historicoResponse] = await Promise.all([
        fetch(`/api/v1/clientes/${clienteId}`),
        fetch(`/api/v1/clientes/historico?cliente_id=${clienteId}`)
      ]);

      const clientePayload = await clienteResponse.json().catch(() => null);
      if (!clienteResponse.ok) {
        throw new Error(clientePayload?.error || 'Erro ao carregar cliente.');
      }

      const historicoPayload = await historicoResponse.json().catch(() => null);
      if (!historicoResponse.ok) {
        throw new Error(historicoPayload?.error || 'Erro ao carregar historico.');
      }

      cliente = clientePayload;
      historicoVendas = Array.isArray(historicoPayload?.vendas) ? historicoPayload.vendas : [];
      historicoOrcamentos = Array.isArray(historicoPayload?.orcamentos)
        ? historicoPayload.orcamentos
        : [];
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Erro ao carregar cliente.';
      toast.error(errorMessage);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    void carregarCliente();
  });
</script>

<svelte:head>
  <title>{cliente?.nome || 'Cliente'} | Clientes | VTUR</title>
</svelte:head>

{#if loading}
  <div class="flex items-center justify-center py-20">
    <Loader2 size={36} class="animate-spin text-clientes-600" />
    <span class="ml-3 text-slate-600">Carregando cliente...</span>
  </div>
{:else if errorMessage}
  <div class="text-center py-12">
    <p class="mb-4 text-red-600">{errorMessage}</p>
    <Button variant="secondary" on:click={() => goto('/clientes')}>
      <ArrowLeft size={16} class="mr-2" />
      Voltar para clientes
    </Button>
  </div>
{:else if cliente}
  <PageHeader
    title={cliente.nome}
    subtitle="Visao consolidada de cadastro, historico comercial, orcamentos e relacionamento do cliente."
    breadcrumbs={[
      { label: 'Clientes', href: '/clientes' },
      { label: cliente.nome }
    ]}
    actions={[
      {
        label: 'Editar',
        href: `/clientes/${clienteId}/editar`,
        variant: 'secondary',
        icon: Edit
      },
      {
        label: 'Enviar Aviso',
        onClick: () => (showAvisoModal = true),
        variant: 'secondary',
        icon: Send
      },
      {
        label: 'Nova Venda',
        href: `/vendas/nova?cliente=${clienteId}`,
        variant: 'primary',
        icon: ShoppingCart
      }
    ]}
  />

  <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
    <KPICard title="Total em vendas" value={formatCurrency(totalGasto)} color="clientes" icon={Wallet} />
    <KPICard title="Viagens vinculadas" value={historicoVendas.length} color="clientes" icon={ShoppingCart} />
    <KPICard title="Ticket medio" value={formatCurrency(ticketMedio)} color="clientes" icon={Ticket} />
    <KPICard title="Taxas acumuladas" value={formatCurrency(totalTaxas)} color="clientes" icon={FileText} />
    <KPICard title="Orcamentos" value={historicoOrcamentos.length} color="clientes" icon={Calendar} />
  </div>

  <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
    <div class="space-y-6 lg:col-span-1">
      <Card title="Resumo do cliente" color="clientes">
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-clientes-100">
              <User size={18} class="text-clientes-600" />
            </div>
            <div>
              <p class="text-sm text-slate-500">Nome</p>
              <p class="font-medium text-slate-900">{cliente.nome}</p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3">
              <p class="text-xs uppercase tracking-wide text-slate-500">Status</p>
              <span class={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadge(cliente.status)}`}>
                {getStatusLabel(cliente.status)}
              </span>
            </div>
            <div class="rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3">
              <p class="text-xs uppercase tracking-wide text-slate-500">Classificacao</p>
              <p class="mt-2 font-medium text-slate-900">{cliente.classificacao || '-'}</p>
            </div>
            <div class="rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3">
              <p class="text-xs uppercase tracking-wide text-slate-500">Tipo</p>
              <p class="mt-2 font-medium text-slate-900">
                {getTipoPessoaLabel(cliente.tipo_pessoa)} · {cliente.tipo_cliente || 'passageiro'}
              </p>
            </div>
            <div class="rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3">
              <p class="text-xs uppercase tracking-wide text-slate-500">Ultima compra</p>
              <p class="mt-2 font-medium text-slate-900">{formatDate(cliente.ultima_compra)}</p>
            </div>
          </div>

          <div class="space-y-3">
            <div>
              <p class="text-sm text-slate-500">CPF/CNPJ</p>
              <p class="font-medium text-slate-900">{cliente.documento_formatado || '-'}</p>
            </div>
            <div>
              <p class="text-sm text-slate-500">Telefone</p>
              <p class="font-medium text-slate-900">{cliente.telefone || '-'}</p>
            </div>
            <div>
              <p class="text-sm text-slate-500">WhatsApp</p>
              <p class="font-medium text-slate-900">{cliente.whatsapp || '-'}</p>
            </div>
            <div>
              <p class="text-sm text-slate-500">E-mail</p>
              <p class="font-medium text-slate-900">{cliente.email || '-'}</p>
            </div>
            <div>
              <p class="text-sm text-slate-500">Nascimento</p>
              <p class="font-medium text-slate-900">
                {formatDate(cliente.nascimento)}
                {#if calculateAge(cliente.nascimento)}
                  <span class="ml-1 text-slate-500">({calculateAge(cliente.nascimento)} anos)</span>
                {/if}
              </p>
            </div>
            <div>
              <p class="text-sm text-slate-500">Genero / Nacionalidade</p>
              <p class="font-medium text-slate-900">
                {[cliente.genero, cliente.nacionalidade].filter(Boolean).join(' · ') || '-'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Endereco e tags" color="clientes">
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <MapPin size={18} class="mt-0.5 text-clientes-600" />
            <div class="text-sm text-slate-700">
              <p>{cliente.endereco || 'Endereco nao informado'}{cliente.numero ? `, ${cliente.numero}` : ''}</p>
              {#if cliente.complemento}
                <p>{cliente.complemento}</p>
              {/if}
              {#if cliente.bairro}
                <p>{cliente.bairro}</p>
              {/if}
              <p>{[cliente.cidade, cliente.estado].filter(Boolean).join('/')}</p>
              {#if cliente.cep}
                <p>CEP: {cliente.cep}</p>
              {/if}
            </div>
          </div>

          <div>
            <p class="mb-2 text-sm text-slate-500">Tags</p>
            {#if cliente.tags && cliente.tags.length > 0}
              <div class="flex flex-wrap gap-2">
                {#each cliente.tags as tag}
                  <span class="rounded-full bg-clientes-100 px-3 py-1 text-xs font-medium text-clientes-700">{tag}</span>
                {/each}
              </div>
            {:else}
              <p class="text-sm text-slate-500">Nenhuma tag cadastrada.</p>
            {/if}
          </div>
        </div>
      </Card>

      <Card title="Notas e contexto" color="clientes">
        <p class="text-sm leading-6 text-slate-700">{cliente.notas || cliente.observacoes || 'Sem observacoes registradas.'}</p>
      </Card>
    </div>

    <div class="space-y-6 lg:col-span-2">
      <Card title="Historico de vendas" color="clientes">
        {#if historicoVendas.length > 0}
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-slate-50">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold text-slate-600">Lancamento</th>
                  <th class="px-4 py-3 text-left font-semibold text-slate-600">Destino</th>
                  <th class="px-4 py-3 text-left font-semibold text-slate-600">Embarque</th>
                  <th class="px-4 py-3 text-right font-semibold text-slate-600">Valor</th>
                  <th class="px-4 py-3 text-right font-semibold text-slate-600">Taxas</th>
                  <th class="px-4 py-3 text-left font-semibold text-slate-600">Vinculo</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                {#each historicoVendas as venda}
                  <tr class="cursor-pointer transition-colors hover:bg-slate-50" on:click={() => goto(`/vendas/${venda.id}`)}>
                    <td class="px-4 py-3 text-slate-700">{formatDate(venda.data_lancamento)}</td>
                    <td class="px-4 py-3">
                      <div class="font-medium text-slate-900">{venda.destino_nome || '-'}</div>
                      <div class="text-xs text-slate-500">{venda.destino_cidade_nome || 'Sem cidade'}</div>
                    </td>
                    <td class="px-4 py-3 text-slate-700">{formatDate(venda.data_embarque)}</td>
                    <td class="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(venda.valor_total)}</td>
                    <td class="px-4 py-3 text-right text-slate-700">{formatCurrency(venda.valor_taxas)}</td>
                    <td class="px-4 py-3">
                      <span class={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${venda.origem_vinculo === 'passageiro' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                        {venda.origem_vinculo === 'passageiro' ? 'Passageiro' : 'Titular'}
                      </span>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <div class="rounded-[14px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
            Nenhuma venda vinculada a este cliente.
          </div>
        {/if}
      </Card>

      <Card title="Historico de orcamentos" color="clientes">
        {#if historicoOrcamentos.length > 0}
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-slate-50">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold text-slate-600">Data</th>
                  <th class="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th class="px-4 py-3 text-left font-semibold text-slate-600">Produto</th>
                  <th class="px-4 py-3 text-right font-semibold text-slate-600">Valor</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                {#each historicoOrcamentos as orcamento}
                  <tr class="cursor-pointer transition-colors hover:bg-slate-50" on:click={() => goto(`/orcamentos/${orcamento.id}`)}>
                    <td class="px-4 py-3 text-slate-700">{formatDate(orcamento.data_orcamento)}</td>
                    <td class="px-4 py-3">
                      <span class={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadge(orcamento.status)}`}>
                        {getStatusLabel(orcamento.status)}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-slate-900">{orcamento.produto_nome || '-'}</td>
                    <td class="px-4 py-3 text-right text-slate-900">{formatCurrency(orcamento.valor)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <div class="rounded-[14px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
            Nenhum orcamento vinculado a este cliente.
          </div>
        {/if}
      </Card>

      <AcompanhantesManager
        clienteId={clienteId}
        editable={false}
        title="Acompanhantes"
        subtitle="Consulta dos acompanhantes associados ao cliente."
      />
    </div>
  </div>

  <ModalAvisoCliente
    bind:open={showAvisoModal}
    clienteId={clienteId}
    clienteNome={cliente.nome}
    clienteTelefone={cliente.whatsapp || cliente.telefone || ''}
    clienteEmail={cliente.email || ''}
    clienteNascimento={cliente.nascimento || null}
    onClose={() => (showAvisoModal = false)}
    onEnviar={() => toast.success('Aviso preparado com sucesso.')}
  />
{/if}
