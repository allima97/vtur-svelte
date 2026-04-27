<script lang="ts">
  import { fade } from 'svelte/transition';
  import { X, Edit, FileDown, Printer } from 'lucide-svelte';
  import Button from '../ui/Button.svelte';
  import { buildVoucherPreviewDocument } from '../../vouchers/preview';
  import type { VoucherRecord, VoucherAssetRecord } from '../../vouchers/types';
  import { createEventDispatcher } from 'svelte';
  import { isMobile } from '$lib/stores/ui';
  import { onMount } from 'svelte';

  export let open = false;
  export let voucher: VoucherRecord | null = null;
  export let assets: VoucherAssetRecord[] = [];

  let sidebarCollapsed = false;

  // Detecta se a sidebar está colapsada lendo a classe do DOM
  function checkSidebarCollapsed() {
    sidebarCollapsed = !!document.querySelector('.vtur-sidebar--collapsed');
  }

  onMount(() => {
    checkSidebarCollapsed();
    // Observa mudanças de classe na sidebar
    const sidebar = document.querySelector('.vtur-sidebar');
    if (sidebar) {
      const observer = new MutationObserver(checkSidebarCollapsed);
      observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    }
  });

  $: if (open) checkSidebarCollapsed();

  $: contentLeft = $isMobile
    ? '0px'
    : sidebarCollapsed
      ? 'calc(1rem + 90px + 1rem)'
      : 'calc(1rem + var(--vtur-sidebar-width) + 1rem)';

  let iframe: HTMLIFrameElement;
  
  $: docHtml = (open && voucher) ? buildVoucherPreviewDocument(voucher, assets) : '';

  const dispatch = createEventDispatcher();

  function close() {
    open = false;
    voucher = null;
  }

  function handleEdit() {
    dispatch('edit', voucher);
    close();
  }

  function handlePrint() {
    if (iframe?.contentWindow) {
      iframe.contentWindow.print();
    }
  }

  function handleSavePdf() {
    if (iframe?.contentWindow) {
      iframe.contentWindow.print();
    }
  }
</script>

{#if open && voucher}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="fixed z-[100] flex flex-col bg-slate-100 voucher-preview-area"
    style="left: {contentLeft}; top: {$isMobile ? 'var(--vtur-topbar-height)' : 'var(--vtur-desktop-shell-top)'};"
    transition:fade={{ duration: 150 }}
  >
    <!-- Header fixo com ações - Responsivo -->
    <header 
      class="voucher-preview__header bg-white border-b border-slate-200 shadow-sm shrink-0"
    >
      <div class="voucher-preview__meta min-w-0">
        <h2 class="voucher-preview__title truncate">{voucher.nome}</h2>
        <p class="voucher-preview__subtitle">
          {voucher.provider === 'special_tours' ? 'Special Tours' : 'Europamundo'}
          {#if voucher.codigo_fornecedor}
            <span class="hidden sm:inline"> • Código: {voucher.codigo_fornecedor}</span>
          {/if}
        </p>
      </div>
      
      <div class="voucher-preview__actions shrink-0">
        <!-- Botões com ícones apenas no mobile, texto no desktop -->
        <Button variant="primary" on:click={handleEdit} class_name="!px-2 md:!px-4">
          <Edit size={18} />
          <span class="hidden md:inline ml-2">Editar</span>
        </Button>
        <Button variant="secondary" on:click={handlePrint} class_name="!px-2 md:!px-4">
          <Printer size={18} />
          <span class="hidden md:inline ml-2">Imprimir</span>
        </Button>
        <Button variant="primary" on:click={handleSavePdf} class_name="!px-2 md:!px-4">
          <FileDown size={18} />
          <span class="hidden md:inline ml-2">Salvar PDF</span>
        </Button>
        <Button 
          variant="ghost"
          size="sm"
          class_name="voucher-preview__close"
          title="Fechar"
          on:click={close}
        >
          <X size={20} />
        </Button>
      </div>
    </header>

    <!-- Preview do Voucher -->
    <div class="flex-1 overflow-hidden p-2 md:p-4">
      <div class="max-w-5xl mx-auto h-full flex flex-col">
        {#if docHtml}
          <iframe
            bind:this={iframe}
            srcdoc={docHtml}
            class="w-full flex-1 bg-white shadow-lg rounded-lg border border-slate-200"
            title="Voucher Preview"
            sandbox="allow-scripts allow-same-origin"
            style="min-height: 0;"
          ></iframe>
        {:else}
          <div class="flex items-center justify-center flex-1 text-slate-500">
            Carregando preview...
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* left e top vêm via style inline (reativo ao estado da sidebar) */
  .voucher-preview-area {
    right: 0;
    bottom: 0;
  }

  .voucher-preview__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.875rem 1rem;
  }

  .voucher-preview__meta {
    min-width: 0;
  }

  .voucher-preview__title {
    font-size: 1rem;
    font-weight: 700;
    line-height: 1.15;
    color: #0f172a;
  }

  .voucher-preview__subtitle {
    margin-top: 0.15rem;
    font-size: 0.76rem;
    line-height: 1.3;
    color: #64748b;
  }

  .voucher-preview__actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  :global(.voucher-preview__close) {
    padding: 0.5rem !important;
  }

  @media (min-width: 768px) {
    .voucher-preview__header {
      padding: 1rem 1.5rem;
    }

    .voucher-preview__title {
      font-size: 1.25rem;
    }

    .voucher-preview__subtitle {
      font-size: 0.875rem;
    }

    .voucher-preview__actions {
      gap: 0.5rem;
    }
  }

  @media (max-width: 767px) {
    .voucher-preview__header {
      flex-direction: column;
      align-items: stretch;
      gap: 0.75rem;
    }

    .voucher-preview__actions {
      width: 100%;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  }
</style>
