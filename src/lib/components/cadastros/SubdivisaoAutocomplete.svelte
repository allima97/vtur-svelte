<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';
  import FieldInput from '$lib/components/ui/form/FieldInput.svelte';

  type SubdivisaoOption = {
    id: string;
    nome: string;
    pais_id?: string | null;
    pais?: { nome: string } | null;
  };

  const dispatch = createEventDispatcher<{
    select: SubdivisaoOption;
  }>();

  export let id = '';
  export let label = 'Estado/Província';
  export let placeholder = 'Digite para buscar...';
  export let value = '';
  export let options: SubdivisaoOption[] = [];
  export let loading = false;
  export let disabled = false;
  export let required = false;
  export let error: string | null = null;
  export let helper: string | null = null;

  let searchText = '';
  let open = false;
  let activeIndex = 0;
  let filteredOptions: SubdivisaoOption[] = [];
  let blurTimer: ReturnType<typeof setTimeout> | null = null;

  function normalizeLookup(value: string | null | undefined) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function getOptionLabel(option: SubdivisaoOption) {
    const nome = String(option?.nome || '').trim();
    const pais = String(option?.pais?.nome || '').trim();
    return pais ? `${nome} · ${pais}` : nome;
  }

  function getOptionScore(option: SubdivisaoOption, input: string) {
    const query = normalizeLookup(input);
    if (!query) return 100;

    const nome = normalizeLookup(option.nome);
    const pais = normalizeLookup(option.pais?.nome);
    const full = `${nome} ${pais}`.trim();

    if (nome === query) return 0;
    if (nome.startsWith(query)) return 1;
    if (full.startsWith(query)) return 2;
    if (pais && pais.startsWith(query)) return 3;
    if (full.includes(query)) return 4;
    return 10;
  }

  function uniqueOptions(items: SubdivisaoOption[]) {
    const byId = new Map<string, SubdivisaoOption>();
    items.forEach((item) => {
      const optionId = String(item?.id || '').trim();
      if (!optionId) return;
      byId.set(optionId, { ...(byId.get(optionId) || {}), ...item });
    });
    return Array.from(byId.values());
  }

  function getSelectedOption() {
    return options.find((item) => String(item.id) === String(value)) || null;
  }

  function getFilteredOptions(input: string) {
    const query = normalizeLookup(input);
    const base = query
      ? options.filter((item) => normalizeLookup(`${item.nome} ${item.pais?.nome || ''}`).includes(query))
      : options;

    return uniqueOptions(base)
      .sort((a, b) => {
        const scoreDiff = getOptionScore(a, input) - getOptionScore(b, input);
        if (scoreDiff !== 0) return scoreDiff;

        const nomeDiff = String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base' });
        if (nomeDiff !== 0) return nomeDiff;

        return String(a.pais?.nome || '').localeCompare(String(b.pais?.nome || ''), 'pt-BR', { sensitivity: 'base' });
      })
      .slice(0, 30);
  }

  function selectOption(option: SubdivisaoOption) {
    value = String(option.id || '');
    searchText = getOptionLabel(option);
    activeIndex = 0;
    open = false;
    dispatch('select', option);
  }

  function resolveTypedValue() {
    const typed = searchText.trim();
    if (!typed) {
      value = '';
      return;
    }

    const normalized = normalizeLookup(typed);
    const filtered = getFilteredOptions(typed);
    const exact = uniqueOptions([...filtered, ...options]).find((item) => {
      return normalizeLookup(item.nome) === normalized || normalizeLookup(getOptionLabel(item)) === normalized;
    });

    if (exact) {
      selectOption(exact);
      return;
    }

    if (filtered.length === 1) {
      selectOption(filtered[0]);
      return;
    }

    if (value) {
      const selected = getSelectedOption();
      if (selected) searchText = getOptionLabel(selected);
      return;
    }

    value = '';
  }

  function closeSoon() {
    if (blurTimer) clearTimeout(blurTimer);
    blurTimer = setTimeout(() => {
      open = false;
      resolveTypedValue();
    }, 120);
  }

  function handleInput(event: Event) {
    searchText = (event.currentTarget as HTMLInputElement).value;
    open = true;
    value = '';
    activeIndex = 0;
  }

  function handleFocus() {
    open = true;
  }

  function handleKeydown(event: KeyboardEvent) {
    const filtered = getFilteredOptions(searchText);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      open = true;
      activeIndex = filtered.length === 0 ? 0 : (activeIndex + 1) % filtered.length;
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      open = true;
      activeIndex = filtered.length === 0 ? 0 : (activeIndex - 1 + filtered.length) % filtered.length;
      return;
    }

    if (event.key === 'Enter') {
      if (open && filtered[activeIndex]) {
        event.preventDefault();
        selectOption(filtered[activeIndex]);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      open = false;
      const selected = getSelectedOption();
      if (selected) searchText = getOptionLabel(selected);
    }
  }

  $: if (value) {
    const selected = getSelectedOption();
    if (selected && !open) {
      const labelValue = getOptionLabel(selected);
      if (searchText !== labelValue) {
        searchText = labelValue;
      }
    }
  } else if (!open && !searchText.trim()) {
    searchText = '';
  }

  $: filteredOptions = getFilteredOptions(searchText);

  $: if (activeIndex >= filteredOptions.length) {
    activeIndex = filteredOptions.length > 0 ? 0 : -1;
  }

  onDestroy(() => {
    if (blurTimer) clearTimeout(blurTimer);
  });
</script>

<div class="relative">
  <FieldInput
    {id}
    {label}
    bind:value={searchText}
    {placeholder}
    {disabled}
    {required}
    autocomplete="off"
    error={error}
    helper={helper}
    class_name="w-full"
    on:input={handleInput}
    on:focus={handleFocus}
    on:blur={closeSoon}
    on:keydown={handleKeydown}
  />

  {#if open}
    <div class="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
      {#if loading}
        <div class="px-3 py-2 text-sm text-slate-500">Carregando estados...</div>
      {:else if filteredOptions.length === 0}
        <div class="px-3 py-2 text-sm text-slate-500">Nenhum estado/província encontrado.</div>
      {:else}
        {#each filteredOptions as option, index}
          <button
            type="button"
            class={`w-full px-3 py-2 text-left text-sm transition-colors ${
              index === activeIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'
            }`}
            on:mousedown|preventDefault={() => selectOption(option)}
          >
            <span class="block font-medium">{option.nome}</span>
            {#if option.pais?.nome}
              <span class="block text-xs text-slate-500">{option.pais.nome}</span>
            {/if}
          </button>
        {/each}
      {/if}
    </div>
  {/if}
</div>
