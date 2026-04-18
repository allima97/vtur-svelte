<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { ChartData } from 'chart.js';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import ChartJS from '$lib/components/charts/ChartJS.svelte';
  import { Filter, Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-svelte';
  import { toast } from '$lib/stores/ui';
  import { apiGet } from '$lib/services/api';

  // (tipos mantidos)

  async function loadBase() {
    try {
      const data = await apiGet('/api/v1/relatorios/base');
      empresas = data.empresas || [];
      vendedoresFiltro = data.vendedores || [];
    } catch {
      empresas = [];
      vendedoresFiltro = [];
      toast.error('Erro ao carregar filtros do ranking');
    }
  }

  async function loadRanking(showSuccess = false) {
    loading = true;
    try {
      const data = await apiGet('/api/v1/relatorios/ranking', {
        data_inicio: dataInicio,
        data_fim: dataFim,
        empresa_id: empresaSelecionada || undefined,
        vendedor_ids: vendedorSelecionado || undefined
      });

      vendedores = data.items || [];
      resumo = data.resumo || resumo;

      if (showSuccess) toast.success('Ranking atualizado');
    } catch {
      vendedores = [];
      toast.error('Erro ao carregar ranking');
    } finally {
      loading = false;
    }
  }

  onMount(async () => {
    await loadBase();
    await loadRanking();
  });
</script>