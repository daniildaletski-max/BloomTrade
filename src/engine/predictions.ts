// ============================================================
// PREDICTION ALGORITHMS ENGINE
// ============================================================

import type { Candle, AssetConfig, MonteCarloResult, LinearRegressionResult, MeanReversionResult, MomentumResult, CompositeScore } from '../lib/types'
import { seededRandom } from '../lib/utils'
import { DAY_MS } from '../lib/constants'
import { calculateRSI, calculateMACD, calculateStochastic } from './indicators'

/**
 * Monte Carlo Simulation - Generates probabilistic price paths
 * with percentile-based confidence intervals.
 */
export function monteCarloSimulation(data: Candle[], days: number = 30, simulations: number = 500): MonteCarloResult {
  const closes = data.map((d) => d.close)
  const returns: number[] = []
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]))
  }

  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length
  const stdReturn = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length)

  const lastPrice = closes[closes.length - 1]
  const allPaths: number[][] = []
  const seedBase = Math.floor(Date.now() / DAY_MS)

  for (let s = 0; s < simulations; s++) {
    const rand = seededRandom(seedBase + s * 7919)
    const path: number[] = [lastPrice]
    let price = lastPrice

    for (let d = 0; d < days; d++) {
      const u1 = rand()
      const u2 = rand()
      const z = Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001))) * Math.cos(2 * Math.PI * u2)
      const dailyReturn = meanReturn + stdReturn * z
      price = price * Math.exp(dailyReturn)
      path.push(+price.toFixed(4))
    }
    allPaths.push(path)
  }

  const predictions: MonteCarloResult['predictions'] = []
  for (let d = 0; d <= days; d++) {
    const prices = allPaths.map((p) => p[d]).sort((a, b) => a - b)
    predictions.push({
      day: d,
      p5: prices[Math.floor(simulations * 0.05)],
      p25: prices[Math.floor(simulations * 0.25)],
      median: prices[Math.floor(simulations * 0.5)],
      p75: prices[Math.floor(simulations * 0.75)],
      p95: prices[Math.floor(simulations * 0.95)],
      mean: +(prices.reduce((a, b) => a + b, 0) / simulations).toFixed(4),
    })
  }

  const finalPrices = allPaths.map((p) => p[days])
  const bullishCount = finalPrices.filter((p) => p > lastPrice).length

  return {
    predictions,
    statistics: {
      expectedReturn: +((predictions[days].mean / lastPrice - 1) * 100).toFixed(2),
      maxUpside: +((predictions[days].p95 / lastPrice - 1) * 100).toFixed(2),
      maxDownside: +((predictions[days].p5 / lastPrice - 1) * 100).toFixed(2),
      volatility: +(stdReturn * Math.sqrt(252) * 100).toFixed(2),
      bullishProbability: +((bullishCount / simulations) * 100).toFixed(1),
      sharpeRatio: stdReturn === 0 ? 0 : +((meanReturn * 252) / (stdReturn * Math.sqrt(252))).toFixed(3),
      simulations,
    },
  }
}

/**
 * Linear Regression Forecast with 95% confidence band.
 */
export function linearRegressionForecast(data: Candle[], days: number = 30): LinearRegressionResult {
  const closes = data.map((d) => d.close)
  const n = closes.length
  const x = Array.from({ length: n }, (_, i) => i)

  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = closes.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * closes[i], 0)
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  const residuals = closes.map((y, i) => y - (slope * i + intercept))
  const stdError = Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0) / (n - 2))

  const predictions: LinearRegressionResult['predictions'] = []
  for (let d = 0; d <= days; d++) {
    const idx = n + d
    const predicted = slope * idx + intercept
    predictions.push({
      day: d,
      predicted: +predicted.toFixed(4),
      upper: +(predicted + 1.96 * stdError).toFixed(4),
      lower: +(predicted - 1.96 * stdError).toFixed(4),
    })
  }

  const r2 = 1 - residuals.reduce((sum, r) => sum + r * r, 0) / closes.reduce((sum, y) => sum + Math.pow(y - sumY / n, 2), 0)

  return {
    predictions,
    slope: +slope.toFixed(6),
    intercept: +intercept.toFixed(4),
    rSquared: +r2.toFixed(4),
    trendDirection: slope > 0 ? 'Bullish' : 'Bearish',
    dailyChange: +slope.toFixed(4),
  }
}

/**
 * Mean Reversion Prediction - Price convergence toward SMA200.
 */
export function meanReversionPrediction(data: Candle[], days: number = 30): MeanReversionResult {
  const closes = data.map((d) => d.close)
  const sma200 = closes.slice(-200).reduce((a, b) => a + b, 0) / Math.min(200, closes.length)
  const sma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / Math.min(50, closes.length)
  const currentPrice = closes[closes.length - 1]

  const deviation = (currentPrice - sma200) / sma200
  const halfLife = 20
  const speed = Math.log(2) / halfLife

  const predictions: MeanReversionResult['predictions'] = []
  let price = currentPrice

  for (let d = 0; d <= days; d++) {
    const pullback = (sma200 - price) * speed
    price = price + pullback + sma200 * 0.0001
    predictions.push({
      day: d,
      predicted: +price.toFixed(4),
      meanLevel: +sma200.toFixed(4),
    })
  }

  return {
    predictions,
    currentDeviation: +(deviation * 100).toFixed(2),
    meanLevel: +sma200.toFixed(4),
    sma50: +sma50.toFixed(4),
    signal:
      Math.abs(deviation) > 0.1
        ? deviation > 0
          ? 'Overbought - Sell Signal'
          : 'Oversold - Buy Signal'
        : 'Neutral',
    deviationPercent: +(deviation * 100).toFixed(2),
  }
}

