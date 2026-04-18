<script lang="ts">
  import { page } from '$app/stores';
  import { auth } from '$lib/stores/auth';
  import { createSupabaseBrowserClient } from '$lib/db/supabase';
  import { sidebar, isMobile, toast } from '$lib/stores/ui';
  import { permissoes } from '$lib/stores/permissoes';
  import {
    AlertCircle,
    Banknote,
    Building2,
    Calendar,
    CreditCard,
    FileSpreadsheet,
    FileText,
    Gift,
    LayoutDashboard,
    Map as MapIcon,
    MapPinned,
    Megaphone,
    MessageSquare,
    Package,
    Plane,
    Settings,
    Shield,
    ShoppingCart,
    SquareCheckBig,
    Star,
    Ticket,
    TrendingUp,
    Users,
    UserCircle,
    Video,
    Wallet
  } from 'lucide-svelte';

  type MenuItem = {
    name: string;
    href?: string;
    icon: typeof LayoutDashboard;
    disabled?: boolean;
    badge?: string;
  };

  $: currentPath = $page.url.pathname;
  $: currentUser = $auth.user;
  $: userDisplayName =
    currentUser?.user_metadata?.nome_completo ||
    currentUser?.user_metadata?.nome ||
    currentUser?.email?.split('@')[0] ||
    'Usuario';
  $: userEmail = currentUser?.email || 'Sem email';

  const menuSections: Array<{ title: string; items: MenuItem[] }> = [
    {
      title: 'INFORMATIVOS',
      items: [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Tarefas', href: '/operacao/tarefas', icon: SquareCheckBig },
        { name: 'Agenda', href: '/operacao/agenda', icon: Calendar },
        { name: 'Acompanhamento', href: '/operacao/acompanhamento', icon: FileText },
        { name: 'Recados', href: '/operacao/recados', icon: MessageSquare },
        { name: 'Aniversariantes', href: '/aniversariantes', icon: Gift }
      ]
    },
    {
      title: 'OPERACAO',
      items: [
        { name: 'Vendas', href: '/vendas', icon: ShoppingCart },
        { name: 'Clientes', href: '/clientes', icon: Users },
        { name: 'Viagens', href: '/operacao/viagens', icon: Plane },
        { name: 'Orcamentos', href: '/orcamentos', icon: FileText },
        { name: 'Roteiros', href: '/orcamentos/roteiros', icon: MapIcon },
        { name: 'Vouchers', href: '/operacao/vouchers', icon: Ticket },
        { name: 'Controle SAC', href: '/operacao/controle-sac', icon: AlertCircle },
        { name: 'Campanhas', href: '/operacao/campanhas', icon: Megaphone },
        { name: 'Documentos', href: '/operacao/documentos-viagens', icon: FileText },
        { name: 'Consultoria Online', href: '/consultoria-online', icon: Video }
      ]
    },
    {
      title: 'FINANCEIRO',
      items: [
        { name: 'Caixa', href: '/financeiro/caixa', icon: TrendingUp },
        { name: 'Conciliacao', href: '/financeiro/conciliacao', icon: FileSpreadsheet },
        { name: 'Comissionamento', href: '/financeiro/comissoes', icon: Wallet },
        { name: 'Fechamento', href: '/comissoes/fechamento', icon: Wallet },
        { name: 'Ajustes Vendas', href: '/financeiro/ajustes-vendas', icon: Settings },
        { name: 'Formas de Pagto', href: '/financeiro/formas-pagamento', icon: CreditCard },
        { name: 'Regras', href: '/financeiro/regras', icon: Settings }
      ]
    },
    {
      title: 'RELATORIOS',
      items: [
        { name: 'Vendas', href: '/relatorios/vendas', icon: FileSpreadsheet },
        { name: 'Por produto', href: '/relatorios/produtos', icon: Package },
        { name: 'Por cliente', href: '/relatorios/clientes', icon: Users },
        { name: 'Por destino', href: '/relatorios/destinos', icon: MapPinned },
        { name: 'Ranking', href: '/relatorios/ranking', icon: FileSpreadsheet }
      ]
    },
    {
      title: 'PARAMETROS',
      items: [
        { name: 'Parametros', href: '/parametros', icon: Settings },
        { name: 'Metas', href: '/parametros/metas', icon: TrendingUp },
        { name: 'Equipe', href: '/parametros/equipe', icon: Users },
        { name: 'Escalas', href: '/parametros/escalas', icon: Calendar },
        { name: 'Cambios', href: '/parametros/cambios', icon: Banknote },
        { name: 'Tipo Pacotes', href: '/parametros/tipo-pacotes', icon: Package },
        { name: 'Tipo Produtos', href: '/parametros/tipo-produtos', icon: Package },
        { name: 'Orcamentos PDF', href: '/parametros/orcamentos', icon: FileText },
        { name: 'Avisos / CRM', href: '/parametros/avisos', icon: MessageSquare },
        { name: 'Empresa', href: '/parametros/empresa', icon: Building2 }
      ]
    },
    {
      title: 'PERFIL',
      items: [
        { name: 'Meu Perfil', href: '/perfil', icon: UserCircle },
        { name: 'Minha Escala', href: '/perfil/escala', icon: Calendar },
        { name: 'Autenticacao 2FA', href: '/perfil/mfa', icon: Shield },
        { name: 'Personalizar Menu', href: '/perfil/personalizar', icon: Settings },
        { name: 'Preferencias', href: '/operacao/minhas-preferencias', icon: Star }
      ]
    }
  ];

  const adminItems: MenuItem[] = [
    { name: 'Administracao', href: '/admin', icon: Shield },
    { name: 'Usuarios', href: '/admin/usuarios', icon: Users },
    { name: 'Permissoes', href: '/admin/permissoes', icon: Shield },
    { name: 'Tipos', href: '/admin/tipos-usuario', icon: Users },
    { name: 'Empresas', href: '/admin/empresas', icon: Building2 },
    { name: 'Financeiro', href: '/admin/financeiro', icon: Wallet },
    { name: 'Planos', href: '/admin/planos', icon: CreditCard },
    { name: 'Aniversariantes', href: '/admin/aniversariantes', icon: Gift },
    { name: 'Avisos', href: '/admin/avisos', icon: FileText },
    { name: 'E-mail', href: '/admin/email', icon: Settings },
    { name: 'CRM', href: '/admin/crm', icon: MessageSquare },
    { name: 'Modulos', href: '/admin/modulos-sistema', icon: Settings },
    { name: 'Param. Importacao', href: '/admin/parametros-importacao', icon: Settings }
  ];

  let refreshingPerms = false;

  function handleItemClick() {
    if ($isMobile) {
      sidebar.close();
    }
  }

  function isActive(href?: string): boolean {
    if (!href) return false;
    if (href === '/') return currentPath === '/';
    return currentPath.startsWith(href);
  }

  async function handleRefreshPermissions() {
    try {
      refreshingPerms = true;
      const supabase = createSupabaseBrowserClient();
      await permissoes.refresh(supabase);
      toast.success('Permissoes atualizadas.');
    } catch (error) {
      console.error('Erro ao atualizar permissoes:', error);
      toast.error('Nao foi possivel atualizar as permissoes.');
    } finally {
      refreshingPerms = false;
    }
  }
