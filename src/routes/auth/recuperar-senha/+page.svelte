<script lang="ts">
  import { supabase } from '$lib/db/supabase';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import FieldInput from '$lib/components/ui/form/FieldInput.svelte';
  import { Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-svelte';

  let email = '';
  let loading = false;
  let error: string | null = null;
  let success = false;
  let cooldown = 0;
  let cooldownTimer: ReturnType<typeof setInterval> | null = null;

  function startCooldown(seconds: number) {
    cooldown = seconds;
    if (cooldownTimer) clearInterval(cooldownTimer);
    cooldownTimer = setInterval(() => {
      cooldown = Math.max(0, cooldown - 1);
      if (cooldown === 0 && cooldownTimer) {
        clearInterval(cooldownTimer);
        cooldownTimer = null;
        error = null;
      }
    }, 1000);
  }

  async function handleSubmit() {
    if (!email.trim()) { error = 'Informe seu e-mail.'; return; }
    if (cooldown > 0) return;

    loading = true;
    error = null;

    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/nova-senha`
      });

      if (authError) {
        const msg = authError.message || '';
        const match = msg.match(/(\d+)\s*second/i);
        if (match) {
          startCooldown(Number(match[1]));
          error = `Muitas solicitações. Aguarde ${match[1]} segundos.`;
        } else {
          error = 'Erro ao enviar e-mail. Verifique o endereço e tente novamente.';
        }
        return;
      }

      success = true;
    } catch {
      error = 'Erro inesperado. Tente novamente.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Recuperar Senha | VTUR</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
  <div class="w-full max-w-md">
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-3xl font-bold shadow-lg shadow-blue-500/30 mb-4">V</div>
      <h1 class="text-2xl font-bold text-slate-900">Recuperar Senha</h1>
      <p class="text-slate-500 mt-1">Enviaremos um link para redefinir sua senha</p>
    </div>

    <Card padding="lg">
      {#if success}
        <div class="text-center py-4">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-4">
            <CheckCircle size={24} />
          </div>
          <h3 class="text-lg font-semibold text-slate-900 mb-2">E-mail enviado!</h3>
          <p class="text-slate-500 text-sm">Verifique sua caixa de entrada e clique no link para redefinir sua senha.</p>
          <a href="/auth/login" class="mt-4 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
            <ArrowLeft size={16} />
            Voltar ao login
          </a>
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
            label="E-mail"
            bind:value={email}
            type="email"
            placeholder="seu@email.com"
            disabled={loading}
            autocomplete="email"
            icon={Mail}
          />

          <Button type="submit" variant="primary" size="lg" loading={loading || cooldown > 0} class_name="w-full justify-center">
            {cooldown > 0 ? `Aguarde ${cooldown}s...` : 'Enviar link de recuperação'}
          </Button>
        </form>

        <div class="mt-6 text-center text-sm">
          <a href="/auth/login" class="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700">
            <ArrowLeft size={14} />
            Voltar ao login
          </a>
        </div>
      {/if}
    </Card>
  </div>
</div>
