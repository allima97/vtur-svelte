import { json } from "@sveltejs/kit";
import { g as getAdminClient, r as requireAuthenticatedUser, a as resolveUserScope, e as ensureModuloAccess } from "../../../../../../chunks/v1.js";
const CACHE_TTL_MS = 9e5;
const CACHE_MAX_ENTRIES = 300;
const cache = /* @__PURE__ */ new Map();
function readCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.payload;
}
function writeCache(key, payload) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
}
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
function normalizeItems(input) {
  if (!Array.isArray(input)) return [];
  return input.map((raw) => {
    const widget = String(raw?.widget || "").trim();
    if (!widget) return null;
    const visivel = raw?.visivel;
    const settings = raw?.settings;
    return {
      widget,
      visivel: typeof visivel === "boolean" ? visivel : void 0,
      settings: settings === void 0 ? void 0 : settings
    };
  }).filter(Boolean);
}
async function GET(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["dashboard"], 1, "Sem acesso ao Dashboard.");
    }
    const cacheKey = ["v1", "dashWidgets", user.id].join("|");
    const cached = readCache(cacheKey);
    if (cached) {
      return json(cached, {
        headers: {
          "Cache-Control": "private, max-age=900",
          Vary: "Cookie"
        }
      });
    }
    const { data, error } = await client.from("dashboard_widgets").select("widget, ordem, visivel, settings").eq("usuario_id", user.id).order("ordem", { ascending: true });
    if (error) throw error;
    const payload = { items: data || [] };
    writeCache(cacheKey, payload);
    return json(payload, {
      headers: {
        "Cache-Control": "private, max-age=900",
        Vary: "Cookie"
      }
    });
  } catch (err) {
    console.error("Erro dashboard/widgets", err);
    return new Response("Erro ao carregar widgets.", { status: 500 });
  }
}
async function POST(event) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);
    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ["dashboard"], 1, "Sem acesso ao Dashboard.");
    }
    const rawBody = await event.request.text();
    const body = safeJsonParse(rawBody);
    const items = normalizeItems(body?.items);
    if (!items.length) {
      return new Response("items obrigatorio.", { status: 400 });
    }
    const rows = items.slice(0, 80).map((item, idx) => ({
      usuario_id: user.id,
      widget: item.widget,
      ordem: idx,
      visivel: item.visivel !== false,
      settings: item.settings ?? null
    }));
    const cacheKey = ["v1", "dashWidgets", user.id].join("|");
    await client.from("dashboard_widgets").delete().eq("usuario_id", user.id);
    try {
      const { error: insertError } = await client.from("dashboard_widgets").insert(rows);
      if (insertError) throw insertError;
    } catch (err) {
      const msg = String(err?.message || "");
      if (msg.toLowerCase().includes("settings")) {
        const payloadSemSettings = rows.map((row) => {
          const clone = { ...row };
          delete clone.settings;
          return clone;
        });
        const { error: retryError } = await client.from("dashboard_widgets").insert(payloadSemSettings);
        if (retryError) throw retryError;
      } else {
        throw err;
      }
    }
    cache.delete(cacheKey);
    return json({ ok: true });
  } catch (err) {
    console.error("Erro dashboard/widgets POST", err);
    return new Response("Erro ao salvar widgets.", { status: 500 });
  }
}
export {
  GET,
  POST
};
