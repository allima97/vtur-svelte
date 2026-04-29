<script lang="ts">
  import { onMount } from 'svelte';
  import { Calculator, TrendingDown, Download, Smartphone, Monitor, X } from 'lucide-svelte';
  import CalculatorBody from '$lib/components/calculadora/CalculatorBody.svelte';
  import ConcorrenciaTab from '$lib/components/modais/ConcorrenciaTab.svelte';
  import Button from '$lib/components/ui/Button.svelte';

  let abaAtiva = 'calculadora';
  let showInstallHint = false;
  let isInstalled = false;
  let deferredPrompt: any = null;

  const abas = [
    { key: 'calculadora', label: 'Calculadora', icon: Calculator },
    { key: 'concorrencia', label: 'Concorrência', icon: TrendingDown },
  ];

  onMount(() => {
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
</script>

<svelte:head>
  <title>VTUR Calculadora</title>
  <meta name="description" content="Calculadora e análise de concorrência VTUR" />
  <meta name="theme-color" content="#1e1b4b" />
  <link rel="manifest" href="/manifest-calculadora.webmanifest" />
</svelte:head>

<div class="min-h-screen bg-slate-100">
  <!-- Header -->
  <header class="bg-vendas-600 text-white shadow-md">
    <div class="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
      <div class="flex items-center gap-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
          <Calculator size={18} />
        </div>
        <div>
          <h1 class="text-sm font-bold leading-tight">VTUR Calculadora</h1>
          <p class="text-[10px] text-white/70">Calculadora + Concorrência</p>
        </div>
      </div>
      {#if !isInstalled && showInstallHint}
        <Button variant="ghost" size="xs" class_name="text-white hover:bg-white/20 gap-1 text-xs" on:click={installPwa}>
          <Download size={14} />
          <span class="hidden sm:inline">Instalar</span>
        </Button>
      {/if}
    </div>
  </header>

  <!-- Install hint banner (mobile-friendly) -->
  {#if !isInstalled && showInstallHint}
    <div class="mx-auto max-w-lg px-4 pt-3">
      <div class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
        <Smartphone size={16} class="mt-0.5 shrink-0" />
        <div class="flex-1">
          <p class="font-medium">Instale no seu celular ou computador</p>
          <p class="text-xs text-amber-700 mt-0.5">
            <span class="hidden sm:inline">Clique em "Instalar" acima ou use o menu do navegador.</span>
            <span class="sm:hidden">Toque em <strong>⋮</strong> (Chrome) ou <strong>Compartilhar → Adicionar à Tela de Início</strong> (Safari).</span>
          </p>
        </div>
        <button type="button" on:click={() => showInstallHint = false} class="text-amber-500 hover:text-amber-700">
          <X size={14} />
        </button>
      </div>
    </div>
  {/if}

  <!-- Tabs -->
  <div class="mx-auto max-w-lg px-4 pt-3">
    <div class="flex rounded-xl bg-white p-1 shadow-sm border border-slate-200">
      {#each abas as aba}
        <button
          type="button"
          on:click={() => abaAtiva = aba.key}
          class="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors
            {abaAtiva === aba.key ? 'bg-vendas-50 text-vendas-700' : 'text-slate-500 hover:bg-slate-50'}"
        >
          <svelte:component this={aba.icon} size={15} />
          {aba.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- Content -->
  <main class="mx-auto max-w-lg px-4 py-4 pb-10">
    {#if abaAtiva === 'calculadora'}
      <CalculatorBody />
    {:else}
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <ConcorrenciaTab />
      </div>
    {/if}
  </main>

  <!-- Footer -->
  <footer class="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
    <p>VTUR — Calculadora e Concorrência</p>
    <p class="mt-0.5">Funciona offline após a primeira visita</p>
  </footer>
</div>
