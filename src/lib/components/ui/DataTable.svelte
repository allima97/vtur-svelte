<script lang="ts">
  import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, Filter, Download, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from 'lucide-svelte';
  import Button from './Button.svelte';
  import type { ModuleColor } from '$lib/theme/colors';
  import type { ComponentType } from 'svelte';

  type SortDirection = 'asc' | 'desc' | null;

  interface Column<T = any> {
    key: string;
    label: string;
    sortable?: boolean;
    width?: string;
    align?: 'left' | 'center' | 'right';
    formatter?: (value: any, row: T) => string;
    component?: ComponentType;
    componentProps?: (row: T) => Record<string, any>;
  }

  interface FilterOption {
    key: string;
    label: string;
    type: 'text' | 'select' | 'date' | 'date-range';
    options?: { value: string; label: string }[];
  }

  export let data: any[] = [];
  export let columns: Column[] = [];
  export let color: ModuleColor = 'clientes';
  export let loading: boolean = false;
  export let selectable: boolean = false;
  export let searchable: boolean = true;
  export let filterable: boolean = true;
  export let exportable: boolean = true;
  export let pagination: boolean = true;
  export let pageSize: number = 10;
  export let pageSizeOptions: number[] = [10, 25, 50, 100];
  export let filters: FilterOption[] = [];
  export let title: string = '';
  export let emptyMessage: string = 'Nenhum registro encontrado';
  export let keyExtractor: (row: any) => string = (row) => row.id || Math.random().toString();

  export let onRowClick: ((row: any) => void) | undefined = undefined;
  export let onSelectionChange: ((selected: any[]) => void) | undefined = undefined;
  export let onExport: (() => void) | undefined = undefined;

  let searchQuery = '';
  let activeFilters: Record<string, any> = {};
  let showFilters = false;
  let currentPage = 1;
  let currentPageSize = pageSize;
  let sortKey: string | null = null;
  let sortDirection: SortDirection = null;
  let selectedRows: Set<string> = new Set();
  let selectAll = false;

  $: filteredData = (() => {
    let result = [...data];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((row) => {
        return columns.some((col) => {
          const value = row[col.key];
          if (value == null) return false;
          return String(value).toLowerCase().includes(query);
        });
      });
    }

    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value !== '' && value != null) {
        result = result.filter((row) => {
          const rowValue = row[key];
          if (Array.isArray(value)) {
            return value.includes(String(rowValue));
          }
          return String(rowValue).toLowerCase().includes(String(value).toLowerCase());
        });
      }
    });

    if (sortKey && sortDirection) {
      result.sort((a, b) => {
        const aVal = a[sortKey!];
        const bVal = b[sortKey!];

        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return sortDirection === 'asc' ? -1 : 1;
        if (bVal == null) return sortDirection === 'asc' ? 1 : -1;

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }

        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();

        if (sortDirection === 'asc') {
          return aStr.localeCompare(bStr);
        }
        return bStr.localeCompare(aStr);
      });
    }

    return result;
  })();

  $: totalPages = Math.ceil(filteredData.length / currentPageSize);
  $: paginatedData = pagination
    ? filteredData.slice((currentPage - 1) * currentPageSize, currentPage * currentPageSize)
    : filteredData;

  $: startIndex = (currentPage - 1) * currentPageSize + 1;
  $: endIndex = Math.min(currentPage * currentPageSize, filteredData.length);

  $: if (searchQuery || Object.keys(activeFilters).length > 0) {
    currentPage = 1;
  }

  function handleSort(column: Column) {
    if (!column.sortable) return;

    if (sortKey === column.key) {
      if (sortDirection === 'asc') {
        sortDirection = 'desc';
      } else if (sortDirection === 'desc') {
        sortDirection = null;
        sortKey = null;
      } else {
        sortDirection = 'asc';
      }
    } else {
      sortKey = column.key;
      sortDirection = 'asc';
    }
  }

  function toggleSelectAll() {
    selectAll = !selectAll;
    if (selectAll) {
      paginatedData.forEach((row) => selectedRows.add(keyExtractor(row)));
    } else {
      paginatedData.forEach((row) => selectedRows.delete(keyExtractor(row)));
    }
    selectedRows = selectedRows;
    onSelectionChange?.([...selectedRows]);
  }

  function toggleRowSelection(row: any) {
    const key = keyExtractor(row);
    if (selectedRows.has(key)) {
      selectedRows.delete(key);
      selectAll = false;
    } else {
      selectedRows.add(key);
    }
    selectedRows = selectedRows;
    onSelectionChange?.([...selectedRows]);
  }

  function clearFilters() {
    activeFilters = {};
    searchQuery = '';
  }

  function applyFilter(key: string, value: any) {
    activeFilters = { ...activeFilters, [key]: value };
  }

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
    }
  }

  function getCellValue(row: any, column: Column): string {
    const value = row[column.key];
    if (column.formatter) {
      return column.formatter(value, row);
    }
    return value != null ? String(value) : '-';
  }

  function isHtmlContent(value: string) {
    return /<[^>]+>/.test(value);
  }
