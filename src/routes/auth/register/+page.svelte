<script lang="ts">
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/db/supabase';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { Mail, Lock, User, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-svelte';

  let nome = '';
  let email = '';
  let password = '';
  let confirmPassword = '';
  let showPassword = false;
  let loading = false;
  let error: string | null = null;
  let success = false;

  async function handleSubmit() {
    if (!nome.trim() || !email.trim() || !password) {
      error = 'Preencha todos os campos.';
      return;
    }
    if (password.length < 6) { error = 'A senha deve ter pelo menos 6 caracteres.'; return; }
    if (password !== confirmPassword) { error = 'As senhas não conferem.'; return; }

    loading = true;
    error = null;

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { nome_completo: nome.trim() }
        }
      });

      if (signUpError) throw signUpError;

      success = true;
    } catch (err: any) {
      error = err.message || 'Erro ao criar conta.';
      if (err.message?.includes('already registered')) {
        error = 'Este e-mail já está cadastrado.';
      }
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Criar Conta | VTUR</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
  <div class="w-full max-w-md">
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-3xl font-bold shadow-lg shadow-blue-500/30 mb-4">V</div>
      <h1 class="text-2xl font-bold text-slate-900">Criar Conta</h1>
      <p class="text-slate-500 mt-1">Crie sua conta no VTUR</p>
    </div>

    <Card padding="lg">
      {#if success}
        <div class="text-center py-4">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-4">
            <CheckCircle size={24} />
          </div>
          <h3 class="text-lg font-semibold text-slate-900 mb-2">Conta criada!</h3>
          <p class="text-slate-500 text-sm mb-4">Verifique seu e-mail para confirmar o cadastro.</p>
          <a href="/auth/login" class="text-blue-600 hover:text-blue-700 text-sm font-medium">Ir para o login</a>
        </div>
      {:else}
        {#if error}
          <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        {/if}

        <form on:submit|preventDefault={handleSubmit} class="space-y-4">
          <div>
            <label for="reg-nome" class="block text-sm font-medium text-slate-700 mb-1">Nome completo</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={18} class="text-slate-400" />
              </div>
              <input id="reg-nome" type="text" bind:value={nome} class="vtur-input pl-10 w-full" placeholder="Seu nome" disabled={loading} />
            </div>
          </div>

          <div>
            <label for="reg-email" class="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={18} class="text-slate-400" />
              </div>
              <input id="reg-email" type="email" bind:value={email} class="vtur-input pl-10 w-full" placeholder="seu@email.com" disabled={loading} autocomplete="email" />
            </div>
          </div>

          <div>
            <label for="reg-password" class="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} class="text-slate-400" />
              </div>
              <input id="reg-password" type={showPassword ? 'text' : 'password'} bind:value={password} class="vtur-input pl-10 pr-10 w-full" placeholder="Mínimo 6 caracteres" disabled={loading} />
              <button type="button" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600" on:click={() => (showPassword = !showPassword)}>
                {#if showPassword}<EyeOff size={18} />{:else}<Eye size={18} />{/if}
              </button>
            </div>
          </div>

          <div>
            <label for="reg-confirm" class="block text-sm font-medium text-slate-700 mb-1">Confirmar senha</label>
            <input id="reg-confirm" type="password" bind:value={confirmPassword} class="vtur-input w-full" placeholder="Repita a senha" disabled={loading} />
          </div>

          <Button type="submit" variant="primary" size="lg" loading={loading} class_name="w-full justify-center">
            Criar conta
          </Button>
        </form>

        <div class="mt-6 text-center text-sm">
          <span class="text-slate-500">Já tem conta?</span>
          <a href="/auth/login" class="ml-1 text-blue-600 hover:text-blue-700 font-medium">Fazer login</a>
        </div>
      {/if}
    </Card>
  </div>
</div>
