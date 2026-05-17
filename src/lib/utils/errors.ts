/**
 * Resolve uma mensagem amigável a partir de diferentes formatos de erro.
 * Prioriza conteúdos explícitos do erro (message/error/details/reason/data.message/data.error/data.details/data.reason/data.cause/response.data.message/response.data.error) e usa fallback normalizado quando nada útil é encontrado.
 */
export function toUserMessage(error: unknown, fallback = 'Erro inesperado.'): string {
  const readField = (obj: unknown, key: 'message' | 'error' | 'details' | 'reason') => {
    if (!obj || typeof obj !== 'object' || !(key in obj)) return '';
    return String((obj as Record<string, unknown>)[key] || '').trim();
  };

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
    const message = readField(error, 'message');
    if (message) return message;
  }

  if (error && typeof error === 'object' && 'error' in error) {
    const message = readField(error, 'error');
    if (message) return message;
  }

  if (error && typeof error === 'object' && 'details' in error) {
    const message = readField(error, 'details');
    if (message) return message;
  }

  if (error && typeof error === 'object' && 'reason' in error) {
    const message = readField(error, 'reason');
    if (message) return message;
  }

  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: unknown }).data;
    const dataMessage = readField(data, 'message');
    if (dataMessage) return dataMessage;
    const dataError = readField(data, 'error');
    if (dataError) return dataError;
    const dataDetails = readField(data, 'details');
    if (dataDetails) return dataDetails;
    const dataReason = readField(data, 'reason');
    if (dataReason) return dataReason;
    if (data && typeof data === 'object' && 'cause' in data) {
      const cause = (data as { cause?: unknown }).cause;
      if (typeof cause === 'string') {
        const message = cause.trim();
        if (message) return message;
      }
      if (cause && typeof cause === 'object' && 'message' in cause) {
        const message = String((cause as { message?: unknown }).message || '').trim();
        if (message) return message;
      }
    }
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: unknown }).response;
    if (response && typeof response === 'object' && 'data' in response) {
      const data = (response as { data?: unknown }).data;
      const responseMessage = readField(data, 'message');
      if (responseMessage) return responseMessage;
      const responseError = readField(data, 'error');
      if (responseError) return responseError;
    }
  }

  return safeFallback;
}