</script>

{#if $isMobile && $sidebar.isOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="vtur-sidebar-overlay"
    role="button"
    tabindex="0"
    aria-label="Fechar menu"
    on:click={() => sidebar.close()}
    on:keypress={(event) => event.key === 'Enter' && sidebar.close()}
  ></div>
{/if}

<aside
  class="vtur-sidebar"
  class:vtur-sidebar--open={$isMobile && $sidebar.isOpen}
  aria-label="Menu principal do sistema"
>
  <div class="vtur-sidebar__header">
    <a href="/" class="vtur-sidebar__brand" on:click={handleItemClick}>
      <img src="/brand/vtur-symbol.svg" alt="VTUR" class="vtur-sidebar__brand-image" />
      <div class="vtur-sidebar__brand-copy">
        <span class="vtur-sidebar__brand-wordmark">VTUR</span>
        <span class="vtur-sidebar__brand-tagline">CRM para Franquias CVC</span>
      </div>
    </a>
  </div>

  <div class="vtur-sidebar__body scrollbar-dark">
    {#each menuSections as section}
      <section class="vtur-sidebar__section">
        <h2 class="vtur-sidebar__section-title">{section.title}</h2>
        <nav class="vtur-sidebar__nav" aria-label={section.title}>
          {#each section.items as item}
            {#if item.disabled}
              <div class="vtur-sidebar__item vtur-sidebar__item--disabled" aria-disabled="true">
                <div class="vtur-sidebar__item-main">
                  <svelte:component this={item.icon} size={18} class="vtur-sidebar__item-icon" />
                  <span class="vtur-sidebar__item-label">{item.name}</span>
                </div>
                {#if item.badge}
                  <span class="vtur-sidebar__badge">{item.badge}</span>
                {/if}
              </div>
            {:else if item.href}
              <a
                href={item.href}
                class="vtur-sidebar__item"
                class:vtur-sidebar__item--active={isActive(item.href)}
                aria-current={isActive(item.href) ? 'page' : undefined}
                on:click={handleItemClick}
              >
                <div class="vtur-sidebar__item-main">
                  <svelte:component this={item.icon} size={18} class="vtur-sidebar__item-icon" />
                  <span class="vtur-sidebar__item-label">{item.name}</span>
                </div>
              </a>
            {/if}
          {/each}
        </nav>
      </section>
    {/each}

    {#if $permissoes.isSystemAdmin || $permissoes.isMaster || $permissoes.permissoes.admin || $permissoes.permissoes.admin_users}
      <section class="vtur-sidebar__section">
        <h2 class="vtur-sidebar__section-title">ADMIN</h2>
        <nav class="vtur-sidebar__nav" aria-label="Admin">
          {#each adminItems as item}
            <a
              href={item.href}
              class="vtur-sidebar__item"
              class:vtur-sidebar__item--active={isActive(item.href)}
              aria-current={isActive(item.href) ? 'page' : undefined}
              on:click={handleItemClick}
            >
              <div class="vtur-sidebar__item-main">
                <svelte:component this={item.icon} size={18} class="vtur-sidebar__item-icon" />
                <span class="vtur-sidebar__item-label">{item.name}</span>
              </div>
            </a>
          {/each}
        </nav>
      </section>
    {/if}
  </div>

  <div class="vtur-sidebar__footer">
    <div class="vtur-sidebar__quick-actions">
      <a href="/operacao/agenda" class="vtur-sidebar__quick-link" on:click={handleItemClick}>
        <Calendar size={16} />
        <span>Agenda</span>
      </a>
      <button
        type="button"
        class="vtur-sidebar__quick-link"
        on:click={handleRefreshPermissions}
        disabled={refreshingPerms}
      >
        <Settings size={16} />
        <span>{refreshingPerms ? 'Atualizando...' : 'Atualizar permissoes'}</span>
      </button>
    </div>

    <div class="vtur-sidebar__profile">
      <div class="vtur-sidebar__avatar">
        {userDisplayName.slice(0, 2).toUpperCase()}
      </div>
      <div class="vtur-sidebar__profile-copy">
        <p class="vtur-sidebar__profile-name">{userDisplayName}</p>
        <p class="vtur-sidebar__profile-meta">{userEmail}</p>
      </div>
    </div>
  </div>
</aside>
