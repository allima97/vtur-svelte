<script lang="ts">
  export let title: string = '';
  export let subtitle: string = '';
  export let description: string | null = null;
  export let class_name: string = '';
</script>

<div class={`form-panel rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${class_name}`}>
  {#if title}
    <div class="mb-6">
      <h2 class="text-xl font-semibold text-slate-900">{title}</h2>
      {#if subtitle}
        <p class="mt-1 text-sm text-slate-500">{subtitle}</p>
      {/if}
      {#if description}
        <p class="mt-3 text-sm text-slate-600">{description}</p>
      {/if}
    </div>
  {/if}

  <div class="form-panel-content space-y-6">
    <slot />
  </div>
</div>

<style>
  .form-panel {
    width: 100%;
  }
</style>
