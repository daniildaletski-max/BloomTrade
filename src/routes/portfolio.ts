// ============================================================
// ROUTE: POST /api/portfolio/optimize
// ============================================================

import { Hono } from 'hono'
import type { Bindings } from '../lib/types'
import { safeReadJson, normalizeSymbols, parseRiskTolerance } from '../lib/utils'
import { ASSETS } from '../engine/market-data'
import { optimizePortfolio } from '../engine/portfolio'

const route = new Hono<{ Bindings: Bindings }>()

route.post('/optimize', async (c) => {
  const body = await safeReadJson(c)
  if (!body) return c.json({ error: 'Invalid JSON payload', code: 'INVALID_JSON' }, 400)

  const symbols = normalizeSymbols(body.symbols, ASSETS, 2)
  if (!symbols) return c.json({ error: 'Provide at least 2 valid asset symbols', code: 'INVALID_SYMBOLS' }, 400)

  const riskTolerance = parseRiskTolerance(body.riskTolerance)
  const result = optimizePortfolio(symbols, riskTolerance)
  return c.json(result)
})

export default route
