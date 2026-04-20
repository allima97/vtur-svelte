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
    ChevronDown,
    CreditCard,
    FileSpreadsheet,
    FileText,
    Gift,
    LayoutDashboard,
    Map as MapIcon,
    MapPinned,
    Megaphone,
    Menu,
    MessageSquare,
    Package,
    Plane,
    RefreshCw,
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
  import { slide } from 'svelte/transition';

  type MenuItem = {
    name: string;
    href?: string;
    icon: typeof LayoutDashboard;
    disabled?: boolean;
    badge?: string;
  };

  type MenuSection = {
    title: string;
    items: MenuItem[];
    collapsible?: boolean;
  };

  $: currentPath = $page.url.pathname;
  $: currentUser = $auth.user;
  $: userDisplayName =
    currentUser?.user_metadata?.nome_completo ||
    currentUser?.user_metadata?.nome ||
    currentUser?.email?.split('@')[0] ||
    'Usuario';
  $: userEmail = currentUser?.email || 'Sem email';

  const menuSections: MenuSection[] = [
    {
      title: 'INFORMATIVOS',
      collapsible: false,
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
      title: 'OPERAÇÃO',
      collapsible: true,
      items: [
        { name: 'Vendas', href: '/vendas', icon: ShoppingCart },
        { name: 'Clientes', href: '/clientes', icon: Users },
        { name: 'Viagens', href: '/operacao/viagens', icon: Plane },
        { name: 'Orçamentos', href: '/orcamentos', icon: FileText },
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
      collapsible: true,
      items: [
        { name: 'Caixa', href: '/financeiro/caixa', icon: TrendingUp },
        { name: 'Conciliação', href: '/financeiro/conciliacao', icon: FileSpreadsheet },
        { name: 'Comissionamento', href: '/financeiro/comissoes', icon: Wallet },
        { name: 'Fechamento', href: '/comissoes/fechamento', icon: Wallet },
        { name: 'Ajustes Vendas', href: '/financeiro/ajustes-vendas', icon: Settings },
        { name: 'Formas de Pagto', href: '/financeiro/formas-pagamento', icon: CreditCard },
        { name: 'Regras', href: '/financeiro/regras', icon: Settings }
      ]
    },
    {
      title: 'RELATÓRIOS',
      collapsible: true,
      items: [
        { name: 'Vendas', href: '/relatorios/vendas', icon: FileSpreadsheet },
        { name: 'Por produto', href: '/relatorios/produtos', icon: Package },
        { name: 'Por cliente', href: '/relatorios/clientes', icon: Users },
        { name: 'Por destino', href: '/relatorios/destinos', icon: MapPinned },
        { name: 'Ranking', href: '/relatorios/ranking', icon: FileSpreadsheet }
      ]
    },
    {
      title: 'PARÂMETROS',
      collapsible: true,
      items: [
        { name: 'Parâmetros', href: '/parametros', icon: Settings },
        { name: 'Metas', href: '/parametros/metas', icon: TrendingUp },
        { name: 'Equipe', href: '/parametros/equipe', icon: Users },
        { name: 'Escalas', href: '/parametros/escalas', icon: Calendar },
        { name: 'Câmbios', href: '/parametros/cambios', icon: Banknote },
        { name: 'Tipo Pacotes', href: '/parametros/tipo-pacotes', icon: Package },
        { name: 'Tipo Produtos', href: '/parametros/tipo-produtos', icon: Package },
        { name: 'Orçamentos PDF', href: '/parametros/orcamentos', icon: FileText },
        { name: 'CRM', href: '/parametros/crm', icon: MessageSquare },
        { name: 'Avisos', href: '/parametros/avisos', icon: MessageSquare },
        { name: 'Empresa', href: '/parametros/empresa', icon: Building2 }
      ]
    },
    {
      title: 'PERFIL',
      collapsible: true,
      items: [
        { name: 'Meu Perfil', href: '/perfil', icon: UserCircle },
        { name: 'Minha Escala', href: '/perfil/escala', icon: Calendar },
        { name: 'Autenticação 2FA', href: '/perfil/mfa', icon: Shield },
        { name: 'Personalizar Menu', href: '/perfil/personalizar', icon: Settings },
        { name: 'Preferências', href: '/operacao/minhas-preferencias', icon: Star }
      ]
    }
  ];

  const adminItems: MenuItem[] = [
    { name: 'Administração', href: '/admin', icon: Shield },
    { name: 'Usuários', href: '/admin/usuarios', icon: Users },
    { name: 'Permissões', href: '/admin/permissoes', icon: Shield },
    { name: 'Tipos', href: '/admin/tipos-usuario', icon: Users },
    { name: 'Empresas', href: '/admin/empresas', icon: Building2 },
    { name: 'Financeiro', href: '/admin/financeiro', icon: Wallet },
    { name: 'Planos', href: '/admin/planos', icon: CreditCard },
    { name: 'Aniversariantes', href: '/admin/aniversariantes', icon: Gift },
    { name: 'Avisos', href: '/admin/avisos', icon: FileText },
    { name: 'E-mail', href: '/admin/email', icon: Settings },
    { name: 'CRM', href: '/admin/crm', icon: MessageSquare },
    { name: 'Módulos', href: '/admin/modulos-sistema', icon: Settings },
    { name: 'Param. Importação', href: '/admin/parametros-importacao', icon: Settings }
  ];

  let collapsed: Record<number, boolean> = {};
  let refreshingPerms = false;

  function handleItemClick() {
    if ($isMobile) sidebar.close();
  }

  function isActive(href?: string): boolean {
    if (!href) return false;
    if (href === '/') return currentPath === '/';
    return currentPath.startsWith(href);
  }

  function toggleSection(idx: number) {
    collapsed[idx] = !collapsed[idx];
    collapsed = { ...collapsed };
  }

  // ── Mapa de rotas → (nome, ícone) para o bottom nav compacto ──
  type NavEntry = { name: string; href: string; icon: typeof LayoutDashboard };

  const mobileNavEntries: NavEntry[] = [
    { name: 'Dashboard',      href: '/',                       icon: LayoutDashboard },
    { name: 'Clientes',       href: '/clientes',               icon: Users },
    { name: 'Vendas',         href: '/vendas',                 icon: ShoppingCart },
    { name: 'Orçamentos',     href: '/orcamentos',             icon: FileText },
    { name: 'Roteiros',       href: '/orcamentos/roteiros',    icon: MapIcon },
    { name: 'Viagens',        href: '/operacao/viagens',       icon: Plane },
    { name: 'Vouchers',       href: '/operacao/vouchers',      icon: Ticket },
    { name: 'Tarefas',        href: '/operacao/tarefas',       icon: SquareCheckBig },
    { name: 'Agenda',         href: '/operacao/agenda',        icon: Calendar },
    { name: 'Acompanhamento', href: '/operacao/acompanhamento',icon: FileText },
    { name: 'SAC',            href: '/operacao/controle-sac',  icon: AlertCircle },
    { name: 'Campanhas',      href: '/operacao/campanhas',     icon: Megaphone },
    { name: 'Documentos',     href: '/operacao/documentos-viagens', icon: FileText },
    { name: 'Consultoria',    href: '/consultoria-online',     icon: Video },
    { name: 'Aniversariantes',href: '/aniversariantes',        icon: Gift },
    { name: 'Caixa',          href: '/financeiro/caixa',       icon: TrendingUp },
    { name: 'Conciliação',    href: '/financeiro/conciliacao', icon: FileSpreadsheet },
    { name: 'Comissões',      href: '/financeiro/comissoes',   icon: Wallet },
    { name: 'Fechamento',     href: '/comissoes/fechamento',   icon: Wallet },
    { name: 'Relatórios',     href: '/relatorios',             icon: FileSpreadsheet },
    { name: 'Parâmetros',     href: '/parametros',             icon: Settings },
    { name: 'Admin',          href: '/admin',                  icon: Shield },
    { name: 'Perfil',         href: '/perfil',                 icon: UserCircle },
  ];

  // Encontra a entrada mais específica que bate com a rota atual
  $: currentNavEntry = (() => {
    // Ordena por href mais longo primeiro (mais específico)
    const sorted = [...mobileNavEntries].sort((a, b) => b.href.length - a.href.length);
    if (currentPath === '/') return mobileNavEntries.find(e => e.href === '/') ?? mobileNavEntries[0];
    return sorted.find(e => e.href !== '/' && currentPath.startsWith(e.href)) ?? mobileNavEntries[0];
  })();

  async function handleRefreshPermissions() {
    try {
      refreshingPerms = true;
      const supabase = createSupabaseBrowserClient();
      await permissoes.refresh(supabase);
      toast.success('Permissões atualizadas.');
    } catch (error) {
      console.error('Erro ao atualizar permissoes:', error);
      toast.error('Não foi possível atualizar as permissões.');
    } finally {
      refreshingPerms = false;
    }
  }
</script>

<!-- ============================================================
     OVERLAY (mobile: fecha sidebar ao clicar fora)
     ============================================================ -->
{#if $isMobile && $sidebar.isOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="fixed inset-0 bg-black/50 z-[998]"
    role="button"
    tabindex="0"
    aria-label="Fechar menu"
    on:click={() => sidebar.close()}
    on:keypress={(e) => e.key === 'Enter' && sidebar.close()}
  ></div>
{/if}

<!-- ============================================================
     SIDEBAR
     Desktop: sempre visível, fixo à esquerda
     Mobile: drawer que desliza da esquerda quando aberto
     ============================================================ -->
{#if !$isMobile || $sidebar.isOpen}
  <aside
    class="vtur-sidebar"
    class:vtur-sidebar--mobile={$isMobile}
    class:vtur-sidebar--open={$isMobile && $sidebar.isOpen}
    aria-label="Menu principal do sistema"
    style={$isMobile ? 'position:fixed;z-index:999;' : ''}
  >
    <!-- Brand Header -->
    <div class="vtur-sidebar__header">
      <a href="/" class="vtur-sidebar__brand" on:click={handleItemClick}>
        <img src="/brand/vtur-symbol.svg" alt="VTUR" class="vtur-sidebar__brand-image" />
        <div class="vtur-sidebar__brand-copy">
          <span class="vtur-sidebar__brand-wordmark">VTUR</span>
          <span class="vtur-sidebar__brand-tagline">CRM para Franquias CVC</span>
        </div>
      </a>
    </div>

    <!-- Body com nav -->
    <div class="vtur-sidebar__body scrollbar-dark">
      {#each menuSections as section, idx}
        <section class="vtur-sidebar__section">
          {#if section.collapsible}
            <button
              type="button"
              class="vtur-sidebar__section-toggle"
              on:click={() => toggleSection(idx)}
              aria-expanded={!collapsed[idx]}
            >
              <span class="vtur-sidebar__section-title">{section.title}</span>
              <ChevronDown
                size={12}
                class="transition-transform duration-200 {collapsed[idx] ? '' : 'rotate-180'}"
              />
            </button>
          {:else}
            <h2 class="vtur-sidebar__section-title px-1">{section.title}</h2>
          {/if}

          {#if !section.collapsible || !collapsed[idx]}
            <nav class="vtur-sidebar__nav" aria-label={section.title} transition:slide={{ duration: 180 }}>
              {#each section.items as item}
                {#if item.disabled}
                  <div class="vtur-sidebar__item vtur-sidebar__item--disabled" aria-disabled="true">
                    <div class="vtur-sidebar__item-main">
                      <svelte:component this={item.icon} size={17} class="vtur-sidebar__item-icon" />
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
                      <svelte:component
                        this={item.icon}
                        size={17}
                        class="vtur-sidebar__item-icon {isActive(item.href) ? 'text-blue-600' : ''}"
                      />
                      <span class="vtur-sidebar__item-label">{item.name}</span>
                    </div>
                    {#if item.badge}
                      <span class="vtur-sidebar__badge">{item.badge}</span>
                    {/if}
                  </a>
                {/if}
              {/each}
            </nav>
          {/if}
        </section>
      {/each}

      {#if $permissoes.isSystemAdmin || $permissoes.isMaster || $permissoes.permissoes.admin || $permissoes.permissoes.admin_users}
        <section class="vtur-sidebar__section">
          <h2 class="vtur-sidebar__section-title px-1">ADMIN</h2>
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
                  <svelte:component this={item.icon} size={17} class="vtur-sidebar__item-icon {isActive(item.href) ? 'text-blue-600' : ''}" />
                  <span class="vtur-sidebar__item-label">{item.name}</span>
                </div>
              </a>
            {/each}
          </nav>
        </section>
      {/if}
    </div>

    <!-- Footer -->
    <div class="vtur-sidebar__footer">
      <div class="vtur-sidebar__quick-actions">
        <a href="/operacao/agenda" class="vtur-sidebar__quick-link" on:click={handleItemClick}>
          <Calendar size={15} />
          <span>Agenda</span>
        </a>
        <button
          type="button"
          class="vtur-sidebar__quick-link"
          on:click={handleRefreshPermissions}
          disabled={refreshingPerms}
          aria-label="Atualizar permissões"
        >
          <RefreshCw size={15} class={refreshingPerms ? 'animate-spin' : ''} />
          <span>{refreshingPerms ? 'Atualizando...' : 'Atualizar permissões'}</span>
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
{/if}

<!-- ============================================================
     BOTTOM NAV — só renderiza no mobile
     ============================================================ -->
{#if $isMobile}
  <!--
    BOTTOM NAV COMPACTO — padrão vtur-app:
    3 colunas: [Menu] [Página atual com ícone + nome grande] [Spacer]
  -->
  <nav
    class="vtur-mobile-nav"
    aria-label="Navegação principal"
  >
    <!-- Coluna 1: Hamburguer / Menu -->
    <button
      type="button"
      class="vtur-mobile-nav__menu flex flex-col items-center justify-center gap-1 rounded-xl border-0 bg-transparent px-2 py-2 transition-colors"
      class:vtur-mobile-nav__menu--open={$sidebar.isOpen}
      on:click={() => sidebar.toggle()}
      aria-label="Abrir menu"
    >
      <Menu size={24} />
      <span class="text-[10px] font-medium leading-none">Menu</span>
    </button>

    <!-- Coluna 2: Módulo/Página atual — ícone + nome em destaque -->
    <a
      href={currentNavEntry.href}
      class="vtur-mobile-nav__current transition-colors"
      on:click={() => sidebar.close()}
      aria-label={currentNavEntry.name}
    >
      <svelte:component this={currentNavEntry.icon} size={24} />
      <span class="vtur-mobile-nav__label">{currentNavEntry.name}</span>
    </a>

    <!-- Coluna 3: Spacer invisível (simetria) -->
    <span aria-hidden="true"></span>
  </nav>
{/if}
