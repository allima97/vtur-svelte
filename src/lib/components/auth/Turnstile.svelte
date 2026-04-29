<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import { env } from '$env/dynamic/public';

  // Props
  export let action: string = 'default';
  export let theme: 'light' | 'dark' | 'auto' = 'auto';
  export let size: 'normal' | 'compact' = 'normal';

  const dispatch = createEventDispatcher<{
    success: string;
    error: string;
    expired: void;
    timeout: void;
  }>();

  let container: HTMLDivElement;
  let widgetId: string | null = null;
  let scriptLoaded = false;
  let scriptError = false;

  const siteKey = env['PUBLIC_TURNSTILE_SITE_KEY'] || '';

  function loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!browser) {
        reject(new Error('Not in browser'));
        return;
      }
      if (window.turnstile) {
        resolve();
        return;
      }
      if (document.querySelector('script[data-turnstile-script]')) {
        // Script já está sendo carregado, aguarda
        const check = () => {
          if (window.turnstile) {
            resolve();
          } else {
            setTimeout(check, 50);
          }
        };
        check();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.turnstileScript = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Falha ao carregar Turnstile'));
      document.head.appendChild(script);
    });
  }

  function renderWidget() {
    if (!window.turnstile || !container) return;
    if (widgetId) {
      window.turnstile.remove(widgetId);
      widgetId = null;
    }
    widgetId = window.turnstile.render(container, {
      sitekey: siteKey,
      action,
      theme,
      size,
      callback: (token: string) => {
        dispatch('success', token);
      },
      'error-callback': () => {
        scriptError = true;
        dispatch('error', 'Erro ao carregar o desafio de segurança.');
      },
      'expired-callback': () => {
        dispatch('expired');
      },
      'timeout-callback': () => {
        dispatch('timeout');
      }
    });
  }

  onMount(async () => {
    if (!browser || !siteKey) {
      // Sem site key, emite sucesso imediatamente para não travar o formulário
      if (!siteKey) {
        console.warn('[Turnstile] PUBLIC_TURNSTILE_SITE_KEY não configurada. Desativando.');
        dispatch('success', 'bypass');
      }
      return;
    }
    try {
      await loadScript();
      scriptLoaded = true;
      renderWidget();
    } catch (err) {
      scriptError = true;
      console.error('[Turnstile] Falha ao inicializar:', err);
      dispatch('error', 'Não foi possível carregar o desafio de segurança.');
    }
  });

  onDestroy(() => {
    if (widgetId && window.turnstile) {
      window.turnstile.remove(widgetId);
      widgetId = null;
    }
  });

  // Exposto para permitir reset externo
  export function reset() {
    if (widgetId && window.turnstile) {
      window.turnstile.reset(widgetId);
    }
  }
</script>

<svelte:head>
  {#if browser && siteKey && !window?.turnstile}
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer data-turnstile-script="true"></script>
  {/if}
</svelte:head>

<div bind:this={container} class="turnstile-container" class:turnstile-error={scriptError}>
  {#if scriptError}
    <div class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
      Erro ao carregar verificação de segurança. Recarregue a página.
    </div>
  {/if}
</div>

<style>
  .turnstile-container {
    min-height: 65px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .turnstile-error {
    min-height: auto;
  }
</style>
