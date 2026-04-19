<script lang="ts">
  export let columns: 1 | 2 | 3 | 4 | 5 | 6 | 'auto' = 'auto';
  export let className = '';

  const gridClassMap: Record<string, string> = {
    auto: 'vtur-kpi-grid',
    '1': 'vtur-kpi-grid !grid-cols-1',
    '2': 'vtur-kpi-grid !grid-cols-1 sm:!grid-cols-2',
    '3': 'vtur-kpi-grid !grid-cols-1 md:!grid-cols-3',
    '4': 'vtur-kpi-grid !grid-cols-1 sm:!grid-cols-2 lg:!grid-cols-4',
    '5': 'vtur-kpi-grid vtur-kpi-grid-5',
    '6': 'vtur-kpi-grid vtur-kpi-grid-6'
  };
</script>

<div class={`${gridClassMap[String(columns)] ?? gridClassMap.auto} ${className}`.trim()}>
  <slot />
</div>
