<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import KPICard from '$lib/components/kpis/KPICard.svelte';
  import { Plus, Plane, Calendar, Users, FileText, Clock, MapPin, CreditCard } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';

  interface Viagem {
    id: string;
    codigo: string;
    cliente: string;
    cliente_id: string;
    destino: string;
    data_inicio: string;
    data_fim: string;
    numero_pessoas: number;
    dias_viagem: number;
    status: 'programada' | 'em_andamento' | 'concluida' | 'cancelada';
    tipo: 'nacional' | 'internacional';
    valor_total: number;
    responsavel: string;
    venda_id: string;
    created_at: string;
  }

  let viagens: Viagem[] = [];
  let viagensFiltradas: Viagem[] = [];
  let loading = true;
  let errorMessage: string | null = null;
  
  // Filtros
  let filtroBusca = '';
  let filtroStatus = '';
  let filtroPeriodo = '';

  async function loadViagens() {
    loading = true;
    errorMessage = null;
    try {
      const params = new URLSearchParams();
      if (filtroStatus) params.set('status', filtroStatus);
      if (filtroPeriodo) params.set('periodo', filtroPeriodo);

      const response = await fetch(`/api/v1/viagens?${params.toString()}`);
      if (!response.ok) throw new Error('Erro ao carregar viagens');
      
      const data = await response.json();
      viagens = (data.items || []).map((v: any) => ({
        id: v.id,
        codigo: v.venda_id ? `VND-${v.venda_id.slice(0, 8)}` : v.id.slice(0, 8),
        cliente: v.cliente_nome,
        cliente_id: v.cliente_id,
        destino: v.destino,
        data_inicio: v.data_inicio,
        data_fim: v.data_fim,
        numero_pessoas: v.numero_passageiros || 1,
        dias_viagem: calcularDias(v.data_inicio, v.data_fim),
        status: normalizarStatus(v.status),
        tipo: v.tipo_viagem || 'nacional',
        valor_total: v.valor_total || 0,
        responsavel: v.responsavel_nome || 'Não atribuído',
        venda_id: v.venda_id,
        created_at: v.created_at
      }));
      
      aplicarFiltrosBusca();
    } catch (err) {
      errorMessage = 'Erro ao carregar viagens';
      toast.error(errorMessage);
      viagens = [];
      viagensFiltradas = [];
    } finally {
      loading = false;
    }
  }

  function normalizarStatus(status: string): 'programada' | 'em_andamento' | 'concluida' | 'cancelada' {
    const statusMap: Record<string, any> = {
      'planejada': 'programada',
      'programada': 'programada',
      'confirmada': 'programada',
      'em_viagem': 'em_andamento',
      'em_andamento': 'em_andamento',
      'concluida': 'concluida',
      'cancelada': 'cancelada'
    };
    return statusMap[status] || 'programada';
  }

  function calcularDias(inicio: string, fim: string): number {
    if (!inicio || !fim) return 0;
    const d1 = new Date(inicio);
    const d2 = new Date(fim);
    const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return diff + 1;
  }

  function aplicarFiltrosBusca() {
    if (!filtroBusca.trim()) {
      viagensFiltradas = viagens;
      return;
    }
    
    const termo = filtroBusca.toLowerCase().trim();
    viagensFiltradas = viagens.filter(v => 
      v.cliente?.toLowerCase().includes(termo) ||
      v.destino?.toLowerCase().includes(termo) ||
      v.codigo?.toLowerCase().includes(termo) ||
      v.responsavel?.toLowerCase().includes(termo)
    );
  }

  function handleBusca(valor: string) {
    filtroBusca = valor;
    aplicarFiltrosBusca();
  }

  function handleFiltroChange(key: string, value: string) {
    if (key === 'status') {
      filtroStatus = value;
    } else if (key === 'periodo') {
      filtroPeriodo = value;
    }
    loadViagens();
  }

  onMount(() => {
    loadViagens();
  });

  function handleRowClick(row: Viagem) {
    goto(`/operacao/viagens/${row.id}`);
  }

  function handleExport() {
    if (viagensFiltradas.length === 0) {
      toast.info('Não há viagens para exportar');
      return;
    }

    const headers = ['Código', 'Cliente', 'Destino', 'Início', 'Fim', 'Dias', 'Pessoas', 'Status', 'Valor'];
    const rows = viagensFiltradas.map(v => [
      v.codigo,
      v.cliente,
      v.destino,
      v.data_inicio ? new Date(v.data_inicio).toLocaleDateString('pt-BR') : '',
      v.data_fim ? new Date(v.data_fim).toLocaleDateString('pt-BR') : '',
      v.dias_viagem.toString(),
      v.numero_pessoas.toString(),
      v.status,
      v.valor_total.toFixed(2).replace('.', ',')
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `viagens_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('Viagens exportadas com sucesso!');
  }

  const columns = [
    { 
      key: 'codigo', 
      label: 'Código', 
      sortable: true,
      width: '120px'
    },
    { 
      key: 'cliente', 
      label: 'Cliente / Destino', 
      sortable: true,
      formatter: (value: string, row: Viagem) => {
        return `<div class="flex flex-col">
          <span class="font-medium text-slate-900">${value}</span>
          <span class="text-xs text-slate-500 flex items-center gap-1">
            <span class="w-2 h-2 rounded-full ${row.tipo === 'internacional' ? 'bg-purple-400' : 'bg-green-400'}"></span>
            ${row.destino}
          </span>
        </div>`;
      }
    },
    { 
      key: 'data_inicio', 
      label: 'Período', 
      sortable: true,
      width: '150px',
      formatter: (value: string, row: Viagem) => {
        const hoje = new Date();
        const inicio = new Date(value);
        const fim = new Date(row.data_fim);
        let alerta = '';
        
        if (inicio <= hoje && hoje <= fim) {
          alerta = '<span class="text-amber-600 font-medium">• Em viagem</span>';
        } else if (inicio < hoje) {
          alerta = '<span class="text-slate-400">• Concluída</span>';
        } else {
          const dias = Math.ceil((inicio.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
          if (dias <= 7) alerta = `<span class="text-red-600 font-medium">• Falta ${dias}d</span>`;
        }
        
        return `<div class="text-sm">
          <div>${inicio.toLocaleDateString('pt-BR')} - ${fim.toLocaleDateString('pt-BR')}</div>
          <div class="text-xs">${row.dias_viagem} dias ${alerta}</div>
        </div>`;
      }
    },
    { 
      key: 'numero_pessoas', 
      label: 'Viajantes', 
      sortable: true,
      width: '90px',
      align: 'center' as const,
      formatter: (value: number) => `<span class="inline-flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> ${value}</span>`
    },
    { 
      key: 'valor_total', 
      label: 'Valor', 
      sortable: true,
      width: '120px',
      align: 'right' as const,
      formatter: (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(value || 0);
      }
    },
    { 
      key: 'status', 
      label: 'Status', 
      sortable: true,
      width: '130px',
      formatter: (value: string) => {
        const styles: Record<string, string> = {
          programada: 'bg-blue-100 text-blue-700',
          em_andamento: 'bg-amber-100 text-amber-700',
          concluida: 'bg-green-100 text-green-700',
          cancelada: 'bg-red-100 text-red-700'
        };
        const labels: Record<string, string> = {
          programada: 'Programada',
          em_andamento: 'Em andamento',
          concluida: 'Concluída',
          cancelada: 'Cancelada'
        };
        return `<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full ${styles[value]}">${labels[value]}</span>`;
      }
    },
    {
      key: 'responsavel',
      label: 'Responsável',
      sortable: true,
      width: '130px'
    }
  ];

  const filters = [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: '', label: 'Todos' },
        { value: 'programada', label: 'Programada' },
        { value: 'em_andamento', label: 'Em andamento' },
        { value: 'concluida', label: 'Concluída' },
        { value: 'cancelada', label: 'Cancelada' }
      ]
    },
    {
      key: 'periodo',
      label: 'Período',
      type: 'select' as const,
      options: [
        { value: '', label: 'Todos' },
        { value: 'hoje', label: 'Hoje' },
        { value: 'semana', label: 'Esta semana' },
        { value: 'mes', label: 'Este mês' },
        { value: 'proximos_30', label: 'Próximos 30 dias' }
      ]
    }
  ];

  function getResumo() {
    const lista = viagensFiltradas.length > 0 ? viagensFiltradas : viagens;
    const programadas = lista.filter(v => v.status === 'programada').length;
    const emAndamento = lista.filter(v => v.status === 'em_andamento').length;
    const concluidas = lista.filter(v => v.status === 'concluida').length;
    const canceladas = lista.filter(v => v.status === 'cancelada').length;
    const totalViajantes = lista.reduce((acc, v) => acc + v.numero_pessoas, 0);
    const valorTotal = lista.reduce((acc, v) => acc + (v.valor_total || 0), 0);
    
    return { 
      total: lista.length,
      programadas, 
      emAndamento, 
      concluidas, 
      canceladas,
      totalViajantes,
      valorTotal
    };
  }

  $: resumo = getResumo();
