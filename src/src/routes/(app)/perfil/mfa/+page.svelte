<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/db/supabase';
  import { formatDateTime as fmtDateTime } from '$lib/utils/formatters';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { FieldInput, LoadingState, ErrorState } from '$lib/components/ui';
  import { toast } from '$lib/stores/ui';
  import { apiFetch, apiGet, apiPost } from '$lib/services/api';
  import { browserSupportsWebAuthn, startRegistration } from '@simplewebauthn/browser';
  import { Shield, KeyRound, CheckCircle, Trash2, QrCode, Fingerprint } from 'lucide-svelte';

  import { confirmAction } from '$lib/stores/confirm';
  import type { MfaFactor, Passkey } from '$lib/types';

  let loading = true;
  let factors: MfaFactor[] = [];
  let passkeys: Passkey[] = [];
  let enrolling = false;
  let verifying = false;
  let removing = false;
  let passkeysLoading = false;
  let registeringPasskey = false;
  let removingPasskeyId: string | null = null;
  let passkeySupported = false;
  let error: string | null = null;

  // Enrollment state
  let enrollmentData: { factorId: string; qrCode: string; secret: string } | null = null;
  let verificationCode = '';

  async function loadFactors() {
    loading = true;
    try {
      const { data, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;
      factors = data?.totp || [];
    } catch (err: any) {
      error = err.message || 'Erro ao carregar fatores 2FA.';
    } finally {
      loading = false;
    }
  }

  async function loadPasskeys() {
    passkeysLoading = true;
    try {
      const payload: any = await apiGet('/api/auth/passkeys');
      passkeys = payload.passkeys || [];
    } catch (err: any) {
      error = err.message || 'Erro ao carregar passkeys.';
    } finally {
      passkeysLoading = false;
    }
  }

  async function startEnrollment() {
    enrolling = true;
    error = null;
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Autenticador VTUR'
      });
      if (enrollError) throw enrollError;

      enrollmentData = {
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret
      };
    } catch (err: any) {
      error = err.message || 'Erro ao iniciar configuração 2FA.';
    } finally {
      enrolling = false;
    }
  }

  async function verifyEnrollment() {
    if (!enrollmentData || !verificationCode.trim()) {
      error = 'Informe o código de verificação.';
      return;
    }

    const code = verificationCode.replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6) { error = 'Código deve ter 6 dígitos.'; return; }

    verifying = true;
    error = null;
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollmentData.factorId
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollmentData.factorId,
        challengeId: challengeData.id,
        code
      });
      if (verifyError) throw verifyError;

      toast.success('Autenticação em duas etapas configurada com sucesso!');
      enrollmentData = null;
      verificationCode = '';
      await loadFactors();
    } catch (err: any) {
      error = err.message?.includes('invalid') || err.message?.includes('Invalid')
        ? 'Código inválido. Verifique o aplicativo autenticador.'
        : err.message || 'Erro ao verificar código.';
    } finally {
      verifying = false;
    }
  }

  async function removeFactor(factorId: string) {
    if (!(await confirmAction('Deseja remover este fator de autenticação? Você precisará configurar novamente para usar 2FA.'))) return;

    removing = true;
    error = null;
    try {
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });
      if (unenrollError) throw unenrollError;

      toast.success('Fator 2FA removido.');
      await loadFactors();
    } catch (err: any) {
      error = err.message || 'Erro ao remover fator 2FA.';
    } finally {
      removing = false;
    }
  }

  async function registerPasskey() {
    if (!browserSupportsWebAuthn()) {
      error = 'Este navegador não suporta passkeys.';
      return;
    }

    registeringPasskey = true;
    error = null;

    try {
      const optionsPayload: any = await apiPost('/api/auth/passkeys/register/options', null);

      const registration = await startRegistration({ optionsJSON: optionsPayload.options });
      await apiPost('/api/auth/passkeys/register/verify', {
        challengeId: optionsPayload.challengeId,
        response: registration,
        name: 'Passkey VTUR'
      });

      toast.success('Passkey cadastrada com sucesso.');
      await loadPasskeys();
    } catch (err: any) {
      error = err.message || 'Erro ao cadastrar passkey.';
    } finally {
      registeringPasskey = false;
    }
  }

  async function removePasskey(passkeyId: string) {
    if (!(await confirmAction('Deseja remover esta passkey? Ela não poderá mais ser usada para entrar no sistema.'))) return;

    removingPasskeyId = passkeyId;
    error = null;

    try {
      await apiFetch('/api/auth/passkeys', {
        method: 'DELETE',
        body: { id: passkeyId }
      });

      toast.success('Passkey removida.');
      await loadPasskeys();
    } catch (err: any) {
      error = err.message || 'Erro ao remover passkey.';
    } finally {
      removingPasskeyId = null;
    }
  }

  function cancelEnrollment() {
    enrollmentData = null;
    verificationCode = '';
    error = null;
  }

  function formatDateTime(value?: string | null) {
    if (!value) return 'Nunca usada';
    return fmtDateTime(value);
  }

  onMount(async () => {
    passkeySupported = browserSupportsWebAuthn();
    await Promise.all([loadFactors(), loadPasskeys()]);
  });

  $: verifiedFactors = factors.filter((f) => f.status === 'verified');
  $: pendingFactors = factors.filter((f) => f.status !== 'verified');
