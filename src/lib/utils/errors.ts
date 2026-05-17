/**
 * Resolve uma mensagem amigavel a partir de diferentes formatos de erro.
 * Prioriza conteúdos explícitos do erro (message/error/details/reason)
 * inclusive variantes aninhadas em `data.*`, `response.*` e `response.data.*`
 * (incluindo `errors`, `cause` e `error.error`, também em `response.errors`),
 * seguindo a ordem do formato mais direto para os formatos aninhados,
 * e usa um fallback normalizado quando nada útil é encontrado.
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

  const joinErrorList = (list: unknown[]) => {
    return list
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
  };
  const readErrorsValue = (value: unknown) => {
    if (Array.isArray(value)) return joinErrorList(value);
    if (typeof value === 'string') return value.trim();
    return '';
  };

  const readField = (obj: unknown, key: 'message' | 'error' | 'details' | 'reason') => {
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

  const safeFallback = String(fallback ?? 'Erro inesperado.').trim() || 'Erro inesperado.';

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

  if (
    error &&
    typeof error === 'object' &&
    'error' in error &&
    (error as { error?: unknown }).error instanceof Error
  ) {
    const nestedError = (error as { error: Error }).error;
    const nestedMessage = String(nestedError.message || '').trim();
    if (nestedMessage) return nestedMessage;
  }

  if (error && typeof error === 'object') {
    const topLevelMessage = readPrimaryMessage(error);
    if (topLevelMessage) return topLevelMessage;
  }

  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as ErrorRecord).data;
    const dataPrimary = readPrimaryMessage(data);
    if (dataPrimary) return dataPrimary;
    if (data && typeof data === 'object' && 'errors' in data) {
      const errorsValue = (data as ErrorRecordWithErrors).errors;
      const message = readErrorsValue(errorsValue);
      if (message) return message;
    }
    const dataCause = readCauseMessage(data);
    if (dataCause) return dataCause;
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as ErrorRecord).response;
    const responsePrimary = readPrimaryMessage(response);
    if (responsePrimary) return responsePrimary;
    if (response && typeof response === 'object' && 'errors' in response) {
      const errorsValue = (response as ErrorRecordWithErrors).errors;
      const message = readErrorsValue(errorsValue);
      if (message) return message;
    }

    if (response && typeof response === 'object' && 'data' in response) {
      const data = (response as ErrorRecord).data;
      const responseDataPrimary = readPrimaryMessage(data);
      if (responseDataPrimary) return responseDataPrimary;
      if (data && typeof data === 'object' && 'errors' in data) {
        const errorsValue = (data as ErrorRecordWithErrors).errors;
        const message = readErrorsValue(errorsValue);
        if (message) return message;
      }
      const responseCause = readCauseMessage(data);
      if (responseCause) return responseCause;
    }
  }

  return safeFallback;
}
