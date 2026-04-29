<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase, isMockMode } from '$lib/db/supabase';
  import { auth } from '$lib/stores/auth';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { FieldCheckbox, FieldInput } from '$lib/components/ui';
  import { Mail, Lock, Eye, EyeOff, AlertCircle, TestTube, Clock } from 'lucide-svelte';
  
  let email = '';
  let password = '';
  let showPassword = false;
  let loading = false;
  let error: string | null = null;
  let mockMode = false;
  let sessionExpired = false;
  
  onMount(() => {
    mockMode = isMockMode();
    // Auto-login no modo mock para facilitar testes
    if (mockMode) {
      email = 'admin@vtur.com';
      password = 'admin123';
    }

    // Verifica se foi redirecionado por expiração de sessão
    const params = new URLSearchParams(window.location.search);
    if (params.get('session_expired') === '1') {
      sessionExpired = true;
      // Limpa a query string para não ficar persistindo no histórico
      if (window.history.replaceState) {
        window.history.replaceState({}, '', '/auth/login');
      }
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

<div class="vtur-auth-shell min-h-screen flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <!-- Logo -->
    <div class="vtur-auth-brand">
      <div class="vtur-auth-brand-lockup">
        <div class="vtur-auth-brand-row">
          <img src="/brand/vtur-symbol.png" alt="VTUR" class="vtur-auth-brand-logo w-auto object-contain drop-shadow-[0_14px_28px_rgba(15,23,42,0.18)]" />
          <h1 class="vtur-auth-brand-title text-3xl font-bold">VTUR</h1>
        </div>
        <p class="vtur-auth-brand-subtitle">Sistema de Gestão de Viagens</p>
      </div>
    </div>
    
    <Card padding="lg">
      {#if mockMode}
        <div class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700 text-sm">
          <TestTube size={18} />
          <span><strong>Modo de Teste:</strong> Qualquer email/senha funcionam</span>
        </div>
      {/if}

      {#if sessionExpired}
        <div class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-700 text-sm">
          <Clock size={18} class="shrink-0 mt-0.5" />
          <span><strong>Sessão expirada:</strong> Por segurança, sua sessão foi encerrada. Faça login novamente para continuar.</span>
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
        <FieldInput
          id="email"
          label="Email"
          type="email"
          bind:value={email}
          on:keydown={handleKeydown}
          placeholder="seu@email.com"
          icon={Mail}
          autocomplete="email"
          disabled={loading}
          class_name="w-full"
        />
        
        <!-- Senha -->
        <FieldInput
          id="password"
          label="Senha"
          type={showPassword ? 'text' : 'password'}
          bind:value={password}
          on:keydown={handleKeydown}
          placeholder="••••••••"
          icon={Lock}
          actionIcon={showPassword ? EyeOff : Eye}
          actionLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          onAction={() => (showPassword = !showPassword)}
          autocomplete="current-password"
          disabled={loading}
          class_name="w-full"
        />
        
        <!-- Lembrar-me / Esqueci senha -->
        <div class="flex items-center justify-between text-sm">
          <FieldCheckbox label="Lembrar-me" class_name="text-slate-600" />
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
    <p class="vtur-auth-footer mt-8 text-center text-sm">
      © {new Date().getFullYear()} VTUR. Todos os direitos reservados.
    </p>
  </div>
</div>
