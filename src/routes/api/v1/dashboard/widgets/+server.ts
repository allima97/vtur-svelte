import { json, type RequestEvent } from '@sveltejs/kit';
import { ensureModuloAccess, getAdminClient, requireAuthenticatedUser, resolveUserScope } from '$lib/server/v1';

type CacheEntry = {
  expiresAt: number;
  payload: unknown;
};

type WidgetInput = {
  widget: string;
  visivel?: boolean;
  settings?: unknown;
};

const CACHE_TTL_MS = 900_000;
const CACHE_MAX_ENTRIES = 300;
const cache = new Map<string, CacheEntry>();

function readCache(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.payload;
}

function writeCache(key: string, payload: unknown) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeItems(input: unknown): WidgetInput[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw) => {
      const widget = String((raw as any)?.widget || '').trim();
      if (!widget) return null;
      const visivel = (raw as any)?.visivel;
      const settings = (raw as any)?.settings;
      return {
        widget,
        visivel: typeof visivel === 'boolean' ? visivel : undefined,
        settings: settings === undefined ? undefined : settings
      } satisfies WidgetInput;
    })
    .filter(Boolean) as WidgetInput[];
}

export async function GET(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['dashboard'], 1, 'Sem acesso ao Dashboard.');
    }

    const cacheKey = ['v1', 'dashWidgets', user.id].join('|');
    const cached = readCache(cacheKey);
    if (cached) {
      return json(cached, {
        headers: {
          'Cache-Control': 'private, max-age=900',
          Vary: 'Cookie'
        }
      });
    }

    const { data, error } = await client
      .from('dashboard_widgets')
      .select('widget, ordem, visivel, settings')
      .eq('usuario_id', user.id)
      .order('ordem', { ascending: true });

    if (error) throw error;

    const payload = { items: data || [] };
    writeCache(cacheKey, payload);

    return json(payload, {
      headers: {
        'Cache-Control': 'private, max-age=900',
        Vary: 'Cookie'
      }
    });
  } catch (err) {
    console.error('Erro dashboard/widgets', err);
    return new Response('Erro ao carregar widgets.', { status: 500 });
  }
}

export async function POST(event: RequestEvent) {
  try {
    const client = getAdminClient();
    const user = await requireAuthenticatedUser(event);
    const scope = await resolveUserScope(client, user.id);

    if (!scope.isAdmin) {
      ensureModuloAccess(scope, ['dashboard'], 1, 'Sem acesso ao Dashboard.');
    }

    const rawBody = await event.request.text();
    const body = safeJsonParse(rawBody);
    const items = normalizeItems((body as any)?.items);

    if (!items.length) {
      return new Response('items obrigatorio.', { status: 400 });
    }

    const rows = items.slice(0, 80).map((item, idx) => ({
      usuario_id: user.id,
      widget: item.widget,
      ordem: idx,
      visivel: item.visivel !== false,
      settings: item.settings ?? null
    }));

    const cacheKey = ['v1', 'dashWidgets', user.id].join('|');

    await client.from('dashboard_widgets').delete().eq('usuario_id', user.id);

    try {
      const { error: insertError } = await client.from('dashboard_widgets').insert(rows);
      if (insertError) throw insertError;
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.toLowerCase().includes('settings')) {
        const payloadSemSettings = rows.map((row) => {
          const clone: any = { ...row };
          delete clone.settings;
          return clone;
        });
        const { error: retryError } = await client.from('dashboard_widgets').insert(payloadSemSettings);
        if (retryError) throw retryError;
      } else {
        throw err;
      }
    }

    cache.delete(cacheKey);

    return json({ ok: true });
  } catch (err) {
    console.error('Erro dashboard/widgets POST', err);
    return new Response('Erro ao salvar widgets.', { status: 500 });
  }
}
