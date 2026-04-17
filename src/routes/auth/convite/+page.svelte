<script lang="ts">
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/db/supabase';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-svelte';
  
  let email = '';
  let password = '';
  let confirmPassword = '';
  let nome = '';
  let token = '';
  let loading = false;
  let error: string | null = null;
  let success = false;
  
  async function handleSubmit() {
    if (!email || !password || !nome || !token) {
      error = 'Preencha todos os campos';
      return;
    }
    
    if (password !== confirmPassword) {
      error = 'As senhas não conferem';
      return;
    }
    
    if (password.length < 6) {
      error = 'A senha deve ter pelo menos 6 caracteres';
      return;
    }
    
    loading = true;
    error = null;
    
    try {
      // Verificar convite e criar conta
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome,
            invite_token: token
          }
        }
      });
      
      if (signUpError) throw signUpError;
      
      success = true;
      
      // Redirecionar após 2 segundos
      setTimeout(() => {
        goto('/auth/login');
      }, 2000);
      
    } catch (err: any) {
      error = err.message || 'Erro ao ativar conta';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Ativar Conta | VTUR</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
  <div class="w-full max-w-md">
    <!-- Logo -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-3xl font-bold shadow-lg shadow-blue-500/30 mb-4">
        V
      </div>
      <h1 class="text-2xl font-bold text-slate-900">Ativar Conta</h1>
      <p class="text-slate-500 mt-1">Complete seu cadastro no VTUR</p>
    </div>
    
    <Card padding="lg">
      {#if success}
        <div class="text-center py-4">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-4">
            <CheckCircle size={24} />
          </div>
          <h3 class="text-lg font-semibold text-slate-900 mb-2">Conta ativada!</h3>
          <p class="text-slate-500">Redirecionando para o login...</p>
        </div>
      {:else}
        <h2 class="text-xl font-semibold text-slate-900 mb-6 text-center">
          Dados do Convite
        </h2>
        
        {#if error}
          <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        {/if}
        
        <form on:submit|preventDefault={handleSubmit} class="space-y-4">
          <!-- Token -->
          <div>
            <label for="token" class="block text-sm font-medium text-slate-700 mb-1">
              Código do Convite
            </label>
            <input
              id="token"
              type="text"
              bind:value={token}
              class="vtur-input"
              placeholder="Cole o código do convite"
              disabled={loading}
            />
          </div>
          
          <!-- Nome -->
          <div>
            <label for="nome" class="block text-sm font-medium text-slate-700 mb-1">
              Nome Completo
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={18} class="text-slate-400" />
              </div>
              <input
                id="nome"
                type="text"
                bind:value={nome}
                class="vtur-input pl-10"
                placeholder="Seu nome"
                disabled={loading}
              />
            </div>
          </div>
          
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
                class="vtur-input pl-10"
                placeholder="seu@email.com"
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
                type="password"
                bind:value={password}
                class="vtur-input pl-10"
                placeholder="Mínimo 6 caracteres"
                disabled={loading}
              />
            </div>
          </div>
          
          <!-- Confirmar Senha -->
          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-slate-700 mb-1">
              Confirmar Senha
            </label>
            <input
              id="confirmPassword"
              type="password"
              bind:value={confirmPassword}
              class="vtur-input"
              placeholder="Digite a senha novamente"
              disabled={loading}
            />
          </div>
          
          <!-- Botão -->
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            class_name="w-full justify-center"
          >
            Ativar Conta
          </Button>
        </form>
      {/if}
      
      <!-- Voltar -->
      <div class="mt-6 text-center text-sm">
        <span class="text-slate-500">Já tem conta?</span>
        <a href="/auth/login" class="ml-1 text-blue-600 hover:text-blue-700 font-medium">
          Fazer login
        </a>
      </div>
    </Card>
  </div>
</div>
