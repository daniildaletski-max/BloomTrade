// ============================================================
// ROUTE: GET /api/health
// Health check endpoint for monitoring
// ============================================================

import { Hono } from 'hono'
import type { Bindings } from '../lib/types'
import { APP_VERSION } from '../lib/constants'
import { getCacheSize } from '../engine/market-data'

const route = new Hono<{ Bindings: Bindings }>()

const startTime = Date.now()

route.get('/', (c) => {
  const apiKey = c.env?.OPENAI_API_KEY || (typeof process !== 'undefined' ? process.env?.OPENAI_API_KEY : '')
  const baseUrl = c.env?.OPENAI_BASE_URL || (typeof process !== 'undefined' ? process.env?.OPENAI_BASE_URL : '')

  return c.json({
    status: 'ok',
    version: APP_VERSION,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    cacheSize: getCacheSize(),
    aiConfigured: !!(apiKey && baseUrl),
    timestamp: new Date().toISOString(),
  })
})

export default route
