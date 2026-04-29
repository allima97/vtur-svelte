<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import Topbar from '$lib/components/layout/Topbar.svelte';
  import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
  import { sidebar, isMobile } from '$lib/stores/ui';
  import { sessionSynced, auth } from '$lib/stores/auth';
  import { permissoes } from '$lib/stores/permissoes';
  import { createSupabaseBrowserClient } from '$lib/db/supabase';

  let appReady = false;
  let permsInitialized = false;

  function handleResize() {
    sidebar.setMobile(window.innerWidth < 1024);
  }

  async function initPermissoes() {
    try {
      const supabase = createSupabaseBrowserClient();
      await permissoes.init(supabase);
    } catch (err) {
      console.error('[AppLayout] Erro ao inicializar permissoes:', err);
      const message = String((err as any)?.message || '').toLowerCase();
      if (
        message.includes('sessao invalida') ||
        message.includes('login novamente') ||
        message.includes('permission denied') ||
        message.includes('row-level security') ||
        message.includes('jwt')
      ) {
        try {
          const supabase = createSupabaseBrowserClient();
          await supabase.auth.signOut();
        } catch {
          // noop
        }
        const next = `${window.location.pathname}${window.location.search || ''}`;
        window.location.assign(`/auth/login?session_expired=1&next=${encodeURIComponent(next)}`);
      }
    }
  }

  onMount(() => {
    handleResize();

    const startApp = async () => {
      // Aguarda a sessão estar sincronizada antes de inicializar permissões
      const currentState = get(auth);
      if (currentState.user && !permsInitialized) {
        permsInitialized = true;
        await initPermissoes();
      }
      appReady = true;
    };

    if (get(sessionSynced)) {
      void startApp();
      return;
    }

    const timeout = setTimeout(() => {
      appReady = true;
    }, 5000);

    const unsub = sessionSynced.subscribe(async (ready) => {
      if (ready) {
        clearTimeout(timeout);
        unsub();
        await startApp();
      }
    });

    return () => {
      clearTimeout(timeout);
      unsub();
    };
  });

  // Reinicializa permissões quando o usuário muda (ex: após troca de conta)
  $: if ($auth.user && $auth.user.id && appReady && !$permissoes.ready && !$permissoes.loading) {
    void initPermissoes();
  }
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
