export function toUserMessage(error: unknown, fallback: string): string {
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

  return fallback;
}
