/**
 * Resolve uma mensagem amigável a partir de diferentes formatos de erro.
 * Prioriza conteúdos explícitos do erro (message/error/details/reason),
 * inclusive variantes aninhadas em `data.*`, `response.*` e `response.data.*`
 * (incluindo `errors` e `cause`),
 * seguindo uma ordem do formato mais direto para os formatos aninhados,
 * e usa fallback normalizado quando nada útil é encontrado.
 */
export function toUserMessage(error: unknown, fallback = 'Erro inesperado.'): string {
  type ErrorRecord = {
    message?: unknown;
    error?: unknown;
    details?: unknown;
    reason?: unknown;
    cause?: unknown;
    data?: unknown;
    response?: unknown;
  };
  type ErrorRecordWithErrors = ErrorRecord & { errors?: unknown };

  const joinErrorList = (list: unknown[]) =>
    list
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          const record = item as ErrorRecord;
          return String(record.message || record.error || record.details || '').trim();
        }
        return String(item || '').trim();
      })
      .filter(Boolean)
      .join('; ');

  const readField = (
    obj: unknown,
    key: 'message' | 'error' | 'details' | 'reason'
  ) => {
    if (!obj || typeof obj !== 'object' || !(key in obj)) return '';
    return String((obj as ErrorRecord)[key] || '').trim();
  };
  const readCauseMessage = (obj: unknown) => {
    if (!obj || typeof obj !== 'object' || !('cause' in obj)) return '';
    const cause = (obj as ErrorRecord).cause;
    if (typeof cause === 'string') return cause.trim();
    if (cause && typeof cause === 'object' && 'message' in cause) {
      return String((cause as { message?: unknown }).message || '').trim();
    }
    return '';
  };
  const readPrimaryMessage = (obj: unknown) =>
    readField(obj, 'message') ||
    readField(obj, 'error') ||
    readField(obj, 'details') ||
    readField(obj, 'reason');

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
    const joined = joinErrorList(error);
    if (joined) return joined;
  }

  if (typeof error === 'string') {
    const message = error.trim();
    if (message) return message;
  }

  if (error instanceof Error) {
    const message = String(error.message || '').trim();
    if (message) return message;

    const errorCause = readCauseMessage(error);
    if (errorCause) return errorCause;
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
    const data = (error as ErrorRecord).data;
    const dataPrimary = readPrimaryMessage(data);
    if (dataPrimary) return dataPrimary;
    if (data && typeof data === 'object' && 'errors' in data) {
      const errorsValue = (data as ErrorRecordWithErrors).errors;
      if (Array.isArray(errorsValue)) {
        const joined = joinErrorList(errorsValue);
        if (joined) return joined;
      } else if (typeof errorsValue === 'string') {
        const message = errorsValue.trim();
        if (message) return message;
      }
    }
    const dataCause = readCauseMessage(data);
    if (dataCause) return dataCause;
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as ErrorRecord).response;
    const responsePrimary = readPrimaryMessage(response);
    if (responsePrimary) return responsePrimary;

    if (response && typeof response === 'object' && 'data' in response) {
      const data = (response as ErrorRecord).data;
      const responseDataPrimary = readPrimaryMessage(data);
      if (responseDataPrimary) return responseDataPrimary;
      if (data && typeof data === 'object' && 'errors' in data) {
        const errorsValue = (data as ErrorRecordWithErrors).errors;
        if (Array.isArray(errorsValue)) {
          const joined = joinErrorList(errorsValue);
          if (joined) return joined;
        } else if (typeof errorsValue === 'string') {
          const message = errorsValue.trim();
          if (message) return message;
        }
      }
      const responseCause = readCauseMessage(data);
      if (responseCause) return responseCause;
    }
  }

  return safeFallback;
}
