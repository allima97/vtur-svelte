<script lang="ts">
  import { onMount } from 'svelte';
  import { Calculator, TrendingDown, Download, Smartphone, X } from 'lucide-svelte';
  import CalculatorBody from '$lib/components/calculadora/CalculatorBody.svelte';
  import ConcorrenciaTab from '$lib/components/modais/ConcorrenciaTab.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Tabs from '$lib/components/ui/Tabs.svelte';

  let abaAtiva = 'calculadora';
  let showInstallHint = false;
  let isInstalled = false;
  let canGoBack = false;
  let deferredPrompt: any = null;

  const abas = [
    { key: 'calculadora', label: 'Calculadora', icon: Calculator },
    { key: 'concorrencia', label: 'Concorrência', icon: TrendingDown },
  ];

  onMount(() => {
    canGoBack = window.history.length > 1;

    // Detecta se já está instalado (standalone ou fullscreen)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      isInstalled = true;
    }

    // Captura o evento beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      showInstallHint = true;
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      isInstalled = true;
      showInstallHint = false;
    });

    // Registra Service Worker dedicado da calculadora
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw-calculadora.js', { scope: '/calculadora' })
        .then((reg) => console.log('[SW Calculadora] registrado:', reg.scope))
        .catch((err) => console.error('[SW Calculadora] erro:', err));
    }
  });

  async function installPwa() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      deferredPrompt = null;
    }
  }

  function closeStandaloneCalculator() {
    if (canGoBack) {
      window.history.back();
      return;
    }
    window.location.assign('/');
  }
</script>

<svelte:head>
  <title>VTUR Calculadora</title>
  <meta name="description" content="Calculadora e análise de concorrência VTUR" />
  <meta name="theme-color" content="#16a34a" />
  <link rel="manifest" href="/manifest-calculadora.webmanifest" />
</svelte:head>

<div class="min-h-screen bg-slate-200 px-4 py-6 sm:px-6 sm:py-10">
  <main class="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">

    <!-- Cabeçalho -->
    <div class="vtur-modal-header border-b border-slate-100 bg-vendas-50 px-6 py-5">
      <div class="vtur-modal-header__lead">
        <div class="vtur-modal-header__icon bg-vendas-100 h-12 w-12 rounded-xl">
          <Calculator size={28} class="text-vendas-600" />
        </div>
        <div class="vtur-modal-header__copy">
          <h1 class="text-xl font-bold text-slate-800">Calculadora</h1>
          <p class="text-sm text-slate-500">Operações rápidas no padrão visual do sistema</p>
        </div>
      </div>
      {#if !isInstalled && showInstallHint}
        <Button
          type="button"
          variant="ghost"
          size="md"
          class_name="vtur-modal-header__close px-4 py-2 text-vendas-700 hover:bg-vendas-100 text-base"
          ariaLabel="Instalar calculadora"
          on:click={installPwa}
        >
          <Download size={18} />
          <span class="hidden sm:inline ml-2">Instalar</span>
        </Button>
      {/if}
    </div>

    <!-- Abas -->
    <div class="vtur-modal-tabs border-b border-slate-100">
      <Tabs items={abas} bind:activeKey={abaAtiva} />
    </div>

    <!-- Corpo -->
    <div
      class="p-6 sm:p-8"
      style={abaAtiva === 'calculadora' ? 'max-height: none; overflow: visible;' : undefined}
    >
      {#if !isInstalled && showInstallHint}
        <div class="mb-5 flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-base text-amber-800">
          <Smartphone size={22} class="mt-0.5 shrink-0" />
          <div class="flex-1">
            <p class="font-semibold text-base">Instale no seu celular ou computador</p>
            <p class="mt-1 text-sm text-amber-700">
              <span class="hidden sm:inline">Clique em Instalar no cabeçalho ou use o menu do navegador.</span>
              <span class="sm:hidden">Toque em ⋮ (Chrome) ou Compartilhar e depois Adicionar à Tela de Início (Safari).</span>
            </p>
          </div>
          <button type="button" on:click={() => showInstallHint = false} class="text-amber-500 hover:text-amber-700" aria-label="Fechar dica de instalação">
            <X size={18} />
          </button>
        </div>
      {/if}

      {#if abaAtiva === 'concorrencia'}
        <ConcorrenciaTab />
      {:else}
        <CalculatorBody />
      {/if}
    </div>

    <!-- Rodapé -->
    <div class="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-4">
      <div class="text-sm text-slate-400">VTUR — Calculadora e Concorrência</div>
      <div class="flex items-center gap-4">
        <span class="hidden text-sm text-slate-400 sm:inline">Funciona offline após a primeira visita</span>
        <Button type="button" variant="secondary" size="lg" on:click={closeStandaloneCalculator}>
          {canGoBack ? 'Voltar' : 'Fechar'}
        </Button>
      </div>
    </div>
  </main>
</div>
