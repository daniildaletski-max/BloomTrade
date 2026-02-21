// ============================================================
// ROUTE: GET /api/scanner
// With 5-minute result cache for performance
// ============================================================

import { Hono } from 'hono'
import type { Bindings, ScannerItem } from '../lib/types'
import { DEFAULT_MARKET_DAYS, SCANNER_CACHE_TTL_MS } from '../lib/constants'
import { ASSETS, getHistoricalData } from '../engine/market-data'
import { monteCarloSimulation, calculateCompositeScore } from '../engine/predictions'

const route = new Hono<{ Bindings: Bindings }>()

// Scanner result cache
let scannerCache: { data: ScannerItem[]; timestamp: string; expiresAt: number } | null = null

route.get('/', (c) => {
  const now = Date.now()

  // Serve from cache if still fresh
  if (scannerCache && now < scannerCache.expiresAt) {
    c.header('Cache-Control', 'public, max-age=300')
    c.header('X-Cache', 'HIT')
    return c.json({ scanner: scannerCache.data, timestamp: scannerCache.timestamp })
  }

  const results: ScannerItem[] = []

  for (const [symbol, asset] of Object.entries(ASSETS)) {
    const data = getHistoricalData(asset, DEFAULT_MARKET_DAYS)
    const composite = calculateCompositeScore(data, asset)
    // Use 50 simulations for scanner (heuristic ranking, not user-facing)
    const mc = monteCarloSimulation(data, 30, 50)
    const last = data[data.length - 1]
    const prev = data[data.length - 2]

    results.push({
      symbol,
      name: asset.name,
      category: asset.category,
      price: last.close,
      change: +((last.close - prev.close) / prev.close * 100).toFixed(2),
      compositeScore: composite.score,
      recommendation: composite.recommendation,
      confidence: composite.confidence,
      expectedReturn: mc.statistics.expectedReturn,
      bullishProbability: mc.statistics.bullishProbability,
      volatility: mc.statistics.volatility,
    })
  }

  results.sort((a, b) => b.compositeScore - a.compositeScore)

  const timestamp = new Date().toISOString()
  scannerCache = { data: results, timestamp, expiresAt: now + SCANNER_CACHE_TTL_MS }

  c.header('Cache-Control', 'public, max-age=300')
  c.header('X-Cache', 'MISS')
  return c.json({ scanner: results, timestamp })
})

export default route
