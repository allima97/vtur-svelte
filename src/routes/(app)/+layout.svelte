<script lang="ts">
  import { onMount } from 'svelte';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import Topbar from '$lib/components/layout/Topbar.svelte';
  import { sidebar } from '$lib/stores/ui';
  
  function handleResize() {
    sidebar.setMobile(window.innerWidth < 1024);
  }

  onMount(() => {
    handleResize();
  });
</script>

<svelte:window on:resize={handleResize} />

<div class="vtur-app-shell">
  <Topbar />
  <Sidebar />
  
  <main class="vtur-layout">
    <div class="vtur-page-wrap">
      <slot />
    </div>
  </main>
</div>
