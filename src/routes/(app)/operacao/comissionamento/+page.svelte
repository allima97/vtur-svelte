<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  // Comissionamento operacional é coberto pelo módulo de comissões financeiro
  onMount(() => goto('/financeiro/comissoes'));
</script>
