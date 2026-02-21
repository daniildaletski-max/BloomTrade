// ============================================================
// ROUTE: GET /api/assets
// ============================================================

import { Hono } from 'hono'
import type { Bindings } from '../lib/types'
import { ASSETS, getHistoricalData } from '../engine/market-data'

const route = new Hono<{ Bindings: Bindings }>()

route.get('/', (c) => {
  const categories: Record<string, Record<string, unknown>[]> = {}
  const assetsWithPrices: Record<string, Record<string, unknown>> = {}

  for (const [symbol, asset] of Object.entries(ASSETS)) {
    const data = getHistoricalData(asset, 30)
    const last = data[data.length - 1]
    const prev = data[data.length - 2]
    const change = last.close - prev.close
    const changePercent = (change / prev.close) * 100

    const enriched = {
      ...asset,
      currentPrice: last.close,
      change: +change.toFixed(4),
      changePercent: +changePercent.toFixed(2),
    }

    assetsWithPrices[symbol] = enriched

    if (!categories[asset.category]) categories[asset.category] = []
    categories[asset.category].push({ symbol, ...enriched })
  }

  c.header('Cache-Control', 'public, max-age=300')
  return c.json({ assets: assetsWithPrices, categories })
})

export default route
