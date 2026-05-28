<script lang="ts">
  import Card from '$lib/components/ui/Card.svelte';
  import { Lock } from 'lucide-svelte';
</script>

<svelte:head>
  <title>Cadastro por Convite | VTUR</title>
</svelte:head>

<div class="vtur-auth-shell min-h-screen flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <div class="vtur-auth-brand">
      <div class="vtur-auth-brand-lockup">
        <div class="vtur-auth-brand-row">
          <img src="/brand/vtur-symbol.png?v=9" alt="VTUR" class="vtur-auth-brand-logo w-auto object-contain drop-shadow-[0_12px_24px_rgba(15,23,42,0.16)]" />
          <h1 class="vtur-auth-brand-title text-3xl font-bold">VTUR</h1>
        </div>
        <p class="vtur-auth-brand-subtitle">Sistema de Gestão de Viagens</p>
      </div>
    </div>

    <Card padding="lg">
      <div class="text-center py-4">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 mb-4">
          <Lock size={24} />
        </div>
        <h3 class="text-lg font-semibold text-slate-900 mb-2">Cadastro por convite</h3>
        <p class="text-slate-500 text-sm mb-4">Por segurança, novas contas devem ser criadas por convite ou pelo administrador.</p>
        <a href="/auth/login" class="text-blue-600 hover:text-blue-700 text-sm font-medium">Voltar ao login</a>
      </div>
    </Card>
  </div>
</div>
