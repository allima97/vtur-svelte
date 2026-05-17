/**
 * Resolve uma mensagem amigável a partir de diferentes formatos de erro.
 * Prioriza conteúdos explícitos do erro (message/error/details/reason/data.message) e usa fallback normalizado quando nada útil é encontrado.
 */
export function toUserMessage(error: unknown, fallback = 'Erro inesperado.'): string {
  const safeFallback = String(fallback || 'Erro inesperado.').trim() || 'Erro inesperado.';

  if (
    typeof error === 'number' ||
    typeof error === 'boolean' ||
    typeof error === 'bigint' ||
    typeof error === 'symbol'
  ) {
    return String(error);
  }

  if (Array.isArray(error)) {
    const joined = error
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          const record = item as { message?: unknown; error?: unknown; details?: unknown };
          return String(record.message || record.error || record.details || '').trim();
        }
        return String(item || '').trim();
      })
      .filter(Boolean)
      .join('; ');
    if (joined) return joined;
  }

  if (typeof error === 'string') {
    const message = error.trim();
    if (message) return message;
  }

  if (error instanceof Error) {
    const message = String(error.message || '').trim();
    if (message) return message;

    const cause =
      typeof error === 'object' && error !== null && 'cause' in error
        ? (error as { cause?: unknown }).cause
        : undefined;
    if (typeof cause === 'string') {
      const causeMessage = cause.trim();
      if (causeMessage) return causeMessage;
    }
    if (cause && typeof cause === 'object' && 'message' in cause) {
      const causeMessage = String((cause as { message?: unknown }).message || '').trim();
      if (causeMessage) return causeMessage;
    }
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message || '').trim();
    if (message) return message;
  }

  if (error && typeof error === 'object' && 'error' in error) {
    const message = String((error as { error?: unknown }).error || '').trim();
    if (message) return message;
  }

  if (error && typeof error === 'object' && 'details' in error) {
    const message = String((error as { details?: unknown }).details || '').trim();
    if (message) return message;
  }

  if (error && typeof error === 'object' && 'reason' in error) {
    const message = String((error as { reason?: unknown }).reason || '').trim();
    if (message) return message;
  }

  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === 'object' && 'message' in data) {
      const message = String((data as { message?: unknown }).message || '').trim();
      if (message) return message;
    }
    if (data && typeof data === 'object' && 'error' in data) {
      const message = String((data as { error?: unknown }).error || '').trim();
      if (message) return message;
    }
  }

  return safeFallback;
}
