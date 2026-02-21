// ============================================================
// ROUTE: GET /api/predict/:symbol
// ============================================================

import { Hono } from 'hono'
import type { Bindings } from '../lib/types'
import { DEFAULT_PREDICT_DAYS, MAX_FORECAST_DAYS, DEFAULT_MARKET_DAYS } from '../lib/constants'
import { parseClampedInt } from '../lib/utils'
import { ASSETS, getHistoricalData } from '../engine/market-data'
import {
  monteCarloSimulation,
  linearRegressionForecast,
  meanReversionPrediction,
  momentumPrediction,
  calculateCompositeScore,
} from '../engine/predictions'

const route = new Hono<{ Bindings: Bindings }>()

route.get('/:symbol', (c) => {
  const symbol = c.req.param('symbol').toUpperCase()
  const days = parseClampedInt(c.req.query('days'), DEFAULT_PREDICT_DAYS, 1, MAX_FORECAST_DAYS)
  const asset = ASSETS[symbol]
  if (!asset) return c.json({ error: 'Asset not found', code: 'ASSET_NOT_FOUND' }, 404)

  const data = getHistoricalData(asset, DEFAULT_MARKET_DAYS)

  return c.json({
    asset,
    currentPrice: data[data.length - 1].close,
    forecastDays: days,
    models: {
      monteCarlo: monteCarloSimulation(data, days),
      linearRegression: linearRegressionForecast(data, days),
      meanReversion: meanReversionPrediction(data, days),
      momentum: momentumPrediction(data, days),
    },
    compositeScore: calculateCompositeScore(data, asset),
  })
})

export default route
