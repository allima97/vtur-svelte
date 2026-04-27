<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import Topbar from '$lib/components/layout/Topbar.svelte';
  import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
  import { sidebar, isMobile } from '$lib/stores/ui';
  import { sessionSynced } from '$lib/stores/auth';

  let appReady = false;

  function handleResize() {
    sidebar.setMobile(window.innerWidth < 1024);
  }

  onMount(() => {
    handleResize();

    if (get(sessionSynced)) {
      appReady = true;
      return;
    }

    const timeout = setTimeout(() => { appReady = true; }, 5000);
    const unsub = sessionSynced.subscribe((ready) => {
      if (ready) {
        clearTimeout(timeout);
        unsub();
        appReady = true;
      }
    });
    return () => { clearTimeout(timeout); unsub(); };
  });
</script>

<svelte:window on:resize={handleResize} />

<ToastContainer />

<div class="vtur-app-shell">
  <Topbar />
  <Sidebar />

  <main
    class="vtur-layout"
    style={$isMobile
      ? 'margin-left:0;padding-top:calc(var(--vtur-topbar-height) + 1rem);padding-left:0.75rem;padding-right:0.75rem;padding-bottom:calc(72px + env(safe-area-inset-bottom,0px));'
      : ''}
  >
    <div class="vtur-page-wrap">
      {#if appReady}
        <slot />
      {:else}
        <div class="flex items-center justify-center min-h-[60vh]">
          <div class="flex flex-col items-center gap-3 text-slate-400">
            <svg class="animate-spin h-8 w-8 text-orange-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
            <span class="text-sm">Carregando...</span>
          </div>
        </div>
      {/if}
    </div>
  </main>
</div>
