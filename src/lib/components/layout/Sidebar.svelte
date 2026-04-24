<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { auth } from '$lib/stores/auth';
  import { createSupabaseBrowserClient } from '$lib/db/supabase';
  import { sidebar, isMobile, toast } from '$lib/stores/ui';
  import { permissoes } from '$lib/stores/permissoes';
  import { descobrirModulo } from '$lib/config/modulos';
  import {
    AlertCircle,
    Banknote,
    Building2,
    Calendar,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    FileSpreadsheet,
    FileText,
    Gift,
    LayoutDashboard,
    LogOut,
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
  import Button from '$lib/components/ui/Button.svelte';

  type MenuItem = {
    key?: string;
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

  type MenuPrefs = {
    hidden: string[];
  };

  let isMenuExpanded = false;
  let menuPrefsHidden: string[] = [];

  const MENU_PREFS_KEY = 'vtur:menu-prefs';
  const MENU_PREFS_UPDATED_EVENT = 'vtur:menu-prefs-updated';

  $: hiddenMenuSet = new Set(menuPrefsHidden);

  $: currentPath = $page.url.pathname;
  $: currentUser = $auth.user;
  $: dashboardHref = $permissoes.isSystemAdmin
    ? '/dashboard/admin'
    : $permissoes.isMaster
      ? '/dashboard/master'
      : $permissoes.isGestor
        ? '/dashboard/gestor'
        : '/dashboard/vendedor';
  $: userDisplayName =
    currentUser?.user_metadata?.nome_completo ||
    currentUser?.user_metadata?.nome ||
    currentUser?.email?.split('@')[0] ||
    'Usuario';
  $: userEmail = currentUser?.email || 'Sem email';

  $: menuSections = [
    {
      title: 'INFORMATIVOS',
      collapsible: false,
      items: [
        { key: 'dashboard', name: 'Dashboard', href: dashboardHref, icon: LayoutDashboard },
        { key: 'tarefas', name: 'Tarefas', href: '/operacao/tarefas', icon: SquareCheckBig },
        { key: 'agenda', name: 'Agenda', href: '/operacao/agenda', icon: Calendar },
        { key: 'acompanhamento', name: 'Acompanhamento', href: '/operacao/acompanhamento', icon: FileText },
        { key: 'recados', name: 'Recados', href: '/operacao/recados', icon: MessageSquare },
        { key: 'aniversariantes', name: 'Aniversariantes', href: '/aniversariantes', icon: Gift }
      ]
    },
    {
      title: 'OPERAÇÃO',
      collapsible: true,
      items: [
        { key: 'vendas', name: 'Vendas', href: '/vendas', icon: ShoppingCart },
        { key: 'clientes', name: 'Clientes', href: '/clientes', icon: Users },
        { key: 'viagens', name: 'Viagens', href: '/operacao/viagens', icon: Plane },
        { key: 'orcamentos', name: 'Orçamentos', href: '/orcamentos', icon: FileText },
        { key: 'roteiros', name: 'Roteiros', href: '/orcamentos/roteiros', icon: MapIcon },
        { key: 'vouchers', name: 'Vouchers', href: '/operacao/vouchers', icon: Ticket },
        { key: 'controle_sac', name: 'Controle SAC', href: '/operacao/controle-sac', icon: AlertCircle },
        { key: 'campanhas', name: 'Campanhas', href: '/operacao/campanhas', icon: Megaphone },
        { key: 'documentos', name: 'Documentos', href: '/operacao/documentos-viagens', icon: FileText },
        { key: 'consultoria_online', name: 'Consultoria Online', href: '/consultoria-online', icon: Video }
      ]
    },
    {
      title: 'FINANCEIRO',
      collapsible: true,
      items: [
        { key: 'caixa', name: 'Caixa', href: '/financeiro/caixa', icon: TrendingUp },
        { key: 'conciliacao', name: 'Conciliação', href: '/financeiro/conciliacao', icon: FileSpreadsheet },
        { key: 'comissoes', name: 'Comissionamento', href: '/financeiro/comissoes', icon: Wallet },
        { key: 'fechamento', name: 'Fechamento', href: '/comissoes/fechamento', icon: Wallet },
        { key: 'ajustes_vendas', name: 'Ajustes Vendas', href: '/financeiro/ajustes-vendas', icon: Settings },
        { key: 'formas_pagamento', name: 'Formas de Pagto', href: '/financeiro/formas-pagamento', icon: CreditCard },
        { key: 'regras', name: 'Regras', href: '/financeiro/regras', icon: Settings }
      ]
    },
    {
      title: 'RELATÓRIOS',
      collapsible: true,
      items: [
        { key: 'rel_vendas', name: 'Vendas', href: '/relatorios/vendas', icon: FileSpreadsheet },
        { key: 'rel_produtos', name: 'Por produto', href: '/relatorios/produtos', icon: Package },
        { key: 'rel_clientes', name: 'Por cliente', href: '/relatorios/clientes', icon: Users },
        { key: 'rel_destinos', name: 'Por destino', href: '/relatorios/destinos', icon: MapPinned },
        { key: 'rel_ranking', name: 'Ranking', href: '/relatorios/ranking', icon: FileSpreadsheet }
      ]
    },
    {
      title: 'PARÂMETROS',
      collapsible: true,
      items: [
        { key: 'parametros', name: 'Parâmetros', href: '/parametros', icon: Settings },
        { key: 'metas', name: 'Metas', href: '/parametros/metas', icon: TrendingUp },
        { key: 'equipe', name: 'Equipe', href: '/parametros/equipe', icon: Users },
        { key: 'escalas', name: 'Escalas', href: '/parametros/escalas', icon: Calendar },
        { key: 'cambios', name: 'Câmbios', href: '/parametros/cambios', icon: Banknote },
        { key: 'tipo_pacotes', name: 'Tipo Pacotes', href: '/parametros/tipo-pacotes', icon: Package },
        { key: 'tipo_produtos', name: 'Tipo Produtos', href: '/parametros/tipo-produtos', icon: Package },
        { key: 'orcamentos_pdf', name: 'Orçamentos PDF', href: '/parametros/orcamentos', icon: FileText },
        { key: 'crm', name: 'CRM', href: '/parametros/crm', icon: MessageSquare },
        { key: 'avisos', name: 'Avisos', href: '/parametros/avisos', icon: MessageSquare },
        { key: 'empresa', name: 'Empresa', href: '/parametros/empresa', icon: Building2 }
      ]
    },
    {
      title: 'PERFIL',
      collapsible: true,
      items: [
        { key: 'meu_perfil', name: 'Meu Perfil', href: '/perfil', icon: UserCircle },
        { key: 'minha_escala', name: 'Minha Escala', href: '/perfil/escala', icon: Calendar },
        { key: 'autenticacao_2fa', name: 'Autenticação 2FA', href: '/perfil/mfa', icon: Shield },
        { key: 'personalizar_menu', name: 'Personalizar Menu', href: '/perfil/personalizar', icon: Settings },
        { key: 'preferencias', name: 'Preferências', href: '/operacao/minhas-preferencias', icon: Star }
      ]
    }
  ] as MenuSection[];

  const masterItems: MenuItem[] = [
    { name: 'Master', href: '/master', icon: Shield },
    { name: 'Usuários', href: '/master/usuarios', icon: Users },
    { name: 'Permissões', href: '/master/permissoes', icon: Shield },
    { name: 'Empresas', href: '/master/empresas', icon: Building2 }
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

  function canAccessAdminArea() {
    return (
      $permissoes.isSystemAdmin ||
      $permissoes.papel === 'MASTER' ||
      Boolean($permissoes.acessos.admin) ||
      Boolean($permissoes.acessos.admin_users)
    );
  }

  function loadMenuPrefs() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(MENU_PREFS_KEY);
      if (!raw) {
        menuPrefsHidden = [];
        return;
      }
      const parsed = JSON.parse(raw) as MenuPrefs;
      menuPrefsHidden = Array.isArray(parsed?.hidden)
        ? parsed.hidden.filter((entry): entry is string => typeof entry === 'string')
        : [];
    } catch {
      menuPrefsHidden = [];
    }
  }

  function isHiddenByUserPreference(item: MenuItem) {
    if (!item.key) return false;
    return hiddenMenuSet.has(item.key);
  }

  function canSeeItem(item: MenuItem) {
    if (!item.href) return true;
    if (isHiddenByUserPreference(item)) return false;
    if (!$permissoes.ready) return true;

    if ($permissoes.isSystemAdmin) {
      if (item.href === '/') return true;
      if (item.href.startsWith('/dashboard/admin')) return true;
      if (item.href.startsWith('/admin')) return true;
      if (item.href.startsWith('/perfil')) return true;
      if (item.href.startsWith('/documentacao')) return true;
      return false;
    }

    // Perfil e autenticacao devem permanecer acessiveis mesmo sem modulo mapeado.
    if (item.href.startsWith('/perfil')) return true;

    // Rotas master seguem gate exclusivo do papel MASTER.
    if (item.href.startsWith('/master')) return $permissoes.isMaster;

    // Rotas de administracao seguem gate explicito da secao admin.
    if (item.href.startsWith('/admin')) return canAccessAdminArea();

    const modulo = descobrirModulo(item.href);
    if (!modulo) return true;

    return permissoes.can(modulo, 'view');
  }

  onMount(() => {
    loadMenuPrefs();

    const onStorage = (event: StorageEvent) => {
      if (event.key === MENU_PREFS_KEY) loadMenuPrefs();
    };
    const onPrefsUpdated = () => loadMenuPrefs();

    window.addEventListener('storage', onStorage);
    window.addEventListener(MENU_PREFS_UPDATED_EVENT, onPrefsUpdated);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(MENU_PREFS_UPDATED_EVENT, onPrefsUpdated);
    };
  });

  $: visibleMenuSections = menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canSeeItem(item)),
    }))
    .filter((section) => section.items.length > 0);

  $: visibleMasterItems = masterItems.filter((item) => canSeeItem(item));
  $: visibleAdminItems = adminItems.filter((item) => canSeeItem(item));

  function handleItemClick() {
    if ($isMobile) sidebar.close();
  }

  // Computa o href ativo considerando TODOS os itens do menu;
  // prefere o match mais específico (href mais longo) para evitar
  // duplo destaque quando uma rota pai e uma sub-rota são ambas itens do menu.
  $: allMenuItems = [
    ...menuSections.flatMap((s) => s.items),
    ...masterItems,
    ...adminItems,
  ].filter((item): item is MenuItem & { href: string } => Boolean(item.href));

  $: activeHref = (() => {
    const sorted = [...allMenuItems].sort(
      (a, b) => (b.href?.length || 0) - (a.href?.length || 0)
    );
    if (currentPath === '/') {
      return sorted.find((item) => item.href === '/')?.href ?? null;
    }
    const match = sorted.find(
      (item) => item.href !== '/' && currentPath.startsWith(item.href)
    );
    return match?.href ?? null;
  })();

  function isActive(href?: string): boolean {
    if (!href) return false;
    return href === activeHref;
  }

  function toggleSection(idx: number) {
    collapsed[idx] = !collapsed[idx];
    collapsed = { ...collapsed };
  }

  // ── Mapa de rotas → (nome, ícone) para o bottom nav compacto ──
  type NavEntry = { name: string; href: string; icon: typeof LayoutDashboard };

  let mobileNavEntries: NavEntry[] = [];

  $: mobileNavEntries = [
    { name: 'Dashboard',      href: dashboardHref,             icon: LayoutDashboard },
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
    $permissoes.isMaster
      ? { name: 'Master',     href: '/master',                 icon: Shield }
      : { name: 'Admin',      href: '/admin',                  icon: Shield },
    { name: 'Perfil',         href: '/perfil',                 icon: UserCircle },
  ];

  $: visibleMobileNavEntries = mobileNavEntries.filter((entry) =>
    canSeeItem({ name: entry.name, href: entry.href, icon: entry.icon })
  );

  // Encontra a entrada mais específica que bate com a rota atual
  $: currentNavEntry = (() => {
    // Ordena por href mais longo primeiro (mais específico)
    const candidates = visibleMobileNavEntries.length > 0 ? visibleMobileNavEntries : mobileNavEntries;
    const sorted = [...candidates].sort((a, b) => b.href.length - a.href.length);
    if (currentPath === '/') return candidates.find((entry) => entry.href === '/') ?? candidates[0];
    return sorted.find((entry) => entry.href !== '/' && currentPath.startsWith(entry.href))
      ?? candidates.find((entry) => entry.href === '/perfil')
      ?? candidates[0];
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

  async function handleLogout() {
    try {
      const response = await fetch('/auth/logout', { method: 'GET' });
      if (response.ok) {
        window.location.href = '/auth/login';
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast.error('Erro ao fazer logout.');
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
    class:vtur-sidebar--collapsed={!isMenuExpanded && !$isMobile}
    aria-label="Menu principal do sistema"
    style={$isMobile ? 'position:fixed;z-index:999;' : ''}
  >
    <!-- Toggle Button -->
    <div class="vtur-sidebar__toggle">
      <Button
        type="button"
        variant="unstyled"
        class_name="vtur-sidebar__toggle-button"
        on:click={() => (isMenuExpanded = !isMenuExpanded)}
        ariaLabel={isMenuExpanded ? 'Recolher menu' : 'Expandir menu'}
        title={isMenuExpanded ? 'Recolher menu' : 'Expandir menu'}
      >
        {#if isMenuExpanded}
          <ChevronLeft size={20} />
        {:else}
          <ChevronRight size={20} />
        {/if}
      </Button>
    </div>

    <!-- Body com nav -->
    <div class="vtur-sidebar__body scrollbar-dark">
      {#each visibleMenuSections as section, idx}
        <section class="vtur-sidebar__section">
          {#if section.collapsible}
            <Button
              type="button"
              variant="unstyled"
              class_name="vtur-sidebar__section-toggle !px-1 !py-0"
              on:click={() => toggleSection(idx)}
            >
              <span class="vtur-sidebar__section-title">{section.title}</span>
              <ChevronDown
                size={12}
                class="vtur-sidebar__section-toggle-icon transition-transform duration-200 {collapsed[idx] ? '' : 'rotate-180'}"
              />
            </Button>
          {:else}
            <h2 class="vtur-sidebar__section-title px-1">{section.title}</h2>
          {/if}

          {#if !section.collapsible || !collapsed[idx]}
            <nav class="vtur-sidebar__nav" aria-label={section.title} transition:slide={{ duration: 180 }}>
              {#each section.items as item}
                {#if item.disabled}
                  <div class="vtur-sidebar__item vtur-sidebar__item--disabled" aria-disabled="true" title={item.name}>
                    <div class="vtur-sidebar__item-main">
                      <svelte:component this={item.icon} size={22} class="vtur-sidebar__item-icon" />
                      <span class="vtur-sidebar__item-label">{item.name}</span>
                    </div>
                    {#if item.badge}
                      <span class="vtur-sidebar__badge">{item.badge}</span>
                    {/if}
                  </div>
                {:else if item.href}
                  <a
                    href={item.href}
                    title={item.name}
                    class="vtur-sidebar__item"
                    class:vtur-sidebar__item--active={isActive(item.href)}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    on:click={handleItemClick}
                  >
                    <div class="vtur-sidebar__item-main">
                      <svelte:component
                        this={item.icon}
                        size={22}
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

      {#if $permissoes.isMaster && visibleMasterItems.length > 0}
        <section class="vtur-sidebar__section">
          <h2 class="vtur-sidebar__section-title px-1">MASTER</h2>
          <nav class="vtur-sidebar__nav" aria-label="Master">
            {#each visibleMasterItems as item}
              <a
                href={item.href}
                title={item.name}
                class="vtur-sidebar__item"
                class:vtur-sidebar__item--active={isActive(item.href)}
                aria-current={isActive(item.href) ? 'page' : undefined}
                on:click={handleItemClick}
              >
                <div class="vtur-sidebar__item-main">
                  <svelte:component this={item.icon} size={22} class="vtur-sidebar__item-icon {isActive(item.href) ? 'text-blue-600' : ''}" />
                  <span class="vtur-sidebar__item-label">{item.name}</span>
                </div>
              </a>
            {/each}
          </nav>
        </section>
      {/if}

      {#if canAccessAdminArea() && visibleAdminItems.length > 0}
        <section class="vtur-sidebar__section">
          <h2 class="vtur-sidebar__section-title px-1">ADMIN</h2>
          <nav class="vtur-sidebar__nav" aria-label="Admin">
            {#each visibleAdminItems as item}
              <a
                href={item.href}
                title={item.name}
                class="vtur-sidebar__item"
                class:vtur-sidebar__item--active={isActive(item.href)}
                aria-current={isActive(item.href) ? 'page' : undefined}
                on:click={handleItemClick}
              >
                <div class="vtur-sidebar__item-main">
                  <svelte:component this={item.icon} size={22} class="vtur-sidebar__item-icon {isActive(item.href) ? 'text-blue-600' : ''}" />
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
        <Button
          type="button"
          variant="unstyled"
          class_name="vtur-sidebar__item"
          on:click={handleRefreshPermissions}
          disabled={refreshingPerms}
          ariaLabel="Atualizar permissões"
          title="Atualizar permissões"
        >
          <div class="vtur-sidebar__item-main">
            <RefreshCw size={22} class={`vtur-sidebar__item-icon ${refreshingPerms ? 'animate-spin' : ''}`} />
            <span class="vtur-sidebar__item-label">{refreshingPerms ? 'Atualizando...' : 'Atualizar permissões'}</span>
          </div>
        </Button>
        <Button
          type="button"
          variant="unstyled"
          class_name="vtur-sidebar__item"
          on:click={handleLogout}
          ariaLabel="Fazer logout"
          title="Sair"
        >
          <div class="vtur-sidebar__item-main">
            <LogOut size={22} class="vtur-sidebar__item-icon" />
            <span class="vtur-sidebar__item-label">Sair</span>
          </div>
        </Button>
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
    <Button
      type="button"
      variant="unstyled"
      class_name={`vtur-mobile-nav__menu flex flex-col items-center justify-center gap-1 rounded-xl border border-transparent px-2 py-2 text-slate-200 transition-all duration-200 hover:bg-white/10 hover:text-white ${$sidebar.isOpen ? 'vtur-mobile-nav__menu--open bg-white/12 text-white shadow-[0_10px_24px_rgba(15,23,42,0.28)]' : ''}`}
      on:click={() => sidebar.toggle()}
      ariaLabel="Abrir menu"
    >
      <Menu size={28} />
      <span class="text-xs font-medium leading-none">Menu</span>
    </Button>

    <!-- Coluna 2: Módulo/Página atual — ícone + nome em destaque -->
    <a
      href={currentNavEntry.href}
      class="vtur-mobile-nav__current transition-colors"
      on:click={() => sidebar.close()}
      aria-label={currentNavEntry.name}
    >
      <svelte:component this={currentNavEntry.icon} size={28} />
      <span class="vtur-mobile-nav__label">{currentNavEntry.name}</span>
    </a>

    <!-- Coluna 3: Spacer invisível (simetria) -->
    <span aria-hidden="true"></span>
  </nav>
{/if}
