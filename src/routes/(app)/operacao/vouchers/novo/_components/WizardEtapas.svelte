<script lang="ts">
  import { Button } from '$lib/components/ui';
  import type { WizardStep } from './types';

  export let steps: WizardStep[];
  export let goToStep: (step: number) => void;
  export let getStepStatus: (stepIndex: number) => 'completed' | 'current' | 'pending';
</script>

<!-- Wizard Steps -->
<div class="bg-white rounded-xl shadow-sm border border-slate-200 mb-6 overflow-hidden">
  <div class="flex flex-wrap">
    {#each steps as step, i}
      {@const status = getStepStatus(i)}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        class_name={`flex-1 min-w-[140px] !rounded-none !border-0 !px-3 !py-4 flex flex-col items-center justify-center gap-2 text-sm font-medium transition-all relative ${
          status === 'current'
            ? '!bg-clientes-50 !text-clientes-700'
            : status === 'completed'
              ? '!bg-green-50 !text-green-700 hover:!bg-green-100'
              : '!bg-white !text-slate-400 hover:!bg-slate-50'
        }`}
        on:click={() => goToStep(i)}
      >
        <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg
          {status === 'current' 
            ? 'bg-clientes-500 text-white shadow-lg' 
            : status === 'completed'
              ? 'bg-green-500 text-white'
              : 'bg-slate-200 text-slate-500'}">
          <svelte:component this={step.icon} size={20} />
        </div>
        <div class="text-center">
          <p class="font-semibold hidden sm:block">{step.label}</p>
          <p class="text-xs opacity-75 hidden md:block">{step.description}</p>
        </div>
        {#if status === 'current'}
          <div class="absolute bottom-0 left-0 right-0 h-1 bg-clientes-500"></div>
        {/if}
      </Button>
    {/each}
  </div>
</div>
