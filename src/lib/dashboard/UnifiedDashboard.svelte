<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Button } from 'flowbite-svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import ChartJS from '$lib/components/charts/ChartJS.svelte';
  import { Filter, BarChart3, Settings, AlertCircle, ShoppingCart, Wallet, Clock } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';
  import { apiGet } from '$lib/services/api';
  import type { ChartData } from 'chart.js';

  // (restante do código mantido, só alterando fetch → apiGet)

  async function loadDashboard() {
    loading = true;
    errorMessage = null;
    try {
      dashboard = await apiGet('/api/v1/dashboard/summary', {
        inicio: periodoInicio,
        fim: periodoFim,
        include_orcamentos: 1,
        company_id: empresaSelecionada || undefined,
        vendedor_ids: vendedorSelecionado || undefined
      });
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dashboard.';
      dashboard = emptyDashboard;
      toast.error(errorMessage);
    } finally {
      loading = false;
    }
  }

  async function loadOperationalSummary() {
    try {
      const [vendasData, pagamentosData, comissoesData] = await Promise.all([
        apiGet('/api/v1/vendas/list', { page: 1, pageSize: 200 }),
        apiGet('/api/v1/pagamentos'),
        apiGet('/api/v1/financeiro/comissoes')
      ]);

      vendasOperacionais = (vendasData?.items || []).map((item: any) => ({
        id: String(item.id),
        status: String(item.status || ''),
        conciliado: typeof item.conciliado === 'boolean' ? item.conciliado : null
      }));

      pagamentosOperacionais = (pagamentosData?.items || []).map((item: any) => ({
        id: String(item.id),
        status: String(item.status || ''),
        valor: Number(item.valor_total || item.valor || 0)
      }));

      comissoesOperacionais = (comissoesData?.items || []).map((item: any) => ({
        id: String(item.id),
        status: String(item.status || ''),
        valor_comissao: Number(item.valor_comissao || 0)
      }));

    } catch (err) {
      vendasOperacionais = [];
      pagamentosOperacionais = [];
      comissoesOperacionais = [];
      toast.error('Erro ao consolidar resumo operacional');
    }
  }

</script>