</script>

<svelte:head>
  <title>Viagens | VTUR</title>
</svelte:head>

<PageHeader 
  title="Viagens"
  subtitle="Gerencie as viagens programadas e acompanhe o status operacional"
  color="clientes"
  breadcrumbs={[
    { label: 'Operação', href: '/operacao' },
    { label: 'Viagens' }
  ]}
  actions={[
    {
      label: 'Nova Viagem',
      href: '/operacao/viagens/nova',
      variant: 'primary',
      icon: Plus
    }
  ]}
/>

<!-- Resumo com KPICards -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
  <KPICard 
    title="Total" 
    value={resumo.total}
    color="clientes" 
    icon={Plane}
  />
  
  <KPICard 
    title="Programadas" 
    value={resumo.programadas}
    color="clientes" 
    icon={Calendar}
  />

  <KPICard 
    title="Em Andamento" 
    value={resumo.emAndamento}
    color="clientes" 
    icon={Clock}
  />

  <KPICard 
    title="Concluídas" 
    value={resumo.concluidas}
    color="clientes" 
    icon={FileText}
  />
  
  <KPICard 
    title="Viajantes" 
    value={resumo.totalViajantes}
    color="clientes" 
    icon={Users}
  />
  
  <KPICard 
    title="Valor Total" 
    value={new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(resumo.valorTotal)}
    color="clientes" 
    icon={CreditCard}
  />
</div>

<DataTable
  {columns}
  data={viagensFiltradas}
  color="clientes"
  {loading}
  title="Lista de Viagens"
  {filters}
  searchable={true}
  filterable={true}
  exportable={true}
  onRowClick={handleRowClick}
  onExport={handleExport}
  onSearch={handleBusca}
  onFilterChange={handleFiltroChange}
  emptyMessage="Nenhuma viagem encontrada"
/>
