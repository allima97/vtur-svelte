import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { NO_STORE_HEADERS } from '$lib/server/httpCache';
import { logServerError, requireAuthenticatedUser } from '$lib/server/v1';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    await requireAuthenticatedUser({ locals } as any);
    const client = locals.supabase;

    try {
      const { data: sectionsData, error: sectionsError } = await client
        .from("system_documentation_sections")
        .select("slug, title, content, order_index")
        .order("order_index", { ascending: true });

      if (!sectionsError && sectionsData && sectionsData.length > 0) {
        return json(
          {
            sections: sectionsData,
            source: "sections"
          },
          {
            headers: NO_STORE_HEADERS,
          }
        );
      }
    } catch (err) {
      logServerError("[documentacao] falha ao ler system_documentation_sections", err);
    }

    try {
      const { data, error } = await client
        .from("system_documentation")
        .select("slug, markdown, updated_at")
        .order("updated_at", { ascending: false })
        .limit(10);

      if (!error && data && data.length > 0) {
        return json(
          {
            documents: data,
            source: "legacy"
          },
          {
            headers: NO_STORE_HEADERS,
          }
        );
      }
    } catch (err) {
      logServerError("[documentacao] falha ao ler system_documentation", err);
    }

    return json({ error: "Documentacao nao encontrada." }, { status: 404, headers: NO_STORE_HEADERS });
  } catch (error: any) {
    logServerError("[documentacao] falha ao carregar documentação", error);
    return json({ error: "Erro interno ao carregar documentação." }, { status: 500, headers: NO_STORE_HEADERS });
  }
};
