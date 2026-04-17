<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase, isMockMode } from '$lib/db/supabase';
  import { auth } from '$lib/stores/auth';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { Mail, Lock, Eye, EyeOff, AlertCircle, TestTube } from 'lucide-svelte';
  
  let email = '';
  let password = '';
  let showPassword = false;
  let loading = false;
  let error: string | null = null;
  let mockMode = false;
  
  onMount(() => {
    mockMode = isMockMode();
    // Auto-login no modo mock para facilitar testes
    if (mockMode) {
      email = 'admin@vtur.com';
      password = 'admin123';
    }
  });
  
  async function handleLogin() {
    if (!email || !password) {
      error = 'Preencha email e senha';
      return;
    }
    
    loading = true;
    error = null;
    
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (authError) {
        throw authError;
      }
      
      if (data.session) {
        auth.setAuth(data.user, data.session);
        
        // Salva session nos cookies via endpoint server-side
        await fetch('/api/auth/set-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
          })
        });
        
        goto('/');
      }
    } catch (err: any) {
      error = err.message || 'Erro ao fazer login';
      if (err.message?.includes('Invalid login')) {
        error = 'Email ou senha incorretos';
      }
    } finally {
      loading = false;
    }
  }
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleLogin();
    }
  }
</script>

<svelte:head>
  <title>Login | VTUR</title>
  <meta name="description" content="Acesse o sistema VTUR" />
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
  <div class="w-full max-w-md">
    <!-- Logo -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-4xl font-bold shadow-xl shadow-blue-500/30 mb-4">
        V
      </div>
      <h1 class="text-3xl font-bold text-slate-900">VTUR</h1>
      <p class="text-slate-500 mt-2">Sistema de Gestão de Viagens</p>
    </div>
    
    <Card padding="lg">
      {#if mockMode}
        <div class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700 text-sm">
          <TestTube size={18} />
          <span><strong>Modo de Teste:</strong> Qualquer email/senha funcionam</span>
        </div>
      {/if}
      
      <h2 class="text-xl font-bold text-slate-900 mb-6 text-center">
        Acesse sua conta
      </h2>
      
      {#if error}
        <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      {/if}
      
      <form on:submit|preventDefault={handleLogin} class="space-y-4">
        <!-- Email -->
        <div>
          <label for="email" class="block text-sm font-medium text-slate-700 mb-1">
            Email
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail size={18} class="text-slate-400" />
            </div>
            <input
              id="email"
              type="email"
              bind:value={email}
              on:keydown={handleKeydown}
              class="vtur-input pl-10"
              placeholder="seu@email.com"
              autocomplete="email"
              disabled={loading}
            />
          </div>
        </div>
        
        <!-- Senha -->
        <div>
          <label for="password" class="block text-sm font-medium text-slate-700 mb-1">
            Senha
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={18} class="text-slate-400" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              bind:value={password}
              on:keydown={handleKeydown}
              class="vtur-input pl-10 pr-10"
              placeholder="••••••••"
              autocomplete="current-password"
              disabled={loading}
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              on:click={() => showPassword = !showPassword}
            >
              {#if showPassword}
                <EyeOff size={18} />
              {:else}
                <Eye size={18} />
              {/if}
            </button>
          </div>
        </div>
        
        <!-- Lembrar-me / Esqueci senha -->
        <div class="flex items-center justify-between text-sm">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            <span class="text-slate-600">Lembrar-me</span>
          </label>
          <a href="/auth/recuperar-senha" class="text-blue-600 hover:text-blue-700 font-medium">
            Esqueceu a senha?
          </a>
        </div>
        
        <!-- Botão Login -->
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          class_name="w-full"
        >
          Entrar
        </Button>
      </form>
      
      <!-- Convite -->
      <div class="mt-6 text-center text-sm">
        <span class="text-slate-500">Recebeu um convite?</span>
        <a href="/auth/convite" class="ml-1 text-blue-600 hover:text-blue-700 font-medium">
          Ativar conta
        </a>
      </div>
    </Card>
    
    <!-- Footer -->
    <p class="mt-8 text-center text-sm text-slate-400">
      © {new Date().getFullYear()} VTUR. Todos os direitos reservados.
    </p>
  </div>
</div>
