<script lang="ts">
  import { page } from '$app/stores';
  import ProdutoOperacionalForm from '$lib/components/cadastros/ProdutoOperacionalForm.svelte';

  $: produtoId = $page.params.id || null;
</script>

<ProdutoOperacionalForm mode="destinos" {produtoId} />
