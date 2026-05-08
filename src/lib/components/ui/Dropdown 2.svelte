<script lang="ts">
  import { Dropdown as FlowbiteDropdown } from 'flowbite-svelte';

  export let triggeredBy: string;
  export let open = false;
  export let class_name = '';
</script>

<FlowbiteDropdown {triggeredBy} bind:open class={class_name}>
  <slot />
</FlowbiteDropdown>
