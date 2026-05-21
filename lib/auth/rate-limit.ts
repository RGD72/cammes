const attempts = new Map<string, { count: number; windowStart: number }>()

const WINDOW_MS = 60_000
const MAX_ATTEMPTS = 5

export function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now - entry.windowStart > WINDOW_MS) return false
  return entry.count >= MAX_ATTEMPTS
}

export function recordFailure(ip: string): void {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attempts.set(ip, { count: 1, windowStart: now })
  } else {
    entry.count++
  }
}

export function resetOnSuccess(ip: string): void {
  attempts.delete(ip)
}
