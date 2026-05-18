export const DYNAMIC_READ_HEADERS = {
  "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
} as const;

export const SHORT_DYNAMIC_READ_HEADERS = {
  "Cache-Control": "private, max-age=15, stale-while-revalidate=60",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
} as const;

export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
} as const;
