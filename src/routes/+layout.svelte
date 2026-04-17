<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { supabase } from '$lib/db/supabase';
  import { auth } from '$lib/stores/auth';
  import type { LayoutData } from './$types';
  
  export let data: LayoutData;
  
  // Inicializa auth store com dados do servidor
  $: if (data.session && data.user) {
    auth.setAuth(data.user, data.session);
  }
  
  onMount(async () => {
    if (browser) {
      // Escuta mudanças de autenticação
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[AuthStateChange]', event, session ? 'com sessao' : 'sem sessao');
        if (event === 'SIGNED_IN' && session) {
          auth.setAuth(session.user, session);
          // Sincroniza sessão com cookies do servidor
          console.log('[Auth] Sincronizando tokens para cookies...');
          let result = await fetch('/api/auth/set-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token: session.access_token,
              refresh_token: session.refresh_token
            })
          });
          const text = await result.clone().text();
          console.log('[Auth] Resultado sync:', result.ok, text);
          if (!result.ok) {
            console.error('[Auth] Falha ao sincronizar sessão com cookies no servidor');
          }
          // Simple retry on first failure to improve resilience
          if (!result.ok) {
            const retry = await fetch('/api/auth/set-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                access_token: session.access_token,
                refresh_token: session.refresh_token
              })
            })
            const retryText = await retry.clone().text();
            console.log('[Auth] Retry result:', retry.ok, retryText);
          }
        } else if (event === 'SIGNED_OUT') {
          auth.clear();
        }
      });
      
      // Também sincroniza cookies quando há session disponível
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[Layout] Session no mount:', session ? 'existe' : 'nao existe');
      if (session) {
        console.log('[Layout] Sincronizando session existente...');
        await fetch('/api/auth/set-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token
          })
        });
      }
      
      // Inicializa Dexie Cloud se configurado
      import('$lib/db/dexie').then(({ initDexieCloud }) => {
        initDexieCloud().catch(console.error);
      });
      
      return () => {
        subscription.unsubscribe();
      };
    }
  });
</script>

<slot />
