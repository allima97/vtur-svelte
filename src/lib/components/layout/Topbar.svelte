<script lang="ts">
  import { goto } from '$app/navigation';
  import { auth } from '$lib/stores/auth';
  import { sidebar, isMobile, toast } from '$lib/stores/ui';
  import { Dropdown, DropdownItem, DropdownDivider } from 'flowbite-svelte';
  import { Bell, Calendar, LogOut, Menu, User, Settings, Shield } from 'lucide-svelte';

  let loggingOut = false;
  let userDropdownOpen = false;

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
    <!-- Esquerda: menu mobile + brand -->
    <div class="vtur-topbar__left">
      <!-- Botão hambúrguer: visível apenas em telas < lg (1024px) -->
      <button
        class="vtur-icon-button lg:hidden"
        type="button"
        on:click={() => sidebar.toggle()}
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      <a href="/" class="vtur-topbar__brand" aria-label="VTUR inicio">
        <img src="/brand/vtur-symbol.svg" alt="VTUR" class="vtur-topbar__brand-image" />
        <div class="vtur-topbar__brand-copy">
          <span class="vtur-topbar__brand-wordmark">VTUR</span>
          <span class="vtur-topbar__brand-tagline">CRM para Franquias CVC</span>
        </div>
      </a>
    </div>

    <!-- Direita: ações rápidas + usuário -->
    <div class="vtur-topbar__actions">
      <!-- Atalho agenda -->
      <a href="/operacao/agenda" class="vtur-icon-button" aria-label="Ir para Agenda">
        <Calendar size={18} />
      </a>

      <!-- Bell de recados (futuro) -->
      <button
        class="vtur-icon-button relative"
        type="button"
        on:click={openRecadosInfo}
        aria-label="Recados"
      >
        <Bell size={18} />
      </button>

      <!-- Chip de usuário com dropdown -->
      <div class="relative">
        <button
          id="user-menu-btn"
          type="button"
          class="vtur-user-chip cursor-pointer transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-200"
          aria-label="Menu do usuário"
          aria-haspopup="true"
          aria-expanded={userDropdownOpen}
          on:click={() => (userDropdownOpen = !userDropdownOpen)}
        >
          <div class="vtur-user-chip__avatar">{userInitials || 'VT'}</div>
          <div class="vtur-user-chip__copy">
            <span class="vtur-user-chip__name">{userDisplayName}</span>
            <span class="vtur-user-chip__email">{userEmail}</span>
          </div>
        </button>

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