/**
 * Momentum Prediction - Composite of RSI, MACD, and Stochastic signals.
 */
export function momentumPrediction(data: Candle[], days: number = 30): MomentumResult {
  const closes = data.map((d) => d.close)
  const rsi = calculateRSI(closes)
  const macd = calculateMACD(closes)
  const stoch = calculateStochastic(data)

  const lastRSI = (rsi.filter((v) => v !== null).pop() as number) ?? 50
  const lastMACD = (macd.histogram.filter((v) => v !== null).pop() as number) ?? 0
  const lastStochK = (stoch.k.filter((v) => v !== null).pop() as number) ?? 50

  const rsiScore = lastRSI > 70 ? -1 : lastRSI < 30 ? 1 : (50 - lastRSI) / 50
  const macdScore = lastMACD > 0 ? 1 : -1
  const stochScore = lastStochK > 80 ? -1 : lastStochK < 20 ? 1 : (50 - lastStochK) / 50

  const momentumScore = rsiScore * 0.35 + macdScore * 0.35 + stochScore * 0.3
  const currentPrice = closes[closes.length - 1]

  const predictions: MomentumResult['predictions'] = []
  let price = currentPrice
  const volatility =
    data.length > 20
      ? Math.sqrt(
          closes.slice(-20).reduce((sum, c, i, arr) => (i > 0 ? sum + Math.pow(Math.log(c / arr[i - 1]), 2) : 0), 0) / 19
        )
      : 0.02

  for (let d = 0; d <= days; d++) {
    const decay = Math.exp(-d / 30)
    const change = momentumScore * volatility * decay * 0.5
    price = price * (1 + change)
    predictions.push({
      day: d,
      predicted: +price.toFixed(4),
    })
  }

  let signal: string
  if (momentumScore > 0.3) signal = 'Strong Buy'
  else if (momentumScore > 0.1) signal = 'Buy'
  else if (momentumScore > -0.1) signal = 'Hold'
  else if (momentumScore > -0.3) signal = 'Sell'
  else signal = 'Strong Sell'

  return {
    predictions,
    momentumScore: +momentumScore.toFixed(3),
    signal,
    indicators: {
      rsi: +lastRSI.toFixed(2),
      rsiSignal: lastRSI > 70 ? 'Overbought' : lastRSI < 30 ? 'Oversold' : 'Neutral',
      macdHistogram: +lastMACD.toFixed(4),
      macdSignal: lastMACD > 0 ? 'Bullish' : 'Bearish',
      stochasticK: +lastStochK.toFixed(2),
      stochasticSignal: lastStochK > 80 ? 'Overbought' : lastStochK < 20 ? 'Oversold' : 'Neutral',
    },
  }
}

/**
 * Composite AI Score combining all prediction models.
 * Each sub-model is wrapped in try/catch for graceful degradation.
 */
export function calculateCompositeScore(data: Candle[], asset: AssetConfig): CompositeScore {
  const scores: { weight: number; value: number }[] = []
  const breakdown = { monteCarlo: 50, regression: 50, meanReversion: 50, momentum: 50 }

  try {
    const mc = monteCarloSimulation(data, 30, 200)
    const mcScore = mc.statistics.bullishProbability / 100
    breakdown.monteCarlo = +(mcScore * 100).toFixed(1)
    scores.push({ weight: 0.3, value: mcScore })
  } catch {
    scores.push({ weight: 0.3, value: 0.5 })
  }

  try {
    const lr = linearRegressionForecast(data, 30)
    const lrScore = lr.trendDirection === 'Bullish' ? 0.5 + lr.rSquared * 0.5 : 0.5 - lr.rSquared * 0.5
    breakdown.regression = +(lrScore * 100).toFixed(1)
    scores.push({ weight: 0.25, value: lrScore })
  } catch {
    scores.push({ weight: 0.25, value: 0.5 })
  }

  try {
    const mr = meanReversionPrediction(data, 30)
    const mrScore = mr.currentDeviation > 10 ? 0.3 : mr.currentDeviation < -10 ? 0.7 : 0.5
    breakdown.meanReversion = +(mrScore * 100).toFixed(1)
    scores.push({ weight: 0.2, value: mrScore })
  } catch {
    scores.push({ weight: 0.2, value: 0.5 })
  }

  try {
    const mom = momentumPrediction(data, 30)
    const momScore = (mom.momentumScore + 1) / 2
    breakdown.momentum = +(momScore * 100).toFixed(1)
    scores.push({ weight: 0.25, value: momScore })
  } catch {
    scores.push({ weight: 0.25, value: 0.5 })
  }

  const composite = scores.reduce((sum, s) => sum + s.weight * s.value, 0)

  let recommendation: string
  let confidence: string
  if (composite > 0.7) {
    recommendation = 'STRONG BUY'
    confidence = 'High'
  } else if (composite > 0.55) {
    recommendation = 'BUY'
    confidence = 'Medium'
  } else if (composite > 0.45) {
    recommendation = 'HOLD'
    confidence = 'Low'
  } else if (composite > 0.3) {
    recommendation = 'SELL'
    confidence = 'Medium'
  } else {
    recommendation = 'STRONG SELL'
    confidence = 'High'
  }

  return {
    score: +(composite * 100).toFixed(1),
    recommendation,
    confidence,
    breakdown,
  }
}
