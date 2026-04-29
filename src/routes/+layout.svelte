<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/db/supabase';
  import { auth, sessionSynced } from '$lib/stores/auth';
  import { toast } from '$lib/stores/ui';
  import type { LayoutData } from './$types';
  import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

  type RootLayoutData = LayoutData & {
    session?: Session | null;
    user?: User | null;
  };

  export let data: RootLayoutData;

  let isRedirecting = false;
  let lastRedirectAt = 0;
  let lastSessionAt = 0;
  let checkingSession = false;

  function isPublicRoute(path: string): boolean {
    return path.startsWith('/auth/') || path === '/negado';
  }

  function redirectToLogin(reason: string) {
    if (isRedirecting) return;
    const now = Date.now();
    // Evita redirecionamentos em menos de 8s (protege contra loops)
    if (now - lastRedirectAt < 8000) return;
    // Se uma sessão foi estabelecida nos últimos 5s, não redireciona
    if (now - lastSessionAt < 5000) return;

    if (browser && !isPublicRoute(window.location.pathname)) {
      isRedirecting = true;
      lastRedirectAt = now;
      console.warn(`[Auth] ${reason}. Redirecionando para login.`);
      toast.warning('Sua sessão expirou. Você será redirecionado para o login.', 6000);
      goto('/auth/login?session_expired=1', { replaceState: true });
    }
  }

  async function syncServerSession(
    session: { access_token: string; refresh_token: string } | null,
    source: string
  ) {
    if (!session) {
      sessionSynced.set(true);
      return;
    }

    try {
      const result = await fetch('/api/auth/set-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token
        })
      });

      if (!result.ok) {
        console.warn(`[Auth] Falha ao sincronizar sessão (${source}) status:`, result.status);
      }

      sessionSynced.set(true);
    } catch (syncErr) {
      console.warn(`[Auth] Erro ao sincronizar sessão (${source}):`, syncErr);
      sessionSynced.set(true);
    }
  }

  // Inicializa auth store com dados do servidor
  $: if (data.session) {
    auth.setAuth(data.user ?? data.session.user ?? null, data.session);
    sessionSynced.set(true);
  }

  onMount(() => {
    if (!browser) return;

    let cancelled = false;
    let unsubscribe = () => {};
    const hasServerSession = Boolean(data.session);

    (async () => {
      const {
        data: { subscription }
      } = supabase.auth.onAuthStateChange(
        async (event: AuthChangeEvent, session: Session | null) => {
          console.log('[AuthStateChange]', event, session ? 'com sessao' : 'sem sessao');
          if (
            (event === 'SIGNED_IN' ||
              event === 'TOKEN_REFRESHED' ||
              event === 'USER_UPDATED' ||
              event === 'PASSWORD_RECOVERY' ||
              event === 'MFA_CHALLENGE_VERIFIED') &&
            session
          ) {
            lastSessionAt = Date.now();
            isRedirecting = false; // cancela redirecionamento pendente
            auth.setAuth(session.user, session);
            await syncServerSession(session, event);
          } else if (event === 'SIGNED_OUT') {
            auth.clear();
            sessionSynced.set(true);
            // Aguarda um momento para verificar se realmente não há sessão
            // (pode ser uma race condition durante refresh automático)
            setTimeout(async () => {
              if (cancelled) return;
              const {
                data: { session: currentSession }
              } = await supabase.auth.getSession();
              if (!currentSession && get(auth).user) {
                redirectToLogin('Sessão encerrada pelo servidor (SIGNED_OUT)');
              }
            }, 500);
          }
        }
      );

      unsubscribe = () => subscription.unsubscribe();

      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      console.log('[Layout] Session no mount:', session ? 'existe' : 'nao existe');
      if (session) {
        lastSessionAt = Date.now();
        if (hasServerSession) {
          console.log('[Layout] Sessao SSR ja existe; pulando sincronizacao redundante no mount.');
          sessionSynced.set(true);
        } else {
          console.log('[Layout] Sincronizando session existente...');
          await syncServerSession(session, 'mount');
        }
      } else {
        sessionSynced.set(true);
        // Se o servidor tinha sessão mas o browser não, pode ser inconsistência
        if (hasServerSession && !isPublicRoute(window.location.pathname)) {
          redirectToLogin('Sessão inconsistente entre servidor e navegador');
        }
      }
    })();

    // Verifica sessão quando a aba volta ao primeiro plano
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible' || isRedirecting || checkingSession) return;
      checkingSession = true;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session && get(auth).user) {
          redirectToLogin('Sessão expirada enquanto a aba estava inativa');
        } else if (session) {
          lastSessionAt = Date.now();
          isRedirecting = false;
        }
      } finally {
        // Delay antes de permitir nova checagem para evitar lock contention
        setTimeout(() => {
          checkingSession = false;
        }, 2000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  });
</script>

<slot />
