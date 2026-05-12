<script lang="ts">
  import { X, Calculator, TrendingDown } from 'lucide-svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import OverlayModal from '$lib/components/ui/OverlayModal.svelte';
  import Tabs from '$lib/components/ui/Tabs.svelte';
  import CalculatorBody from '$lib/components/calculadora/CalculatorBody.svelte';
  import ConcorrenciaTab from '$lib/components/modais/ConcorrenciaTab.svelte';

  // Props
  export let open: boolean = false;
  export let onClose: () => void = () => {};

  // Abas
  let abaAtiva = 'calculadora';
  let wasOpen = false;
  let modalEl: HTMLDivElement | null = null;
  let isDragging = false;
  let position = { x: 0, y: 0 };
  let dragStart = { x: 0, y: 0 };
  let dragStartPosition = { x: 0, y: 0 };
  let dragLimits = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

  const abas = [
    { key: 'calculadora', label: 'Calculadora', icon: Calculator },
    { key: 'concorrencia', label: 'Concorrência', icon: TrendingDown },
  ];

  const viewportMargin = 12;

  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  function handleDragStart(event: PointerEvent) {
    if (event.button !== 0 || !modalEl) return;

    const target = event.target as HTMLElement | null;
    if (target?.closest('button, a, input, select, textarea, [data-no-drag]')) return;

    const rect = modalEl.getBoundingClientRect();
    dragStart = { x: event.clientX, y: event.clientY };
    dragStartPosition = { ...position };
    dragLimits = {
      minX: position.x + viewportMargin - rect.left,
      maxX: position.x + window.innerWidth - viewportMargin - rect.right,
      minY: position.y + viewportMargin - rect.top,
      maxY: position.y + window.innerHeight - viewportMargin - rect.bottom
    };
    isDragging = true;
    event.preventDefault();
  }

  function handleDragMove(event: PointerEvent) {
    if (!isDragging) return;

    const nextX = dragStartPosition.x + event.clientX - dragStart.x;
    const nextY = dragStartPosition.y + event.clientY - dragStart.y;
    position = {
      x: clamp(nextX, dragLimits.minX, dragLimits.maxX),
      y: clamp(nextY, dragLimits.minY, dragLimits.maxY)
    };
  }

  function handleDragEnd() {
    isDragging = false;
  }

  function moveModalBy(deltaX: number, deltaY: number) {
    if (!modalEl) return;

    const rect = modalEl.getBoundingClientRect();
    const limits = {
      minX: position.x + viewportMargin - rect.left,
      maxX: position.x + window.innerWidth - viewportMargin - rect.right,
      minY: position.y + viewportMargin - rect.top,
      maxY: position.y + window.innerHeight - viewportMargin - rect.bottom
    };

    position = {
      x: clamp(position.x + deltaX, limits.minX, limits.maxX),
      y: clamp(position.y + deltaY, limits.minY, limits.maxY)
    };
  }

  function handleDragHandleKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    if (target?.closest('button, a, input, select, textarea, [data-no-drag]')) return;

    const step = event.shiftKey ? 96 : 24;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveModalBy(-step, 0);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveModalBy(step, 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveModalBy(0, -step);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveModalBy(0, step);
    } else if (event.key === 'Home') {
      event.preventDefault();
      position = { x: 0, y: 0 };
    }
  }

  $: if (open && !wasOpen) {
    abaAtiva = 'calculadora';
    position = { x: 0, y: 0 };
    isDragging = false;
  }

  $: wasOpen = open;
</script>

<svelte:window on:keydown={(event) => {
  if (!open) return;
  if (event.key === 'Escape') {
    onClose();
  }
}} on:pointermove={handleDragMove} on:pointerup={handleDragEnd} on:pointercancel={handleDragEnd} />

<OverlayModal bind:open position="center" zIndex="z-50" padding="p-4" onclose={onClose}>
    <div 
      bind:this={modalEl}
      class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden will-change-transform"
      class:ring-2={isDragging}
      class:ring-vendas-200={isDragging}
      style={`transform: translate3d(${position.x}px, ${position.y}px, 0);`}
    >
      <!-- Header -->
      <div
        class="vtur-modal-header cursor-move select-none border-b border-slate-100 bg-vendas-50"
        role="button"
        tabindex="0"
        aria-label="Mover calculadora"
        on:pointerdown={handleDragStart}
        on:keydown={handleDragHandleKeydown}
      >
        <div class="vtur-modal-header__lead">
          <div class="vtur-modal-header__icon bg-vendas-100">
            <Calculator size={24} class="text-vendas-600" />
          </div>
          <div class="vtur-modal-header__copy">
            <h3 class="vtur-modal-header__title">Calculadora</h3>
            <p class="vtur-modal-header__subtitle">Operações rápidas no padrão visual do sistema</p>
          </div>
        </div>
        <div data-no-drag>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class_name="vtur-modal-header__close p-2"
            ariaLabel="Fechar calculadora"
            on:click={onClose}
          >
            <X size={20} />
          </Button>
        </div>
      </div>

      <!-- Abas -->
      <div class="vtur-modal-tabs">
        <Tabs items={abas} bind:activeKey={abaAtiva} />
      </div>

      <!-- Content -->
      <div
        class="vtur-modal-body-dense"
        style={abaAtiva === 'calculadora' ? 'padding: 0.875rem 1rem; max-height: none; overflow: visible;' : undefined}
      >

        <!-- Aba Concorrência -->
        {#if abaAtiva === 'concorrencia'}
          <ConcorrenciaTab />
        {:else}
          <CalculatorBody />
        {/if}
      </div>

      <!-- Footer -->
      <div class="vtur-modal-footer vtur-modal-footer--between">
        {#if abaAtiva === 'concorrencia'}
          <div></div>
        {/if}
        <div class="vtur-modal-footer__actions">
          <Button variant="secondary" on:click={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
</OverlayModal>
