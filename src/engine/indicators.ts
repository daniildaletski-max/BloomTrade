// ============================================================
// TECHNICAL INDICATORS ENGINE
// Optimized with rolling-window algorithms where applicable
// ============================================================

import type { Candle, MACDResult, BollingerResult, StochasticResult, FibonacciResult } from '../lib/types'

/**
 * Simple Moving Average - Rolling window O(n) implementation.
 */
export function calculateSMA(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  let windowSum = 0

  for (let i = 0; i < closes.length; i++) {
    windowSum += closes[i]

    if (i >= period) {
      windowSum -= closes[i - period]
    }

    if (i < period - 1) {
      result.push(null)
    } else {
      result.push(+(windowSum / period).toFixed(4))
    }
  }
  return result
}

/**
 * Exponential Moving Average.
 */
export function calculateEMA(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  const multiplier = 2 / (period + 1)
  let ema: number | null = null

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      result.push(null)
      continue
    }
    if (ema === null) {
      ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period
    } else {
      ema = (closes[i] - ema) * multiplier + ema
    }
    result.push(+ema.toFixed(4))
  }
  return result
}

/**
 * Relative Strength Index - Wilder's smoothing (running average) for O(n).
 */
export function calculateRSI(closes: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [null]

  if (closes.length < period + 1) {
    return closes.map(() => null)
  }

  // Calculate initial average gain/loss from first `period` changes
  let avgGain = 0
  let avgLoss = 0
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1]
    if (change > 0) avgGain += change
    else avgLoss += -change
  }
  avgGain /= period
  avgLoss /= period

  // Fill nulls for the warm-up period
  for (let i = 1; i < period; i++) {
    result.push(null)
  }

  // First RSI value
  if (avgLoss === 0) {
    result.push(100)
  } else {
    const rs = avgGain / avgLoss
    result.push(+(100 - 100 / (1 + rs)).toFixed(2))
  }

  // Subsequent RSI values using Wilder's smoothing
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1]
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? -change : 0

    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period

    if (avgLoss === 0) {
      result.push(100)
    } else {
      const rs = avgGain / avgLoss
      result.push(+(100 - 100 / (1 + rs)).toFixed(2))
    }
  }

  return result
}

/**
 * MACD (Moving Average Convergence Divergence).
 */
export function calculateMACD(closes: number[]): MACDResult {
  const ema12 = calculateEMA(closes, 12)
  const ema26 = calculateEMA(closes, 26)

  const macdLine: (number | null)[] = []
  const validMacd: number[] = []

  for (let i = 0; i < closes.length; i++) {
    if (ema12[i] !== null && ema26[i] !== null) {
      const val = ema12[i]! - ema26[i]!
      macdLine.push(+val.toFixed(4))
      validMacd.push(val)
    } else {
      macdLine.push(null)
    }
  }

  const signalPeriod = 9
  const signal: (number | null)[] = []
  const histogram: (number | null)[] = []
  let ema: number | null = null
  let validCount = 0

  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] === null) {
      signal.push(null)
      histogram.push(null)
      continue
    }
    validCount++
    if (validCount < signalPeriod) {
      signal.push(null)
      histogram.push(null)
      continue
    }
    if (ema === null) {
      ema = validMacd.slice(0, signalPeriod).reduce((a, b) => a + b, 0) / signalPeriod
    } else {
      const mult = 2 / (signalPeriod + 1)
      ema = (macdLine[i]! - ema) * mult + ema
    }
    signal.push(+ema.toFixed(4))
    histogram.push(+(macdLine[i]! - ema).toFixed(4))
  }

  return { macdLine, signal, histogram }
}

/**
 * Bollinger Bands.
 */
export function calculateBollingerBands(closes: number[], period: number = 20, stdDev: number = 2): BollingerResult {
  const sma = calculateSMA(closes, period)
  const upper: (number | null)[] = []
  const lower: (number | null)[] = []

  for (let i = 0; i < closes.length; i++) {
    if (sma[i] === null) {
      upper.push(null)
      lower.push(null)
      continue
    }
    const slice = closes.slice(Math.max(0, i - period + 1), i + 1)
    const mean = sma[i]!
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / slice.length
    const std = Math.sqrt(variance)
    upper.push(+(mean + stdDev * std).toFixed(4))
    lower.push(+(mean - stdDev * std).toFixed(4))
  }

  return { middle: sma, upper, lower }
}

/**
 * Average True Range.
 */
export function calculateATR(data: Candle[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [null]
  const trs: number[] = []

  for (let i = 1; i < data.length; i++) {
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    )
    trs.push(tr)

    if (i < period) {
      result.push(null)
      continue
    }
    const atr = trs.slice(-period).reduce((a, b) => a + b, 0) / period
    result.push(+atr.toFixed(4))
  }
  return result
}

/**
 * Stochastic Oscillator.
 */
export function calculateStochastic(data: Candle[], period: number = 14): StochasticResult {
  const k: (number | null)[] = []
  const d: (number | null)[] = []
  const kValues: number[] = []

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      k.push(null)
      d.push(null)
      continue
    }
    const slice = data.slice(i - period + 1, i + 1)
    const highestHigh = Math.max(...slice.map((c) => c.high))
    const lowestLow = Math.min(...slice.map((c) => c.low))
    const kVal = highestHigh === lowestLow ? 50 : ((data[i].close - lowestLow) / (highestHigh - lowestLow)) * 100
    k.push(+kVal.toFixed(2))
    kValues.push(kVal)

    if (kValues.length >= 3) {
      const dVal = kValues.slice(-3).reduce((a, b) => a + b, 0) / 3
      d.push(+dVal.toFixed(2))
    } else {
      d.push(null)
    }
  }
  return { k, d }
}

/**
 * Fibonacci Retracement Levels from last 60 data points.
 */
export function calculateFibonacci(data: Candle[]): FibonacciResult {
  const closes = data.map((c) => c.close)
  const high = Math.max(...closes.slice(-60))
  const low = Math.min(...closes.slice(-60))
  const diff = high - low

  return {
    level0: +high.toFixed(4),
    level236: +(high - diff * 0.236).toFixed(4),
    level382: +(high - diff * 0.382).toFixed(4),
    level500: +(high - diff * 0.5).toFixed(4),
    level618: +(high - diff * 0.618).toFixed(4),
    level786: +(high - diff * 0.786).toFixed(4),
    level1: +low.toFixed(4),
  }
}
