import { checkRateLimit } from '$lib/server/rateLimit';
import { getAdminClient, logServerError } from '$lib/server/v1';

type RateLimitOptions = {
  max: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

let lastUnavailableLogAt = 0;

function shouldLogUnavailable() {
  const now = Date.now();
  if (now - lastUnavailableLogAt < 60_000) return false;
  lastUnavailableLogAt = now;
  return true;
}

export async function checkPersistentRateLimit(
  scope: string,
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const fallback = checkRateLimit(`${scope}:${key}`, options);
  if (!fallback.allowed) return fallback;

  try {
    const client = getAdminClient();
    const { data, error } = await client.rpc('check_security_rate_limit', {
      p_scope: scope,
      p_key: key,
      p_max: options.max,
      p_window_seconds: Math.max(1, Math.ceil(options.windowMs / 1000))
    });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return fallback;

    return {
      allowed: Boolean(row.allowed),
      retryAfterSeconds: Math.max(0, Number(row.retry_after_seconds || 0))
    };
  } catch (err) {
    if (shouldLogUnavailable()) {
      logServerError('[persistent-rate-limit] usando fallback em memoria', err, { scope });
    }
    return fallback;
  }
}
