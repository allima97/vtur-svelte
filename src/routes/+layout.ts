import { browser } from '$app/environment';
import { auth } from '$lib/stores/auth';
import { permissoes } from '$lib/stores/permissoes';
import { createSupabaseBrowserClient } from '$lib/db/supabase';
import type { Session } from '@supabase/supabase-js';

let authListenerInitialized = false;

export const load = async () => {
  if (browser) {
    const supabase = createSupabaseBrowserClient();

    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      auth.setAuth(session.user, session);
      await permissoes.init(supabase);
    } else {
      auth.setLoading(false);
      permissoes.reset();
    }

    if (!authListenerInitialized) {
      authListenerInitialized = true;

      supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session) {
          auth.setAuth(session.user, session);
          await permissoes.init(supabase);
          return;
        }

        if (event === 'SIGNED_OUT') {
          auth.clear();
          permissoes.reset();
        }
      });
    }
  }
  
  return {};
};
