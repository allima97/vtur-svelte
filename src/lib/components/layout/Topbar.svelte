<script lang="ts">
  import { goto } from '$app/navigation';
  import Button from '$lib/components/ui/Button.svelte';
  import { auth } from '$lib/stores/auth';
  import { sidebar, isMobile, toast } from '$lib/stores/ui';
  import { Dropdown, DropdownItem, DropdownDivider, Tooltip } from 'flowbite-svelte';
  import { Bell, Calendar, Calculator, LogOut, User, Settings, Shield } from 'lucide-svelte';
  import CalculatorModal from '$lib/components/modais/CalculatorModal.svelte';

  let loggingOut = false;
  let userDropdownOpen = false;
  let showCalculator = false;

  $: currentUser = $auth.user;
  $: userDisplayName =
    currentUser?.user_metadata?.nome_completo ||
    currentUser?.user_metadata?.nome ||
    currentUser?.email?.split('@')[0] ||
    'Usuario';
  $: userEmail = currentUser?.email || 'Sem email';
  $: userInitials = userDisplayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0])
    .join('')
    .toUpperCase();

  function openRecadosInfo() {
    toast.info('Mural de recados será portado na próxima etapa.');
  }

  function handleLogout() {
    if (loggingOut) return;
    loggingOut = true;
    window.location.href = '/auth/logout';
  }
</script>

<header class="vtur-topbar">
  <div class="vtur-topbar__inner">
    <!-- Esquerda: brand (mobile: só logo; desktop: logo + nome) -->
    <div class="vtur-topbar__left">
      <a href="/" class="vtur-topbar__brand" aria-label="VTUR inicio">
        <img src="/brand/vtur-symbol.svg" alt="VTUR" class="vtur-topbar__brand-image" />
        {#if !$isMobile}
          <div class="vtur-topbar__brand-copy">
            <span class="vtur-topbar__brand-wordmark">VTUR</span>
            <span class="vtur-topbar__brand-tagline">CRM para Franquias CVC</span>
          </div>
        {/if}
      </a>
    </div>

    <!-- Direita: ações + avatar -->
    <div class="vtur-topbar__actions">
      {#if !$isMobile}
        <!-- Calculadora -->
        <Button
          id="topbar-btn-calc"
          type="button"
          variant="unstyled"
          size="sm"
          class_name="vtur-icon-button !h-10 !w-10 !rounded-xl !p-0"
          ariaLabel="Calculadora"
          on:click={() => (showCalculator = true)}
        >
          <Calculator size={18} />
        </Button>
        <Tooltip triggeredBy="#topbar-btn-calc" placement="bottom">Calculadora</Tooltip>

        <!-- Agenda -->
        <Button
          id="topbar-btn-agenda"
          href="/operacao/agenda"
          variant="unstyled"
          size="sm"
          class_name="vtur-icon-button !h-10 !w-10 !rounded-xl !p-0"
          ariaLabel="Ir para Agenda"
        >
          <Calendar size={18} />
        </Button>
        <Tooltip triggeredBy="#topbar-btn-agenda" placement="bottom">Agenda</Tooltip>

        <!-- Recados -->
        <Button
          id="topbar-btn-bell"
          type="button"
          variant="unstyled"
          size="sm"
          class_name="vtur-icon-button relative !h-10 !w-10 !rounded-xl !p-0"
          on:click={openRecadosInfo}
          ariaLabel="Recados"
        >
          <Bell size={18} />
        </Button>
        <Tooltip triggeredBy="#topbar-btn-bell" placement="bottom">Recados</Tooltip>
      {/if}

      <!-- Avatar com dropdown (sempre visível) -->
      <div class="relative">
        <Button
          id="user-menu-btn"
          type="button"
          variant="unstyled"
          class_name="vtur-user-chip cursor-pointer transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-200"
          ariaLabel="Menu do usuário"
          ariaHaspopup="true"
          ariaExpanded={userDropdownOpen}
          on:click={() => (userDropdownOpen = !userDropdownOpen)}
        >
          <div class="vtur-user-chip__avatar">{userInitials || 'VT'}</div>
          {#if !$isMobile}
            <div class="vtur-user-chip__copy">
              <span class="vtur-user-chip__name">{userDisplayName}</span>
              <span class="vtur-user-chip__email">{userEmail}</span>
            </div>
          {/if}
        </Button>

        <Dropdown
          triggeredBy="#user-menu-btn"
          bind:open={userDropdownOpen}
          class="z-[1100] min-w-[200px]"
        >
          <div class="px-4 py-3">
            <p class="truncate text-xs font-medium text-slate-800">{userDisplayName}</p>
            <p class="truncate text-xs text-slate-500">{userEmail}</p>
          </div>
          <DropdownDivider />
          <DropdownItem href="/perfil" on:click={() => (userDropdownOpen = false)}>
            <User size={15} class="mr-2 text-slate-500" />
            Meu Perfil
          </DropdownItem>
          <DropdownItem href="/operacao/agenda" on:click={() => (userDropdownOpen = false)}>
            <Calendar size={15} class="mr-2 text-slate-500" />
            Minha Agenda
          </DropdownItem>
          <DropdownItem href="/perfil/mfa" on:click={() => (userDropdownOpen = false)}>
            <Shield size={15} class="mr-2 text-slate-500" />
            Autenticação 2FA
          </DropdownItem>
          <DropdownItem href="/parametros" on:click={() => (userDropdownOpen = false)}>
            <Settings size={15} class="mr-2 text-slate-500" />
            Parâmetros
          </DropdownItem>
          <DropdownDivider />
          <DropdownItem
            on:click={() => { userDropdownOpen = false; handleLogout(); }}
            class="text-red-600 hover:bg-red-50"
          >
            <LogOut size={15} class="mr-2" />
            {loggingOut ? 'Saindo...' : 'Sair'}
          </DropdownItem>
        </Dropdown>
      </div>
    </div>
  </div>
</header>

<CalculatorModal
  bind:open={showCalculator}
  onClose={() => (showCalculator = false)}
  onConfirm={() => (showCalculator = false)}
/>