</script>

<div class="space-y-4">
  {#if title || searchable || filterable || exportable}
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {#if title}
        <h3 class="text-lg font-semibold text-slate-900">{title}</h3>
      {/if}

      <div class="flex flex-wrap items-center gap-2">
        {#if searchable}
          <div class="relative">
            <Search size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar..."
              bind:value={searchQuery}
              class="vtur-input vtur-input--search w-full pl-10 pr-4 py-2 sm:w-72"
            />
          </div>
        {/if}

        {#if filterable && filters.length > 0}
          <Button
            variant="secondary"
            on:click={() => (showFilters = !showFilters)}
            class_name={Object.keys(activeFilters).length > 0 ? 'vtur-button--active-filter' : ''}
          >
            <Filter size={16} class="mr-2" />
            Filtros
            {#if Object.keys(activeFilters).length > 0}
              <span class="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white">
                {Object.keys(activeFilters).length}
              </span>
            {/if}
          </Button>
        {/if}

        {#if exportable}
          <Button variant="ghost" on:click={() => onExport?.()}>
            <Download size={16} class="mr-2" />
            Exportar
          </Button>
        {/if}
      </div>
    </div>
  {/if}

  {#if showFilters && filters.length > 0}
    <div class="vtur-filter-panel">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {#each filters as filter}
          <div>
            <label for="filter-{filter.key}" class="mb-1 block text-sm font-medium text-slate-700">{filter.label}</label>
            {#if filter.type === 'select'}
              <select
                id="filter-{filter.key}"
                class="vtur-input w-full px-3 py-2"
                value={activeFilters[filter.key] || ''}
                on:change={(e) => applyFilter(filter.key, e.currentTarget.value)}
              >
                <option value="">Todos</option>
                {#each filter.options || [] as option}
                  <option value={option.value}>{option.label}</option>
                {/each}
              </select>
            {:else}
              <input
                id="filter-{filter.key}"
                type={filter.type === 'date' ? 'date' : 'text'}
                class="vtur-input w-full px-3 py-2"
                placeholder={`Filtrar ${filter.label.toLowerCase()}`}
                value={activeFilters[filter.key] || ''}
                on:input={(e) => applyFilter(filter.key, e.currentTarget.value)}
              />
            {/if}
          </div>
        {/each}
      </div>
      <div class="mt-4 flex justify-end">
        <Button variant="ghost" size="sm" on:click={clearFilters}>
          Limpar filtros
        </Button>
      </div>
    </div>
  {/if}

  <div class="vtur-table-shell">
    <div class="overflow-x-auto">
      <table class="w-full text-sm table-mobile-cards">
        <thead class="vtur-table__head">
          <tr>
            {#if selectable}
              <th class="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectAll}
                  on:change={toggleSelectAll}
                  class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
            {/if}
            {#each columns as column}
              <th class="px-6 py-3 text-left" style={column.width ? `width: ${column.width}` : ''}>
                {#if column.sortable}
                  <button class="flex items-center gap-1 transition-colors hover:text-slate-900" on:click={() => handleSort(column)}>
                    {column.label}
                    {#if sortKey === column.key}
                      {#if sortDirection === 'asc'}
                        <ArrowUp size={14} />
                      {:else if sortDirection === 'desc'}
                        <ArrowDown size={14} />
                      {/if}
                    {:else}
                      <ArrowUpDown size={14} class="text-slate-400" />
                    {/if}
                  </button>
                {:else}
                  {column.label}
                {/if}
              </th>
            {/each}
            {#if $$slots['row-actions'] || $$slots.actions}
              <th class="px-6 py-3 text-right">Ações</th>
            {/if}
          </tr>
        </thead>
        <tbody class="vtur-table__body">
          {#if loading}
            <tr>
              <td colspan={columns.length + (selectable ? 1 : 0) + ($$slots['row-actions'] || $$slots.actions ? 1 : 0)} class="px-6 py-12 text-center">
                <Loader2 size={32} class="mx-auto animate-spin text-slate-400" />
                <p class="mt-2 text-slate-500">Carregando...</p>
              </td>
            </tr>
          {:else if paginatedData.length === 0}
            <tr>
              <td colspan={columns.length + (selectable ? 1 : 0) + ($$slots['row-actions'] || $$slots.actions ? 1 : 0)} class="px-6 py-12 text-center text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          {:else}
            {#each paginatedData as row (keyExtractor(row))}
              <tr class="transition-colors hover:bg-slate-50/90" class:cursor-pointer={onRowClick} on:click={() => onRowClick?.(row)}>
                {#if selectable}
                  <td class="px-4 py-4" on:click|stopPropagation>
                    <input
                      type="checkbox"
                      checked={selectedRows.has(keyExtractor(row))}
                      on:change={() => toggleRowSelection(row)}
                      class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                {/if}
                {#each columns as column}
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900" data-label={column.label}>
                    {#if column.component}
                      <svelte:component this={column.component} {...column.componentProps?.(row) || {}} />
                    {:else}
                      {@const cellValue = getCellValue(row, column)}
                      {#if isHtmlContent(cellValue)}
                        {@html cellValue}
                      {:else}
                        {cellValue}
                      {/if}
                    {/if}
                  </td>
                {/each}
                {#if $$slots['row-actions'] || $$slots.actions}
                  <td class="px-6 py-4 text-right td-actions" on:click|stopPropagation>
                    <slot name="row-actions" {row} />
                    <slot name="actions" {row} />
                  </td>
                {/if}
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>

    {#if pagination && filteredData.length > 0}
      <div class="vtur-table-pagination">
        <div class="text-sm text-slate-500">
          Mostrando <span class="font-medium">{startIndex}</span> a <span class="font-medium">{endIndex}</span> de <span class="font-medium">{filteredData.length}</span> registros
        </div>

        <div class="flex items-center gap-4">
          <select bind:value={currentPageSize} class="vtur-input w-20 px-2 py-1 text-sm">
            {#each pageSizeOptions as size}
              <option value={size}>{size}</option>
            {/each}
          </select>

          <div class="flex items-center gap-1">
            <button on:click={() => goToPage(1)} disabled={currentPage === 1} class="rounded-lg p-2 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50">
              <ChevronsLeft size={16} />
            </button>
            <button on:click={() => goToPage(currentPage - 1)} disabled={currentPage === 1} class="rounded-lg p-2 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50">
              <ChevronLeft size={16} />
            </button>
            <span class="px-3 py-1 text-sm">Página {currentPage} de {totalPages}</span>
            <button on:click={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} class="rounded-lg p-2 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50">
              <ChevronRight size={16} />
            </button>
            <button on:click={() => goToPage(totalPages)} disabled={currentPage === totalPages} class="rounded-lg p-2 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50">
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
