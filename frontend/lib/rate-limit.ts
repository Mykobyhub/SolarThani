// Simple in-memory rate limiter — production should use Redis
interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

// Clean up expired windows every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.resetAt < now) store.delete(k);
  }
}, 300_000);

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count++;
  return { allowed: true, retryAfter: 0 };
}
