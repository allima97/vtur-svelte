import { r as requireAuthenticatedUser, g as getAdminClient } from "../../../../../../chunks/v1.js";
const VERSION = 1;
function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function normalizeMenuPrefs(raw) {
  const fallback = { v: VERSION, hidden: [], order: {}, section: {} };
  if (!isPlainObject(raw)) return fallback;
  const v = raw.v === VERSION ? VERSION : VERSION;
  const hidden = Array.isArray(raw.hidden) ? raw.hidden.map(String).filter(Boolean) : [];
  const order = {};
  if (isPlainObject(raw.order)) {
    Object.entries(raw.order).forEach(([section2, value]) => {
      if (!section2) return;
      if (!Array.isArray(value)) return;
      const cleaned = value.map(String).filter(Boolean);
      if (cleaned.length > 0) order[section2] = cleaned;
    });
  }
  const section = {};
  const rawSection = raw?.section;
  if (isPlainObject(rawSection)) {
    Object.entries(rawSection).forEach(([itemKey, sectionKey]) => {
      const k = String(itemKey || "").trim();
      const v2 = String(sectionKey || "").trim();
      if (!k || !v2) return;
      section[k] = v2;
    });
  }
  return {
    v,
    hidden: Array.from(new Set(hidden)),
    order,
    section
  };
}
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
async function GET(event) {
  try {
    const user = await requireAuthenticatedUser(event);
    const client = getAdminClient();
    const { data, error } = await client.from("menu_prefs").select("prefs, updated_at").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    const prefs = normalizeMenuPrefs(data?.prefs);
    return new Response(JSON.stringify({ prefs, updated_at: data?.updated_at ?? null }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=60",
        Vary: "Cookie"
      }
    });
  } catch (err) {
    console.error("Erro menu/prefs GET", err);
    return new Response("Erro ao carregar preferencias do menu.", { status: 500 });
  }
}
async function POST(event) {
  try {
    const user = await requireAuthenticatedUser(event);
    const client = getAdminClient();
    const body = safeJsonParse(await event.request.text());
    const nextPrefs = normalizeMenuPrefs(body?.prefs);
    const payload = {
      user_id: user.id,
      prefs: nextPrefs,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const { error } = await client.from("menu_prefs").upsert(payload, {
      onConflict: "user_id"
    });
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Erro menu/prefs POST", err);
    return new Response("Erro ao salvar preferencias do menu.", { status: 500 });
  }
}
export {
  GET,
  POST
};
