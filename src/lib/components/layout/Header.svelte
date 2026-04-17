<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { page } from '$app/stores';
  import type { ModuleColor } from '$lib/theme/colors';
  import { MODULE_COLORS } from '$lib/theme/colors';
  import { Menu, Bell, Search, User } from 'lucide-svelte';
  
  export let moduleColor: ModuleColor = 'default';
  
  const dispatch = createEventDispatcher();
  
  $: colors = MODULE_COLORS[moduleColor];
  
  // Título da página baseado na rota
  $: pageTitle = (() => {
    const path = $page.url.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/clientes')) return 'Clientes';
    if (path.startsWith('/vendas')) return 'Vendas';
    if (path.startsWith('/financeiro')) return 'Financeiro';
    if (path.startsWith('/parametros')) return 'Parâmetros';
    return 'VTUR';
  })();
</script>

<header class="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-6">
  <!-- Left: Menu button + Title -->
  <div class="flex items-center">
    <button
      on:click={() => dispatch('toggleSidebar')}
      class="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 mr-3"
    >
      <Menu size={20} />
    </button>
    
    <h1 
      class="text-lg font-semibold text-gray-900"
      style="color: {colors.primary}"
    >
      {pageTitle}
    </h1>
  </div>
  
  <!-- Right: Actions -->
  <div class="flex items-center space-x-4">
    <!-- Search (desktop) -->
    <div class="hidden md:block relative">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search size={16} class="text-gray-400" />
      </div>
      <input
        type="text"
        placeholder="Buscar..."
        class="block w-64 pl-10 pr-3 py-1.5 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
    
    <!-- Notifications -->
    <button class="relative p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100">
      <Bell size={20} />
      <span class="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
    </button>
    
    <!-- User menu -->
    <button class="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100">
      <div 
        class="h-8 w-8 rounded-full flex items-center justify-center text-white"
        style="background-color: {colors.primary}"
      >
        <User size={16} />
      </div>
    </button>
  </div>
</header>
