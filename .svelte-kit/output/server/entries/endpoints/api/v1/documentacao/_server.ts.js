import { json } from "@sveltejs/kit";
import { r as requireAuthenticatedUser } from "../../../../../chunks/v1.js";
const GET = async ({ locals }) => {
  try {
    await requireAuthenticatedUser({ locals });
    const client = locals.supabase;
    try {
      const { data: sectionsData, error: sectionsError } = await client.from("system_documentation_sections").select("slug, title, content, order_index").order("order_index", { ascending: true });
      if (!sectionsError && sectionsData && sectionsData.length > 0) {
        return json(
          {
            sections: sectionsData,
            source: "sections"
          },
          {
            headers: {
              "Cache-Control": "no-store"
            }
          }
        );
      }
    } catch (err) {
      console.warn("[documentacao] Falha ao ler system_documentation_sections.", err);
    }
    try {
      const { data, error } = await client.from("system_documentation").select("slug, markdown, updated_at").order("updated_at", { ascending: false }).limit(10);
      if (!error && data && data.length > 0) {
        return json(
          {
            documents: data,
            source: "legacy"
          },
          {
            headers: {
              "Cache-Control": "no-store"
            }
          }
        );
      }
    } catch (err) {
      console.warn("[documentacao] Falha ao ler system_documentation.", err);
    }
    return json({ error: "Documentacao nao encontrada." }, { status: 404 });
  } catch (error) {
    return json({ error: `Erro interno: ${error?.message ?? error}` }, { status: 500 });
  }
};
export {
  GET
};
