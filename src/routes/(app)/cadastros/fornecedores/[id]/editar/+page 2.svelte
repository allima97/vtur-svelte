<script lang="ts">
  import { page } from '$app/stores';
  import FornecedorForm from '$lib/components/cadastros/FornecedorForm.svelte';

  $: fornecedorId = $page.params.id || null;
</script>

<FornecedorForm {fornecedorId} />