</script>

<svelte:head>
  <title>Autenticação em Duas Etapas | VTUR</title>
</svelte:head>

<PageHeader
  title="Autenticação em Duas Etapas (2FA)"
  subtitle="Configure um autenticador para proteger sua conta com verificação adicional."
  breadcrumbs={[
    { label: 'Perfil', href: '/perfil' },
    { label: '2FA' }
  ]}
/>

{#if loading}
  <LoadingState />
{:else}
  {#if error}
    <ErrorState variant="banner" message={error} />
  {/if}

  <!-- Status atual -->
  <Card class="mb-6">
    <div class="flex items-center gap-4">
      <div class="flex h-12 w-12 items-center justify-center rounded-full {verifiedFactors.length > 0 ? 'bg-green-100' : 'bg-slate-100'}">
        <Shield size={24} class="{verifiedFactors.length > 0 ? 'text-green-600' : 'text-slate-400'}" />
      </div>
      <div>
        <p class="font-semibold text-slate-900">
          {verifiedFactors.length > 0 ? '2FA Ativo' : '2FA Inativo'}
        </p>
        <p class="text-sm text-slate-500">
          {verifiedFactors.length > 0
            ? `${verifiedFactors.length} fator(es) configurado(s)`
            : 'Sua conta não possui autenticação em duas etapas.'}
        </p>
      </div>
      {#if verifiedFactors.length > 0}
        <span class="ml-auto inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
          <CheckCircle size={12} />
          Protegido
        </span>
      {/if}
    </div>
  </Card>

  <Card title="Passkeys" class="mb-6">
    <div class="space-y-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-sm text-slate-600">
            Cadastre Face ID, Touch ID, Windows Hello ou chave de segurança para entrar sem senha.
          </p>
          {#if !passkeySupported}
            <p class="mt-1 text-xs font-medium text-amber-700">
              Este navegador não informou suporte a passkeys.
            </p>
          {/if}
        </div>
        <Button
          variant="primary"
          loading={registeringPasskey}
          disabled={!passkeySupported || passkeysLoading}
          on:click={registerPasskey}
        >
          <Fingerprint size={16} class="mr-2" />
          Adicionar passkey
        </Button>
      </div>

      {#if passkeysLoading}
        <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Carregando passkeys...
        </div>
      {:else if passkeys.length === 0}
        <div class="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
          Nenhuma passkey cadastrada para esta conta.
        </div>
      {:else}
        <div class="space-y-3">
          {#each passkeys as passkey}
            <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div class="flex items-center gap-3">
                <Fingerprint size={18} class="text-blue-600" />
                <div>
                  <p class="font-medium text-slate-900">{passkey.name || 'Passkey'}</p>
                  <p class="text-xs text-slate-500">
                    Criada em {formatDateTime(passkey.created_at)} · Último uso: {formatDateTime(passkey.last_used_at)}
                  </p>
                </div>
              </div>
              <Button
                variant="danger"
                size="sm"
                loading={removingPasskeyId === passkey.id}
                disabled={removingPasskeyId !== null && removingPasskeyId !== passkey.id}
                on:click={() => removePasskey(passkey.id)}
              >
                <Trash2 size={14} class="mr-1" />
                Remover
              </Button>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </Card>

  <!-- Fatores configurados -->
  {#if verifiedFactors.length > 0}
    <Card title="Fatores configurados" class="mb-6">
      <div class="space-y-3">
        {#each verifiedFactors as factor}
          <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div class="flex items-center gap-3">
              <KeyRound size={18} class="text-green-600" />
              <div>
                <p class="font-medium text-slate-900">{factor.friendly_name || 'Autenticador TOTP'}</p>
                <p class="text-xs text-slate-500">Verificado · {factor.factor_type?.toUpperCase() || 'TOTP'}</p>
              </div>
            </div>
            <Button
              variant="danger"
              size="sm"
              loading={removing}
              on:click={() => removeFactor(factor.id)}
            >
              <Trash2 size={14} class="mr-1" />
              Remover
            </Button>
          </div>
        {/each}
      </div>
    </Card>
  {/if}

  <!-- Configurar novo fator -->
  {#if !enrollmentData}
    <Card title="Configurar autenticador">
      <p class="text-sm text-slate-600 mb-4">
        Use um aplicativo autenticador como Google Authenticator, Authy ou Microsoft Authenticator para gerar códigos de verificação.
      </p>
      <Button variant="primary" loading={enrolling} on:click={startEnrollment}>
        <QrCode size={16} class="mr-2" />
        Configurar autenticador
      </Button>
    </Card>
  {:else}
    <Card title="Escanear QR Code">
      <div class="space-y-6">
        <div class="flex flex-col items-center gap-4">
          <p class="text-sm text-slate-600 text-center">
            Abra seu aplicativo autenticador e escaneie o QR Code abaixo.
          </p>
          <!-- QR Code como imagem SVG/PNG do Supabase -->
          <div class="rounded-xl border border-slate-200 bg-white p-4">
            <img src={enrollmentData.qrCode} alt="QR Code 2FA" class="h-48 w-48" />
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
            <p class="text-xs text-slate-500 mb-1">Ou insira o código manualmente:</p>
            <code class="text-sm font-mono font-semibold text-slate-900 break-all">{enrollmentData.secret}</code>
          </div>
        </div>

        <div>
          <FieldInput
            id="mfa-verify-code"
            bind:value={verificationCode}
            label="Código de verificação"
            type="text"
            placeholder="000000"
            maxlength={6}
            autocomplete="one-time-code"
            class_name="[&_input]:w-full [&_input]:text-center [&_input]:text-2xl [&_input]:font-mono [&_input]:tracking-widest"
            on:input={(event) => {
              verificationCode = (event.currentTarget as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6);
            }}
          />
          <p class="mt-1 text-xs text-slate-500">Informe o código de 6 dígitos gerado pelo aplicativo.</p>
        </div>

        <div class="flex gap-3">
          <Button variant="secondary" on:click={cancelEnrollment}>Cancelar</Button>
          <Button variant="primary" loading={verifying} on:click={verifyEnrollment}>
            <CheckCircle size={16} class="mr-2" />
            Verificar e ativar
          </Button>
        </div>
      </div>
    </Card>
  {/if}
{/if}
