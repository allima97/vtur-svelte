<script lang="ts">
  import { fade } from 'svelte/transition';
  import { X, Edit, FileDown, Printer } from 'lucide-svelte';
  import Button from '../ui/Button.svelte';
  import { buildVoucherPreviewDocument } from '../../vouchers/preview';
  import type { VoucherRecord, VoucherAssetRecord } from '../../vouchers/types';
  import { createEventDispatcher } from 'svelte';

  export let open = false;
  export let voucher: VoucherRecord | null = null;
  export let assets: VoucherAssetRecord[] = [];

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
    transition:fade={{ duration: 150 }}
  >
    <!-- Header fixo com ações - Responsivo -->
    <header 
      class="bg-white border-b border-slate-200 px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row md:items-center justify-between shadow-sm shrink-0 gap-3"
    >
      <div class="min-w-0">
        <h2 class="text-base md:text-xl font-bold text-slate-900 truncate">{voucher.nome}</h2>
        <p class="text-xs md:text-sm text-slate-500 mt-0.5">
          {voucher.provider === 'special_tours' ? 'Special Tours' : 'Europamundo'}
          {#if voucher.codigo_fornecedor}
            <span class="hidden sm:inline"> • Código: {voucher.codigo_fornecedor}</span>
          {/if}
        </p>
      </div>
      
      <div class="flex items-center gap-2 shrink-0">
        <!-- Botões com ícones apenas no mobile, texto no desktop -->
        <Button variant="secondary" on:click={handleEdit} class_name="!px-2 md:!px-4">
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
          title="Fechar"
          on:click={close}
        >
          <X size={20} />
        </Button>
      </div>
    </header>

    <!-- Preview do Voucher -->
    <div class="flex-1 overflow-auto p-2 md:p-6">
      <div class="max-w-5xl mx-auto h-full">
        {#if docHtml}
          <iframe
            bind:this={iframe}
            srcdoc={docHtml}
            class="w-full h-full min-h-[500px] md:min-h-[600px] bg-white shadow-lg rounded-lg"
            title="Voucher Preview"
            sandbox="allow-scripts allow-same-origin"
          ></iframe>
        {:else}
          <div class="flex items-center justify-center h-full text-slate-500">
            Carregando preview...
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* Desktop: fica dentro da área de conteúdo (à direita da sidebar, abaixo da topbar) */
  .voucher-preview-area {
    top: var(--vtur-desktop-shell-top);
    left: calc(1rem + var(--vtur-sidebar-width) + 1rem);
    right: 0;
    bottom: 0;
  }

  /* Mobile: ocupa tudo abaixo da topbar */
  @media (max-width: 1023px) {
    .voucher-preview-area {
      top: var(--vtur-topbar-height);
      left: 0;
    }
  }
</style>
