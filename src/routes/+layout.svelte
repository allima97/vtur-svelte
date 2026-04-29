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

  function isPublicRoute(path: string): boolean {
    return path.startsWith('/auth/') || path === '/negado';
  }

  function redirectToLogin(reason: string) {
    if (isRedirecting) return;
    if (browser && !isPublicRoute(window.location.pathname)) {
      isRedirecting = true;
      console.warn(`[Auth] ${reason}. Redirecionando para login.`);
      toast.warning('Sua sessão expirou. Você será redirecionado para o login.', 6000);
      goto('/auth/login?session_expired=1');
    }
  }

  async function syncServerSession(session: { access_token: string; refresh_token: string } | null, source: string) {
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
  // Se o servidor já tem sessão (via cookie SSR), marca sessionSynced imediatamente
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
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
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
            auth.setAuth(session.user, session);
            await syncServerSession(session, event);
          } else if (event === 'SIGNED_OUT') {
            auth.clear();
            sessionSynced.set(true);
            redirectToLogin('Sessão encerrada pelo servidor (SIGNED_OUT)');
          }
        }
      );

      unsubscribe = () => subscription.unsubscribe();

      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      console.log('[Layout] Session no mount:', session ? 'existe' : 'nao existe');
      if (session) {
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
      if (document.visibilityState === 'visible' && !isRedirecting) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session && get(auth).user) {
          redirectToLogin('Sessão expirada enquanto a aba estava inativa');
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Heartbeat leve a cada 5 minutos
    const heartbeatInterval = setInterval(async () => {
      if (isRedirecting) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && get(auth).user) {
        redirectToLogin('Sessão expirada (heartbeat)');
      }
    }, 300_000); // 5 minutos

    return () => {
      cancelled = true;
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(heartbeatInterval);
    };
  });
</script>

<slot />
