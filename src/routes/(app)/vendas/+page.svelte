<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { apiGet } from '$lib/services/api';
  import { toast } from '$lib/stores/ui';

  let vendas = [];
  let loading = false;
  let errorMessage = null;

  async function loadVendas() {
    loading = true;
    errorMessage = null;

    try {
      const data = await apiGet('/api/v1/vendas/list', {
        page: 1,
        pageSize: 20
      });

      vendas = data.items || [];

    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Erro ao carregar vendas';
      vendas = [];
      toast.error(errorMessage);
    } finally {
      loading = false;
    }
  }

  onMount(loadVendas);
</script>