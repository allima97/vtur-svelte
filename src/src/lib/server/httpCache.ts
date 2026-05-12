export const DYNAMIC_READ_HEADERS = {
  "Cache-Control": "private, max-age=5, stale-while-revalidate=20",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
} as const;

export const SHORT_DYNAMIC_READ_HEADERS = {
  "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
} as const;

export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
} as const;
