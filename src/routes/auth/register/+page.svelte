<script lang="ts">
  import { supabase } from '$lib/db/supabase';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { FieldInput } from '$lib/components/ui';
  import { Mail, Lock, User, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-svelte';

  let nome = '';
  let email = '';
  let password = '';
  let confirmPassword = '';
  let showPassword = false;
  let showConfirmPassword = false;
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
          <FieldInput
            id="reg-nome"
            label="Nome completo"
            type="text"
            bind:value={nome}
            placeholder="Seu nome"
            icon={User}
            autocomplete="name"
            disabled={loading}
            class_name="w-full"
          />

          <FieldInput
            id="reg-email"
            label="E-mail"
            type="email"
            bind:value={email}
            placeholder="seu@email.com"
            icon={Mail}
            autocomplete="email"
            disabled={loading}
            class_name="w-full"
          />

          <FieldInput
            id="reg-password"
            label="Senha"
            type={showPassword ? 'text' : 'password'}
            bind:value={password}
            placeholder="Mínimo 6 caracteres"
            icon={Lock}
            actionIcon={showPassword ? EyeOff : Eye}
            actionLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            onAction={() => (showPassword = !showPassword)}
            autocomplete="new-password"
            disabled={loading}
            class_name="w-full"
          />

          <FieldInput
            id="reg-confirm"
            label="Confirmar senha"
            type={showConfirmPassword ? 'text' : 'password'}
            bind:value={confirmPassword}
            placeholder="Repita a senha"
            icon={Lock}
            actionIcon={showConfirmPassword ? EyeOff : Eye}
            actionLabel={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
            onAction={() => (showConfirmPassword = !showConfirmPassword)}
            autocomplete="new-password"
            disabled={loading}
            class_name="w-full"
          />

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
