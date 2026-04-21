<script lang="ts">
  import { Dropzone, Helper, Label } from 'flowbite-svelte';

  export let label: string | null = null;
  export let title = 'Clique para escolher um arquivo';
  export let description: string | null = null;
  export let hint: string | null = null;
  export let files: FileList | undefined = undefined;
  export let accept: string | null = null;
  export let disabled = false;
  export let required = false;
  export let id: string | null = null;
  export let name: string | null = null;
  export let error: string | null = null;
  export let helper: string | null = null;
  export let icon: any = null;
  export let class_name = '';

  $: fieldId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  $: fileNames = files ? Array.from(files).map((file) => file.name) : [];
</script>

<div class={class_name}>
  {#if label}
    <Label for={fieldId} class="mb-1.5 block text-sm font-medium text-slate-700">
      {label}{#if required}<span class="ml-0.5 text-red-500">*</span>{/if}
    </Label>
  {/if}

  <Dropzone
    id={fieldId}
    {name}
    bind:files
    {accept}
    {disabled}
    {required}
    class={`vtur-upload-dropzone ${error ? 'border-red-300 ring-1 ring-red-200' : ''}`}
    on:change
    on:blur
    on:focus
    on:drop
  >
    <div class="flex flex-col items-center gap-3 px-5 py-6 text-center">
      {#if icon}
        <div class="vtur-upload-dropzone__icon">
          <svelte:component this={icon} size={22} />
        </div>
      {/if}

      <div class="space-y-1">
        <p class="vtur-upload-dropzone__title">{title}</p>
        {#if description}
          <p class="vtur-upload-dropzone__meta">{description}</p>
        {/if}
      </div>

      {#if fileNames.length > 0}
        <div class="space-y-1">
          {#each fileNames as fileName}
            <p class="vtur-upload-dropzone__file">{fileName}</p>
          {/each}
        </div>
      {:else if hint}
        <p class="vtur-upload-dropzone__hint">{hint}</p>
      {/if}
    </div>
  </Dropzone>

  {#if error}
    <Helper class="mt-1 text-red-600">{error}</Helper>
  {:else if helper}
    <Helper class="mt-1 text-slate-500">{helper}</Helper>
  {/if}
</div>
