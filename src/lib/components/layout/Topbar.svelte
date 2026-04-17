<script lang="ts">
  import { goto } from '$app/navigation';
  import { auth } from '$lib/stores/auth';
  import { sidebar, isMobile, toast } from '$lib/stores/ui';
  import { Bell, Calendar, LogOut, Menu } from 'lucide-svelte';

  let loggingOut = false;

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
    toast.info('Mural de recados sera portado na proxima etapa.');
  }

  function openAgenda() {
    goto('/operacao/agenda');
  }

  function handleLogout() {
    if (loggingOut) return;
    loggingOut = true;
    window.location.href = '/auth/logout';
  }
</script>

<header class="vtur-topbar">
  <div class="vtur-topbar__inner">
    <div class="vtur-topbar__left">
      {#if $isMobile}
        <button
          class="vtur-icon-button lg:hidden"
          type="button"
          on:click={() => sidebar.toggle()}
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
      {/if}

      <a href="/" class="vtur-topbar__brand" aria-label="VTUR inicio">
        <img src="/brand/vtur-symbol.svg" alt="VTUR" class="vtur-topbar__brand-image" />
        <div class="vtur-topbar__brand-copy">
          <span class="vtur-topbar__brand-wordmark">VTUR</span>
          <span class="vtur-topbar__brand-tagline">CRM para Franquias CVC</span>
        </div>
      </a>
    </div>

    <div class="vtur-topbar__actions">
      <button class="vtur-icon-button" type="button" on:click={openAgenda} aria-label="Agenda">
        <Calendar size={18} />
      </button>

      <button class="vtur-icon-button" type="button" on:click={openRecadosInfo} aria-label="Recados">
        <Bell size={18} />
      </button>

      <div class="vtur-user-chip" title={`${userDisplayName} - ${userEmail}`}>
        <div class="vtur-user-chip__avatar">{userInitials || 'VT'}</div>
        <div class="vtur-user-chip__copy">
          <span class="vtur-user-chip__name">{userDisplayName}</span>
          <span class="vtur-user-chip__email">{userEmail}</span>
        </div>
      </div>

      <button
        class="vtur-icon-button vtur-icon-button--danger"
        type="button"
        on:click={handleLogout}
        disabled={loggingOut}
        aria-label="Sair"
      >
        <LogOut size={18} />
      </button>
    </div>
  </div>
</header>
