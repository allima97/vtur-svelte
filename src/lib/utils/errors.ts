export function toUserMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const message = String(error.message || '').trim();
    if (message) return message;
  }
  return fallback;
}

