<script lang="ts">
  export let color: 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'operacao' = 'gray';
  export let size: 'sm' | 'md' = 'md';
  export let className = '';
  
  const colorClasses = {
    gray: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    operacao: 'bg-operacao-100 text-operacao-700'
  };
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm'
  };
</script>

<span class="inline-flex items-center font-medium rounded-full {colorClasses[color]} {sizeClasses[size]} {className}">
  <slot />
</span>
