// ============================================================
// ROUTE: POST /api/compare
// ============================================================

import { Hono } from 'hono'
import type { Bindings } from '../lib/types'
import { DEFAULT_MARKET_DAYS } from '../lib/constants'
import { safeReadJson, normalizeSymbols } from '../lib/utils'
import { ASSETS, getHistoricalData } from '../engine/market-data'
import { monteCarloSimulation, calculateCompositeScore } from '../engine/predictions'

const route = new Hono<{ Bindings: Bindings }>()

route.post('/', async (c) => {
  const body = await safeReadJson(c)
  if (!body) return c.json({ error: 'Invalid JSON payload', code: 'INVALID_JSON' }, 400)

  const symbols = normalizeSymbols(body.symbols, ASSETS, 2)
  if (!symbols) return c.json({ error: 'Provide at least 2 valid symbols', code: 'INVALID_SYMBOLS' }, 400)

  const comparisons = symbols
    .map((sym: string) => {
      const asset = ASSETS[sym.toUpperCase()]
      if (!asset) return null
      const data = getHistoricalData(asset, DEFAULT_MARKET_DAYS)
      const composite = calculateCompositeScore(data, asset)
      const mc = monteCarloSimulation(data, 30, 200)
      return {
        symbol: sym.toUpperCase(),
        name: asset.name,
        category: asset.category,
        currentPrice: data[data.length - 1].close,
        compositeScore: composite,
        monteCarlo: mc.statistics,
      }
    })
    .filter(Boolean)

  return c.json({ comparisons })
})

export default route
