<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { supabase } from '$lib/db/supabase';
  import { auth, sessionSynced } from '$lib/stores/auth';
  import type { LayoutData } from './$types';
  import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
  
  type RootLayoutData = LayoutData & {
    session?: Session | null;
    user?: User | null;
  };

  export let data: RootLayoutData;

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
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  });
</script>

<slot />
