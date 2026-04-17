<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/db/supabase';
  import { permissoes } from '$lib/stores/permissoes';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { AlertCircle, Shield, KeyRound } from 'lucide-svelte';

  let codigo = '';
  let loading = true;
  let verificando = false;
  let error: string | null = null;
  let factorId = '';
  let nextPath = '/';

  onMount(async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      nextPath = params.get('next') || '/';

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user) {
        goto('/auth/login');
        return;
      }

      // Verifica se já está em AAL2
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.currentLevel === 'aal2') {
        goto(nextPath);
        return;
      }

      // Busca fatores TOTP verificados
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedFactor = factorsData?.totp?.find((f: any) => f.status === 'verified');

      if (!verifiedFactor) {
        // Sem fator 2FA configurado — verifica política
        const policyResp = await fetch('/api/v1/admin/auth/mfa-status');
        if (policyResp.ok) {
          const policy = await policyResp.json();
          if (policy?.required) {
            goto(`/perfil?setup_2fa=1&next=${encodeURIComponent(nextPath)}`);
            return;
          }
        }
        // Sem 2FA obrigatório, redireciona direto
        goto(nextPath);
        return;
      }

      factorId = verifiedFactor.id;
    } catch (err: any) {
      error = err.message || 'Erro ao carregar verificação 2FA.';
    } finally {
      loading = false;
    }
  });

  function normalizeCodigo(value: string) {
    return value.replace(/\D/g, '').slice(0, 6);
  }

  async function verificar() {
    const code = normalizeCodigo(codigo);
    if (code.length !== 6) { error = 'Informe o código de 6 dígitos.'; return; }
    if (!factorId) { error = 'Fator 2FA não encontrado.'; return; }

    verificando = true;
    error = null;

    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code
      });
      if (verifyError) throw verifyError;

      // Atualiza permissões e redireciona
      const supabaseClient = supabase;
      await permissoes.refresh(supabaseClient);
      goto(nextPath);
    } catch (err: any) {
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('invalid') || msg.includes('incorrect') || msg.includes('expired')) {
        error = 'Código inválido ou expirado. Verifique o aplicativo autenticador.';
      } else {
        error = err.message || 'Erro ao verificar código.';
      }
      codigo = '';
    } finally {
      verificando = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') verificar();
  }
</script>

<svelte:head>
  <title>Verificação em Duas Etapas | VTUR</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
  <div class="w-full max-w-md">
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 mb-4">
        <Shield size={32} />
      </div>
      <h1 class="text-2xl font-bold text-slate-900">Verificação em Duas Etapas</h1>
      <p class="text-slate-500 mt-1">Informe o código do seu aplicativo autenticador</p>
    </div>

    <Card padding="lg">
      {#if loading}
        <div class="text-center py-8 text-slate-500">Carregando...</div>
      {:else}
        {#if error}
          <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        {/if}

        <div class="space-y-4">
          <div>
            <label for="mfa-code" class="block text-sm font-medium text-slate-700 mb-1">Código de verificação</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <KeyRound size={18} class="text-slate-400" />
              </div>
              <input
                id="mfa-code"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                bind:value={codigo}
                on:input={(e) => { codigo = normalizeCodigo((e.currentTarget as HTMLInputElement).value); }}
                on:keydown={handleKeydown}
                class="vtur-input pl-10 w-full text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
                maxlength="6"
                disabled={verificando}
              />
            </div>
            <p class="mt-1 text-xs text-slate-500">Abra o aplicativo autenticador (Google Authenticator, Authy, etc.) e informe o código de 6 dígitos.</p>
          </div>

          <Button
            type="button"
            variant="primary"
            size="lg"
            loading={verificando}
            class_name="w-full justify-center"
            on:click={verificar}
          >
            Verificar
          </Button>
        </div>

        <div class="mt-6 text-center text-sm">
          <a href="/auth/login" class="text-slate-500 hover:text-slate-700">
            Voltar ao login
          </a>
        </div>
      {/if}
    </Card>
  </div>
</div>
