<script lang="ts">
  import ClienteContatosCard from '$lib/components/clientes/ClienteContatosCard.svelte';
  let versao = 0;
</script>

<button type="button" id="enviar-aviso" on:click={() => (versao += 1)}>enviar</button>
<ClienteContatosCard clienteId="c3" {versao} />
