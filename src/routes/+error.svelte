<script lang="ts">
  import { page } from '$app/stores';
  import { Button } from 'flowbite-svelte';
  import { Home, AlertTriangle, ArrowLeft } from 'lucide-svelte';
  
  $: status = $page.status;
  $: message = $page.error?.message || 'Ocorreu um erro inesperado';
</script>

<svelte:head>
  <title>Erro {status} | VTUR</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
  <div class="w-full max-w-md text-center">
    <!-- Ícone de erro -->
    <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-100 text-red-600 mb-6">
      <AlertTriangle size={40} />
    </div>
    
    <!-- Código de erro -->
    <h1 class="text-6xl font-bold text-slate-900 mb-2">{status}</h1>
    
    <!-- Mensagem -->
    <p class="text-xl text-slate-600 mb-2">
      {#if status === 404}
        Página não encontrada
      {:else if status === 500}
        Erro interno do servidor
      {:else}
        Ocorreu um erro
      {/if}
    </p>
    
    <p class="text-slate-500 mb-8">{message}</p>
    
    <!-- Ações -->
    <div class="flex flex-col sm:flex-row gap-3 justify-center">
      <Button href="/" color="blue">
        <Home size={18} class="mr-2" />
        Ir para o Dashboard
      </Button>
      
      <Button href="javascript:history.back()" color="light">
        <ArrowLeft size={18} class="mr-2" />
        Voltar
      </Button>
    </div>
    
    <!-- Footer -->
    <p class="mt-8 text-sm text-slate-400">
      © {new Date().getFullYear()} VTUR. Sistema de Gestão de Viagens.
    </p>
  </div>
</div>
