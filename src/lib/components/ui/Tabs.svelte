<script lang="ts">
  import Button from './Button.svelte';

  type TabItem = {
    key: string;
    label: string;
    icon?: any;
    badge?: string | number | null;
    disabled?: boolean;
  };

  export let items: TabItem[] = [];
  export let activeKey = '';
  export let className = '';

  function selectTab(key: string, disabled?: boolean) {
    if (disabled) return;
    activeKey = key;
  }
</script>

<div class={`vtur-tabs ${className}`.trim()} role="tablist">
  {#each items as item}
    <button
      type="button"
      role="tab"
      aria-selected={activeKey === item.key}
      class={`vtur-tab ${activeKey === item.key ? 'vtur-tab--active' : ''}`.trim()}
      disabled={item.disabled}
      on:click={() => selectTab(item.key, item.disabled)}
    >
      {#if item.icon}
        <svelte:component this={item.icon} size={16} />
      {/if}
      <span>{item.label}</span>
      {#if item.badge != null && item.badge !== '' && item.badge !== 0}
        <span
          class={`inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
            activeKey === item.key
              ? 'bg-blue-100 text-blue-700'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {item.badge}
        </span>
      {/if}
    </button>
  {/each}
</div>
