<script lang="ts">
  export let title = "Nenhum resultado encontrado";
  export let message = "Não há dados para exibir no momento.";
</script>

<div class="empty-state">
  <h3>{title}</h3>
  <p>{message}</p>
  <slot />
</div>

<style>
  .empty-state {
    padding: 32px 20px;
    text-align: center;
    color: #6b7280;
  }

  .empty-state h3 {
    margin: 0 0 8px;
    color: #111827;
  }

  .empty-state p {
    margin: 0;
  }
</style>
