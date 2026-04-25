<script lang="ts">
  import { Input, Label, Helper } from 'flowbite-svelte';
  import Button from '../Button.svelte';
  import { buildVturInputClasses } from '../inputContract';
  import { inputMask, type MaskType } from '$lib/actions/inputMask';

  export let label: string | null = null;
  export let value: string | number = '';
  export let placeholder: string = '';
  export let type: 'text' | 'email' | 'password' | 'number' | 'date' | 'datetime-local' | 'month' | 'tel' | 'time' | 'url' = 'text';
  export let required = false;
  export let disabled = false;
  export let readonly = false;
  export let autocomplete: any = null;
  export let error: string | null = null;
  export let helper: string | null = null;
  export let icon: any = null;
  export let prefix: string | null = null;
  export let suffix: string | null = null;
  export let actionIcon: any = null;
  export let actionLabel: string | null = null;
  export let onAction: (() => void) | undefined = undefined;
  export let actionDisabled = false;
  export let id: string | null = null;
  export let name: string | null = null;
  export let list: string | null = null;
  export let min: string | null = null;
  export let max: string | null = null;
  export let step: string | null = null;
  export let maxlength: number | null = null;
  export let class_name = '';

  /**
   * Máscara automática — opcional, não afeta nenhum uso existente.
   * Valores: 'cpf' | 'cnpj' | 'phone' | 'cep' | 'date' | 'rg'
   */
  export let mask: MaskType | undefined = undefined;

  $: fieldId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  $: inputClasses = buildVturInputClasses(
    'text-sm',
    icon || prefix ? 'pl-10' : '',
    suffix || actionIcon ? 'pr-10' : '',
    error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'focus:ring-blue-200'
  );
</script>

<div class={class_name}>
  {#if label}
    <Label for={fieldId} class="mb-1.5 block text-sm font-medium text-slate-700">
      {label}{#if required}<span class="ml-0.5 text-red-500">*</span>{/if}
    </Label>
  {/if}

  <div class="relative w-full">
    {#if prefix}
      <span class="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-sm text-slate-400 select-none">{prefix}</span>
    {/if}

    {#if mask}
      <!--
        Quando há máscara: usa <input> nativo com a action inputMask.
        O Flowbite Input não expõe o elemento DOM interno, então caímos
        no input nativo com as mesmas classes visuais (vtur-input).
      -->
      <input
        use:inputMask={{ type: mask }}
        id={fieldId}
        {name}
        {type}
        bind:value
        placeholder={placeholder || ''}
        {disabled}
        {required}
        {readonly}
        autocomplete={autocomplete ?? undefined}
        maxlength={maxlength ?? undefined}
        class="{inputClasses} w-full"
        on:input
        on:change
        on:blur
        on:focus
        on:keydown
      />
    {:else if icon}
      <Input
        id={fieldId}
        {name}
        {list}
        {type}
        bind:value
        {placeholder}
        {disabled}
        {required}
        {readonly}
        autocomplete={autocomplete ?? undefined}
        {min}
        {max}
        {step}
        {maxlength}
        wrapperClass="relative w-full"
        color={error ? 'red' : 'base'}
        class={inputClasses}
        on:input
        on:change
        on:blur
        on:focus
        on:keydown
      >
        <svelte:component this={icon} slot="left" class="h-4 w-4 text-slate-400" />
      </Input>
    {:else}
      <Input
        id={fieldId}
        {name}
        {list}
        {type}
        bind:value
        {placeholder}
        {disabled}
        {required}
        {readonly}
        autocomplete={autocomplete ?? undefined}
        {min}
        {max}
        {step}
        {maxlength}
        wrapperClass="relative w-full"
        color={error ? 'red' : 'base'}
        class={inputClasses}
        on:input
        on:change
        on:blur
        on:focus
        on:keydown
      />
    {/if}
    {#if suffix}
      <span class="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-sm text-slate-400 select-none">{suffix}</span>
    {/if}
    {#if actionIcon}
      <Button
        type="button"
        variant="unstyled"
        size="xs"
        class_name="absolute right-3 top-1/2 z-10 !-translate-y-1/2 !p-0 text-slate-400 transition-colors hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
        ariaLabel={actionLabel ?? undefined}
        disabled={actionDisabled}
        on:click={() => onAction?.()}
      >
        <svelte:component this={actionIcon} class="h-4 w-4" />
      </Button>
    {/if}
  </div>

  {#if error}
    <Helper class="mt-1 text-red-600">{error}</Helper>
  {:else if helper}
    <Helper class="mt-1 text-slate-500">{helper}</Helper>
  {/if}
</div>
