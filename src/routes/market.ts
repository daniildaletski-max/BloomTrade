// ============================================================
// ROUTE: GET /api/market/:symbol
// ============================================================

import { Hono } from 'hono'
import type { Bindings } from '../lib/types'
import { DEFAULT_MARKET_DAYS, MAX_MARKET_DAYS } from '../lib/constants'
import { parseClampedInt } from '../lib/utils'
import { ASSETS, getHistoricalData } from '../engine/market-data'
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
  calculateStochastic,
  calculateFibonacci,
} from '../engine/indicators'

const route = new Hono<{ Bindings: Bindings }>()

route.get('/:symbol', (c) => {
  const symbol = c.req.param('symbol').toUpperCase()
  const days = parseClampedInt(c.req.query('days'), DEFAULT_MARKET_DAYS, 2, MAX_MARKET_DAYS)
  const asset = ASSETS[symbol]
  if (!asset) return c.json({ error: 'Asset not found', code: 'ASSET_NOT_FOUND' }, 404)

  const data = getHistoricalData(asset, days)
  const closes = data.map((d) => d.close)

  const indicators = {
    sma20: calculateSMA(closes, 20),
    sma50: calculateSMA(closes, 50),
    sma200: calculateSMA(closes, 200),
    ema12: calculateEMA(closes, 12),
    ema26: calculateEMA(closes, 26),
    rsi: calculateRSI(closes),
    macd: calculateMACD(closes),
    bollinger: calculateBollingerBands(closes),
    atr: calculateATR(data),
    stochastic: calculateStochastic(data),
    fibonacci: calculateFibonacci(data),
  }

  const last = data[data.length - 1]
  const prev = data[data.length - 2]
  const change = last.close - prev.close
  const changePercent = (change / prev.close) * 100

  c.header('Cache-Control', 'public, max-age=300')
  return c.json({
    asset,
    data,
    indicators,
    summary: {
      currentPrice: last.close,
      change: +change.toFixed(4),
      changePercent: +changePercent.toFixed(2),
      high52w: Math.max(...closes.slice(-252)),
      low52w: Math.min(...closes.slice(-252)),
      avgVolume: Math.round(
        data.slice(-Math.min(20, data.length)).reduce((sum, d) => sum + d.volume, 0) / Math.min(20, data.length)
      ),
    },
  })
})

export default route
