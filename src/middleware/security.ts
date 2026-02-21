// ============================================================
// SECURITY MIDDLEWARE
// Rate limiting, secure headers, CORS configuration
// ============================================================

import type { Context, Next } from 'hono'
import type { Bindings, RateLimitEntry } from '../lib/types'
import { RATE_LIMIT_WINDOW_MS, RATE_LIMITS } from '../lib/constants'
import { logger } from '../lib/logger'

// ============================================================
// RATE LIMITER (in-memory sliding window)
// ============================================================

const rateLimitStore = new Map<string, RateLimitEntry>()

// Periodic cleanup of expired entries (every 5 minutes)
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

function getClientIP(c: Context<{ Bindings: Bindings }>): string {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

function getRateLimit(path: string): number {
  if (path.includes('/ai/')) return RATE_LIMITS.ai
  if (path.includes('/portfolio/')) return RATE_LIMITS.portfolio
  if (path.includes('/scanner')) return RATE_LIMITS.scanner
  return RATE_LIMITS.default
}

export async function rateLimitMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
  const ip = getClientIP(c)
  const path = c.req.path
  const limit = getRateLimit(path)
  const key = `${ip}:${path}`
  const now = Date.now()

  let entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS }
    rateLimitStore.set(key, entry)
  }

  entry.count++

  // Set rate limit headers
  c.header('X-RateLimit-Limit', String(limit))
  c.header('X-RateLimit-Remaining', String(Math.max(0, limit - entry.count)))
  c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)))

  if (entry.count > limit) {
    logger.warn('Rate limit exceeded', { ip, path, count: entry.count, limit })
    return c.json(
      { error: 'Too many requests. Please try again later.', code: 'RATE_LIMIT_EXCEEDED' },
      429
    )
  }

  await next()
}

// ============================================================
// SECURE HTTP HEADERS
// ============================================================

export async function secureHeadersMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
  await next()

  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('X-XSS-Protection', '1; mode=block')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
}

// ============================================================
// REQUEST LOGGING MIDDLEWARE
// ============================================================

export async function requestLoggingMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
  const start = Date.now()
  await next()
  const duration = Date.now() - start
  logger.request(c.req.method, c.req.path, c.res.status, duration)
}

// ============================================================
// CSP HEADERS (for HTML pages)
// ============================================================

export async function cspMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
  await next()

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join('; ')

  c.header('Content-Security-Policy', csp)
}
