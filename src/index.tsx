import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  OPENAI_API_KEY: string
  OPENAI_BASE_URL: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())

app.onError((err, c) => {
  console.error('Unhandled API error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

// ============================================================
// MARKET DATA ENGINE - Realistic market data generation
// ============================================================

interface AssetConfig {
  name: string
  symbol: string
  category: string
  basePrice: number
  volatility: number
  trend: number
  beta: number
  dividendYield: number
  sector?: string
}

interface Candle {
  date: string
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

const ASSETS: Record<string, AssetConfig> = {
  // Stocks
  'AAPL': { name: 'Apple Inc.', symbol: 'AAPL', category: 'Stocks', basePrice: 198.5, volatility: 0.022, trend: 0.0003, beta: 1.2, dividendYield: 0.005, sector: 'Technology' },
  'MSFT': { name: 'Microsoft Corp.', symbol: 'MSFT', category: 'Stocks', basePrice: 415.8, volatility: 0.020, trend: 0.0004, beta: 1.1, dividendYield: 0.008, sector: 'Technology' },
  'GOOGL': { name: 'Alphabet Inc.', symbol: 'GOOGL', category: 'Stocks', basePrice: 175.2, volatility: 0.024, trend: 0.0003, beta: 1.15, dividendYield: 0.0, sector: 'Technology' },
  'AMZN': { name: 'Amazon.com', symbol: 'AMZN', category: 'Stocks', basePrice: 205.7, volatility: 0.026, trend: 0.0004, beta: 1.3, dividendYield: 0.0, sector: 'Technology' },
  'TSLA': { name: 'Tesla Inc.', symbol: 'TSLA', category: 'Stocks', basePrice: 245.3, volatility: 0.042, trend: 0.0002, beta: 1.8, dividendYield: 0.0, sector: 'Automotive' },
  'NVDA': { name: 'NVIDIA Corp.', symbol: 'NVDA', category: 'Stocks', basePrice: 875.4, volatility: 0.035, trend: 0.0006, beta: 1.6, dividendYield: 0.001, sector: 'Technology' },
  'JPM': { name: 'JPMorgan Chase', symbol: 'JPM', category: 'Stocks', basePrice: 198.6, volatility: 0.018, trend: 0.0002, beta: 1.05, dividendYield: 0.025, sector: 'Finance' },
  'V': { name: 'Visa Inc.', symbol: 'V', category: 'Stocks', basePrice: 282.1, volatility: 0.016, trend: 0.0003, beta: 0.95, dividendYield: 0.007, sector: 'Finance' },
  
  // Crypto
  'BTC': { name: 'Bitcoin', symbol: 'BTC', category: 'Crypto', basePrice: 97500, volatility: 0.038, trend: 0.0005, beta: 2.0, dividendYield: 0.0 },
  'ETH': { name: 'Ethereum', symbol: 'ETH', category: 'Crypto', basePrice: 3420, volatility: 0.045, trend: 0.0004, beta: 2.2, dividendYield: 0.0 },
  'SOL': { name: 'Solana', symbol: 'SOL', category: 'Crypto', basePrice: 198, volatility: 0.055, trend: 0.0006, beta: 2.5, dividendYield: 0.0 },
  'BNB': { name: 'Binance Coin', symbol: 'BNB', category: 'Crypto', basePrice: 615, volatility: 0.035, trend: 0.0003, beta: 1.8, dividendYield: 0.0 },
  
  // Commodities
  'GOLD': { name: 'Gold', symbol: 'GOLD', category: 'Commodities', basePrice: 2045, volatility: 0.012, trend: 0.0002, beta: 0.3, dividendYield: 0.0 },
  'SILVER': { name: 'Silver', symbol: 'SILVER', category: 'Commodities', basePrice: 24.8, volatility: 0.018, trend: 0.0001, beta: 0.5, dividendYield: 0.0 },
  'OIL': { name: 'Crude Oil WTI', symbol: 'OIL', category: 'Commodities', basePrice: 78.5, volatility: 0.025, trend: -0.0001, beta: 0.8, dividendYield: 0.0 },
  'NATGAS': { name: 'Natural Gas', symbol: 'NATGAS', category: 'Commodities', basePrice: 2.85, volatility: 0.035, trend: -0.0002, beta: 0.7, dividendYield: 0.0 },
  
  // Forex
  'EURUSD': { name: 'EUR/USD', symbol: 'EURUSD', category: 'Forex', basePrice: 1.0875, volatility: 0.006, trend: 0.00001, beta: 0.2, dividendYield: 0.0 },
  'GBPUSD': { name: 'GBP/USD', symbol: 'GBPUSD', category: 'Forex', basePrice: 1.2680, volatility: 0.007, trend: 0.00002, beta: 0.25, dividendYield: 0.0 },
  'USDJPY': { name: 'USD/JPY', symbol: 'USDJPY', category: 'Forex', basePrice: 149.5, volatility: 0.008, trend: 0.0001, beta: 0.3, dividendYield: 0.0 },
  
  // Indices
  'SPX': { name: 'S&P 500', symbol: 'SPX', category: 'Indices', basePrice: 5088, volatility: 0.012, trend: 0.0003, beta: 1.0, dividendYield: 0.014 },
  'NDX': { name: 'NASDAQ 100', symbol: 'NDX', category: 'Indices', basePrice: 17985, volatility: 0.016, trend: 0.0004, beta: 1.2, dividendYield: 0.007 },
  'DJI': { name: 'Dow Jones', symbol: 'DJI', category: 'Indices', basePrice: 38654, volatility: 0.010, trend: 0.0002, beta: 0.9, dividendYield: 0.018 },
}

const DAY_MS = 86400000
const DEFAULT_MARKET_DAYS = 365
const DEFAULT_PREDICT_DAYS = 30
const MAX_MARKET_DAYS = 3650
const MAX_FORECAST_DAYS = 365

type JsonObject = Record<string, unknown>

function parseClampedInt(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? '', 10)
  if (Number.isNaN(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}

function parseRiskTolerance(value: unknown, fallback = 0.5) {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.max(0, Math.min(1, value))
}

function normalizeSymbols(value: unknown, minCount: number = 1) {
  if (!Array.isArray(value)) return null
  const symbols = Array.from(new Set(value
    .filter((v): v is string => typeof v === 'string')
    .map(v => v.trim().toUpperCase())
    .filter(v => Boolean(ASSETS[v]))))

  return symbols.length >= minCount ? symbols : null
}

async function safeReadJson(c: any): Promise<JsonObject | null> {
  try {
    return await c.req.json()
  } catch {
    return null
  }
}

// Seeded random number generator for deterministic results
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF
    return (s >>> 0) / 0xFFFFFFFF
  }
}

function generateHistoricalData(asset: AssetConfig, days: number = DEFAULT_MARKET_DAYS) {
  const now = Date.now()
  const seedBase = asset.symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + Math.floor(now / DAY_MS)
  const rand = seededRandom(seedBase)
  
  const data: Candle[] = []
  // Start price within ±10% of base for realistic values
  let price = asset.basePrice * (0.92 + rand() * 0.16)
  let volume = 1000000 + rand() * 5000000
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now - i * DAY_MS)
    if (date.getDay() === 0 || date.getDay() === 6) {
      if (asset.category !== 'Crypto' && asset.category !== 'Forex') continue
    }
    
    const drift = asset.trend + (rand() - 0.5) * 0.001
    const shock = (rand() - 0.5) * 2 * asset.volatility
    // Stronger mean reversion to keep prices closer to base
    const meanReversion = (asset.basePrice - price) / asset.basePrice * 0.008
    
    const returnVal = drift + shock + meanReversion
    price = price * (1 + returnVal)
    
    const dayVol = asset.volatility * (0.5 + rand() * 1.5)
    const open = price * (1 + (rand() - 0.5) * dayVol * 0.5)
    const high = Math.max(open, price) * (1 + rand() * dayVol * 0.3)
    const low = Math.min(open, price) * (1 - rand() * dayVol * 0.3)
    
    volume = volume * (0.8 + rand() * 0.4)
    
    data.push({
      date: date.toISOString().split('T')[0],
      timestamp: date.getTime(),
      open: +open.toFixed(asset.basePrice < 10 ? 4 : 2),
      high: +high.toFixed(asset.basePrice < 10 ? 4 : 2),
      low: +low.toFixed(asset.basePrice < 10 ? 4 : 2),
      close: +price.toFixed(asset.basePrice < 10 ? 4 : 2),
      volume: Math.round(volume),
    })
  }
  return data
}

const historyCache = new Map<string, Candle[]>()

function getHistoricalData(asset: AssetConfig, days: number) {
  const normalizedDays = Math.max(2, days)
  const seedDay = Math.floor(Date.now() / DAY_MS)
  const key = `${asset.symbol}:${normalizedDays}:${seedDay}`

  if (historyCache.has(key)) {
    return historyCache.get(key)!
  }

  const generated = generateHistoricalData(asset, normalizedDays)
  historyCache.set(key, generated)

  if (historyCache.size > 256) {
    const firstKey = historyCache.keys().next().value
    if (firstKey) historyCache.delete(firstKey)
  }

  return generated
}

// ============================================================
// TECHNICAL INDICATORS ENGINE
// ============================================================

function calculateSMA(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { result.push(null); continue }
    const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
    result.push(+(sum / period).toFixed(4))
  }
  return result
}

function calculateEMA(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  const multiplier = 2 / (period + 1)
  let ema: number | null = null
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { result.push(null); continue }
    if (ema === null) {
      ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period
    } else {
      ema = (closes[i] - ema) * multiplier + ema
    }
    result.push(+ema.toFixed(4))
  }
  return result
}

function calculateRSI(closes: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [null]
  const gains: number[] = []
  const losses: number[] = []
  
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1]
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? -change : 0)
    
    if (i < period) { result.push(null); continue }
    
    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period
    
    if (avgLoss === 0) { result.push(100); continue }
    const rs = avgGain / avgLoss
    result.push(+(100 - 100 / (1 + rs)).toFixed(2))
  }
  return result
}

function calculateMACD(closes: number[]) {
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
    if (macdLine[i] === null) { signal.push(null); histogram.push(null); continue }
    validCount++
    if (validCount < signalPeriod) { signal.push(null); histogram.push(null); continue }
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

function calculateBollingerBands(closes: number[], period: number = 20, stdDev: number = 2) {
  const sma = calculateSMA(closes, period)
  const upper: (number | null)[] = []
  const lower: (number | null)[] = []
  
  for (let i = 0; i < closes.length; i++) {
    if (sma[i] === null) { upper.push(null); lower.push(null); continue }
    const slice = closes.slice(Math.max(0, i - period + 1), i + 1)
    const mean = sma[i]!
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / slice.length
    const std = Math.sqrt(variance)
    upper.push(+(mean + stdDev * std).toFixed(4))
    lower.push(+(mean - stdDev * std).toFixed(4))
  }
  
  return { middle: sma, upper, lower }
}

function calculateATR(data: any[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [null]
  const trs: number[] = []
  
  for (let i = 1; i < data.length; i++) {
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    )
    trs.push(tr)
    
    if (i < period) { result.push(null); continue }
    const atr = trs.slice(-period).reduce((a, b) => a + b, 0) / period
    result.push(+atr.toFixed(4))
  }
  return result
}

function calculateStochastic(data: any[], period: number = 14) {
  const k: (number | null)[] = []
  const d: (number | null)[] = []
  const kValues: number[] = []
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { k.push(null); d.push(null); continue }
    const slice = data.slice(i - period + 1, i + 1)
    const highestHigh = Math.max(...slice.map((d: any) => d.high))
    const lowestLow = Math.min(...slice.map((d: any) => d.low))
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

function calculateFibonacci(data: any[]) {
  const closes = data.map((d: any) => d.close)
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

// ============================================================
// PREDICTION ALGORITHMS ENGINE
// ============================================================

function monteCarloSimulation(data: any[], days: number = 30, simulations: number = 500) {
  const closes = data.map((d: any) => d.close)
  const returns: number[] = []
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]))
  }
  
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length
  const stdReturn = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length)
  
  const lastPrice = closes[closes.length - 1]
  const allPaths: number[][] = []
  const seedBase = Math.floor(Date.now() / 86400000)
  
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
  
  // Calculate percentiles
  const predictions: any[] = []
  for (let d = 0; d <= days; d++) {
    const prices = allPaths.map(p => p[d]).sort((a, b) => a - b)
    predictions.push({
      day: d,
      p5: prices[Math.floor(simulations * 0.05)],
      p25: prices[Math.floor(simulations * 0.25)],
      median: prices[Math.floor(simulations * 0.50)],
      p75: prices[Math.floor(simulations * 0.75)],
      p95: prices[Math.floor(simulations * 0.95)],
      mean: +(prices.reduce((a, b) => a + b, 0) / simulations).toFixed(4),
    })
  }
  
  const finalPrices = allPaths.map(p => p[days])
  const bullishCount = finalPrices.filter(p => p > lastPrice).length
  
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
    }
  }
}

function linearRegressionForecast(data: any[], days: number = 30) {
  const closes = data.map((d: any) => d.close)
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
  
  const predictions = []
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

function meanReversionPrediction(data: any[], days: number = 30) {
  const closes = data.map((d: any) => d.close)
  const sma200 = closes.slice(-200).reduce((a, b) => a + b, 0) / Math.min(200, closes.length)
  const sma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / Math.min(50, closes.length)
  const currentPrice = closes[closes.length - 1]
  
  const deviation = (currentPrice - sma200) / sma200
  const halfLife = 20
  const speed = Math.log(2) / halfLife
  
  const predictions = []
  let price = currentPrice
  
  for (let d = 0; d <= days; d++) {
    const pullback = (sma200 - price) * speed
    price = price + pullback + (sma200 * 0.0001)
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
    signal: Math.abs(deviation) > 0.1 ? (deviation > 0 ? 'Overbought - Sell Signal' : 'Oversold - Buy Signal') : 'Neutral',
    deviationPercent: +(deviation * 100).toFixed(2),
  }
}

function momentumPrediction(data: any[], days: number = 30) {
  const closes = data.map((d: any) => d.close)
  const rsi = calculateRSI(closes)
  const macd = calculateMACD(closes)
  const stoch = calculateStochastic(data)
  
  const lastRSI = rsi.filter(v => v !== null).pop() || 50
  const lastMACD = macd.histogram.filter(v => v !== null).pop() || 0
  const lastStochK = stoch.k.filter(v => v !== null).pop() || 50
  
  // Composite momentum score
  const rsiScore = lastRSI > 70 ? -1 : lastRSI < 30 ? 1 : (50 - lastRSI) / 50
  const macdScore = lastMACD > 0 ? 1 : -1
  const stochScore = lastStochK > 80 ? -1 : lastStochK < 20 ? 1 : (50 - lastStochK) / 50
  
  const momentumScore = (rsiScore * 0.35 + macdScore * 0.35 + stochScore * 0.3)
  const currentPrice = closes[closes.length - 1]
  
  const predictions = []
  let price = currentPrice
  const volatility = data.length > 20 ? 
    Math.sqrt(closes.slice(-20).reduce((sum, c, i, arr) => i > 0 ? sum + Math.pow(Math.log(c / arr[i-1]), 2) : 0, 0) / 19) : 0.02

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
    }
  }
}

// Composite AI score that combines all models
function calculateCompositeScore(data: any[], asset: AssetConfig) {
  const mc = monteCarloSimulation(data, 30, 200)
  const lr = linearRegressionForecast(data, 30)
  const mr = meanReversionPrediction(data, 30)
  const mom = momentumPrediction(data, 30)
  
  const mcScore = mc.statistics.bullishProbability / 100
  const lrScore = lr.trendDirection === 'Bullish' ? 0.5 + lr.rSquared * 0.5 : 0.5 - lr.rSquared * 0.5
  const mrScore = mr.currentDeviation > 10 ? 0.3 : mr.currentDeviation < -10 ? 0.7 : 0.5
  const momScore = (mom.momentumScore + 1) / 2
  
  const composite = mcScore * 0.3 + lrScore * 0.25 + mrScore * 0.2 + momScore * 0.25
  
  let recommendation: string
  let confidence: string
  if (composite > 0.7) { recommendation = 'STRONG BUY'; confidence = 'High' }
  else if (composite > 0.55) { recommendation = 'BUY'; confidence = 'Medium' }
  else if (composite > 0.45) { recommendation = 'HOLD'; confidence = 'Low' }
  else if (composite > 0.3) { recommendation = 'SELL'; confidence = 'Medium' }
  else { recommendation = 'STRONG SELL'; confidence = 'High' }
  
  return {
    score: +(composite * 100).toFixed(1),
    recommendation,
    confidence,
    breakdown: {
      monteCarlo: +(mcScore * 100).toFixed(1),
      regression: +(lrScore * 100).toFixed(1),
      meanReversion: +(mrScore * 100).toFixed(1),
      momentum: +(momScore * 100).toFixed(1),
    }
  }
}

// ============================================================
// PORTFOLIO OPTIMIZATION ENGINE
// ============================================================

function optimizePortfolio(symbols: string[], riskTolerance: number = 0.5) {
  const assetData: any[] = []
  const returns: number[][] = []
  
  for (const sym of symbols) {
    const asset = ASSETS[sym]
    if (!asset) continue
    const data = getHistoricalData(asset, 252)
    const closes = data.map(d => d.close)
    const dailyReturns: number[] = []
    for (let i = 1; i < closes.length; i++) {
      dailyReturns.push(Math.log(closes[i] / closes[i - 1]))
    }
    returns.push(dailyReturns)
    
    const meanReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
    const stdDev = Math.sqrt(dailyReturns.reduce((s, r) => s + Math.pow(r - meanReturn, 2), 0) / dailyReturns.length)
    
    assetData.push({
      symbol: sym,
      name: asset.name,
      annualReturn: +(meanReturn * 252 * 100).toFixed(2),
      annualVolatility: +(stdDev * Math.sqrt(252) * 100).toFixed(2),
      sharpe: stdDev === 0 ? 0 : +((meanReturn * 252) / (stdDev * Math.sqrt(252))).toFixed(3),
      currentPrice: closes[closes.length - 1],
    })
  }
  
  // Correlation matrix
  const correlations: number[][] = []
  for (let i = 0; i < returns.length; i++) {
    correlations[i] = []
    for (let j = 0; j < returns.length; j++) {
      const n = Math.min(returns[i].length, returns[j].length)
      const r1 = returns[i].slice(-n)
      const r2 = returns[j].slice(-n)
      const m1 = r1.reduce((a, b) => a + b, 0) / n
      const m2 = r2.reduce((a, b) => a + b, 0) / n
      const cov = r1.reduce((s, v, k) => s + (v - m1) * (r2[k] - m2), 0) / n
      const s1 = Math.sqrt(r1.reduce((s, v) => s + Math.pow(v - m1, 2), 0) / n)
      const s2 = Math.sqrt(r2.reduce((s, v) => s + Math.pow(v - m2, 2), 0) / n)
      correlations[i][j] = s1 * s2 === 0 ? 0 : +(cov / (s1 * s2)).toFixed(3)
    }
  }
  
  // Generate optimized weights based on risk tolerance (simplified efficient frontier)
  const n = assetData.length
  if (n === 0) return { error: 'No valid assets' }
  
  // Risk-adjusted weight allocation
  const weights: number[] = assetData.map((a, i) => {
    const returnWeight = a.annualReturn
    const riskPenalty = a.annualVolatility * (1 - riskTolerance)
    return Math.max(0.02, returnWeight - riskPenalty + 5)
  })
  
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  const normalizedWeights = weights.map(w => +(w / totalWeight * 100).toFixed(1))
  
  // Portfolio metrics
  const portReturn = assetData.reduce((sum, a, i) => sum + a.annualReturn * normalizedWeights[i] / 100, 0)
  const portVol = Math.sqrt(assetData.reduce((sum, a, i) => sum + Math.pow(a.annualVolatility * normalizedWeights[i] / 100, 2), 0))
  
  return {
    allocations: assetData.map((a, i) => ({
      ...a,
      weight: normalizedWeights[i],
    })),
    portfolio: {
      expectedReturn: +portReturn.toFixed(2),
      volatility: +portVol.toFixed(2),
      sharpeRatio: portVol === 0 ? 0 : +(portReturn / portVol).toFixed(3),
      diversificationScore: +(1 - Math.max(...normalizedWeights) / 100).toFixed(2) * 100,
    },
    correlationMatrix: {
      symbols: symbols.filter(s => ASSETS[s]),
      matrix: correlations,
    },
    riskTolerance,
  }
}

// ============================================================
// API ROUTES
// ============================================================

// Get all available assets with live prices
app.get('/api/assets', (c) => {
  const categories: Record<string, any[]> = {}
  const assetsWithPrices: Record<string, any> = {}
  
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
  return c.json({ assets: assetsWithPrices, categories })
})

// Get historical data with technical indicators
app.get('/api/market/:symbol', (c) => {
  const symbol = c.req.param('symbol').toUpperCase()
  const days = parseClampedInt(c.req.query('days'), DEFAULT_MARKET_DAYS, 2, MAX_MARKET_DAYS)
  const asset = ASSETS[symbol]
  if (!asset) return c.json({ error: 'Asset not found' }, 404)
  
  const data = getHistoricalData(asset, days)
  const closes = data.map(d => d.close)
  
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
      avgVolume: Math.round(data.slice(-Math.min(20, data.length)).reduce((sum, d) => sum + d.volume, 0) / Math.min(20, data.length)),
    }
  })
})

// Get predictions for an asset
app.get('/api/predict/:symbol', (c) => {
  const symbol = c.req.param('symbol').toUpperCase()
  const days = parseClampedInt(c.req.query('days'), DEFAULT_PREDICT_DAYS, 1, MAX_FORECAST_DAYS)
  const asset = ASSETS[symbol]
  if (!asset) return c.json({ error: 'Asset not found' }, 404)
  
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

// Portfolio optimization
app.post('/api/portfolio/optimize', async (c) => {
  const body = await safeReadJson(c)
  if (!body) return c.json({ error: 'Invalid JSON payload' }, 400)

  const symbols = normalizeSymbols(body.symbols, 2)
  if (!symbols) return c.json({ error: 'Provide at least 2 valid asset symbols' }, 400)

  const riskTolerance = parseRiskTolerance(body.riskTolerance)
  const result = optimizePortfolio(symbols, riskTolerance)
  return c.json(result)
})

// AI Sentiment Analysis
app.post('/api/ai/analyze', async (c) => {
  const body = await safeReadJson(c)
  if (!body) return c.json({ error: 'Invalid JSON payload' }, 400)

  const symbol = typeof body.symbol === 'string' ? body.symbol.toUpperCase() : ''
  const question = typeof body.question === 'string' ? body.question.trim() : ''

  const asset = ASSETS[symbol]
  if (!asset) return c.json({ error: 'Asset not found' }, 404)
  
  const data = getHistoricalData(asset, 90)
  const closes = data.map(d => d.close)
  const last = closes[closes.length - 1]
  const lookback = Math.min(30, closes.length - 1)
  const referencePrice = closes[closes.length - 1 - lookback]
  const change30d = ((last - referencePrice) / referencePrice * 100).toFixed(2)
  const rsi = calculateRSI(closes).filter(v => v !== null).pop()
  const composite = calculateCompositeScore(data, asset)
  
  const apiKey = c.env?.OPENAI_API_KEY || (typeof process !== 'undefined' ? process.env?.OPENAI_API_KEY : '')
  const baseUrl = c.env?.OPENAI_BASE_URL || (typeof process !== 'undefined' ? process.env?.OPENAI_BASE_URL : '')
  
  if (!apiKey || !baseUrl) {
    return c.json({ error: 'AI service not configured' }, 500)
  }
  
  const systemPrompt = `You are TrendOracle AI, an elite financial analysis AI assistant. You provide detailed, data-driven market analysis with actionable insights. Be specific with numbers and percentages. Format your response with clear sections using markdown. Always include: 1) Current Market Position, 2) Technical Analysis Summary, 3) Key Risk Factors, 4) Actionable Recommendation with specific entry/exit targets.`
  
  const userPrompt = `Analyze ${asset.name} (${asset.symbol}) in the ${asset.category} market:

Current Price: $${last}
30-Day Change: ${change30d}%
RSI (14): ${rsi}
AI Composite Score: ${composite.score}/100 (${composite.recommendation})
Score Breakdown - Monte Carlo: ${composite.breakdown.monteCarlo}, Regression: ${composite.breakdown.regression}, Mean Reversion: ${composite.breakdown.meanReversion}, Momentum: ${composite.breakdown.momentum}
Beta: ${asset.beta}
Annualized Volatility: ${(asset.volatility * Math.sqrt(252) * 100).toFixed(1)}%

${question ? `User's specific question: ${question}` : 'Provide a comprehensive analysis with price targets for 7, 14, and 30 days.'}`

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    })
    
    if (!response.ok) {
      const details = await response.text()
      return c.json({ error: `AI provider error (${response.status}): ${details.slice(0, 240)}` }, 502)
    }

    const result: any = await response.json()

    return c.json({
      analysis: result.choices?.[0]?.message?.content || 'Analysis unavailable',
      dataUsed: {
        currentPrice: last,
        change30d,
        rsi,
        compositeScore: composite,
      }
    })
  } catch (err: any) {
    return c.json({ error: 'AI analysis failed: ' + err.message }, 500)
  }
})

// Market scanner - find top opportunities
app.get('/api/scanner', (c) => {
  const results: any[] = []
  
  for (const [symbol, asset] of Object.entries(ASSETS)) {
    const data = getHistoricalData(asset, DEFAULT_MARKET_DAYS)
    const composite = calculateCompositeScore(data, asset)
    const mc = monteCarloSimulation(data, 30, 100)
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
  return c.json({ scanner: results, timestamp: new Date().toISOString() })
})

// Compare multiple assets
app.post('/api/compare', async (c) => {
  const body = await safeReadJson(c)
  if (!body) return c.json({ error: 'Invalid JSON payload' }, 400)

  const symbols = normalizeSymbols(body.symbols, 2)
  if (!symbols) return c.json({ error: 'Provide at least 2 valid symbols' }, 400)
  
  const comparisons = symbols.map((sym: string) => {
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
  }).filter(Boolean)
  
  return c.json({ comparisons })
})

// ============================================================
// MAIN HTML PAGE
// ============================================================

app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TrendOracle AI - Market Prediction Platform</title>
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<script>
tailwind.config = {
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'], mono: ['JetBrains Mono', 'monospace'] },
      colors: {
        dark: { 50: '#f8fafc', 100: '#e2e8f0', 200: '#94a3b8', 300: '#64748b', 400: '#475569', 500: '#1e293b', 600: '#0f172a', 700: '#0c1220', 800: '#080e1a', 900: '#050a12' },
        accent: { 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5' },
        neon: { green: '#22c55e', red: '#ef4444', yellow: '#eab308', blue: '#3b82f6', purple: '#a855f7', cyan: '#06b6d4' }
      }
    }
  }
}
</script>
<style>
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #0f172a; }
::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #475569; }
* { scrollbar-width: thin; scrollbar-color: #334155 #0f172a; }
body { background: #050a12; }
.glass { background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(20px); border: 1px solid rgba(99, 102, 241, 0.1); }
.glass-card { background: linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.4)); backdrop-filter: blur(20px); border: 1px solid rgba(99, 102, 241, 0.15); transition: all 0.3s ease; }
.glass-card:hover { border-color: rgba(99, 102, 241, 0.35); box-shadow: 0 0 30px rgba(99, 102, 241, 0.1); }
.glow { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }
.glow-green { box-shadow: 0 0 15px rgba(34, 197, 94, 0.3); }
.glow-red { box-shadow: 0 0 15px rgba(239, 68, 68, 0.3); }
.pulse-dot { animation: pulse 2s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.animate-slideUp { animation: slideUp 0.5s ease-out forwards; }
.animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
.score-ring { position: relative; display: inline-flex; align-items: center; justify-content: center; }
.gradient-text { background: linear-gradient(135deg, #818cf8, #6366f1, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.tab-active { background: linear-gradient(135deg, #4f46e5, #6366f1); color: white; }
.progress-bar { background: linear-gradient(90deg, #4f46e5, #06b6d4); }
.category-chip { transition: all 0.2s; cursor: pointer; }
.category-chip:hover, .category-chip.active { background: rgba(99, 102, 241, 0.3); border-color: #6366f1; }
.loading-shimmer { background: linear-gradient(90deg, rgba(30,41,59,0.5) 25%, rgba(51,65,85,0.5) 50%, rgba(30,41,59,0.5) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.stat-card { position: relative; overflow: hidden; }
.stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, var(--accent-color, #6366f1), transparent); }
.tooltip-custom { position: relative; }
.market-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.sidebar-item { transition: all 0.2s; cursor: pointer; padding: 8px 12px; border-radius: 8px; }
.sidebar-item:hover, .sidebar-item.active { background: rgba(99, 102, 241, 0.15); }
.markdown-content h2 { font-size: 1.25rem; font-weight: 700; color: #e2e8f0; margin-top: 1rem; margin-bottom: 0.5rem; }
.markdown-content h3 { font-size: 1.1rem; font-weight: 600; color: #94a3b8; margin-top: 0.75rem; margin-bottom: 0.25rem; }
.markdown-content p { margin-bottom: 0.5rem; line-height: 1.6; }
.markdown-content ul { list-style: disc; padding-left: 1.25rem; margin-bottom: 0.5rem; }
.markdown-content li { margin-bottom: 0.25rem; }
.markdown-content strong { color: #818cf8; }
.correlation-cell { width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 600; border-radius: 4px; }
</style>
</head>
<body class="bg-dark-900 text-dark-100 font-sans min-h-screen">

<!-- Top Navigation Bar -->
<nav class="glass sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
  <div class="flex items-center gap-3">
    <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-500 to-neon-purple flex items-center justify-center">
      <i class="fas fa-brain text-white text-sm"></i>
    </div>
    <div>
      <h1 class="text-lg font-bold gradient-text">TrendOracle AI</h1>
      <p class="text-[10px] text-dark-300 -mt-0.5">Multi-Algorithm Prediction Engine</p>
    </div>
  </div>
  <div class="flex items-center gap-3">
    <div class="flex items-center gap-1.5 text-xs text-dark-200">
      <span class="w-2 h-2 rounded-full bg-neon-green pulse-dot"></span>
      <span>Live</span>
    </div>
    <div id="clock" class="text-xs font-mono text-dark-300"></div>
  </div>
</nav>

<div class="flex h-[calc(100vh-57px)]">

<!-- Sidebar - Asset Browser -->
<aside id="sidebar" class="w-64 glass border-r border-dark-400/30 overflow-y-auto flex-shrink-0 p-3">
  <div class="mb-3">
    <div class="relative">
      <i class="fas fa-search absolute left-3 top-2.5 text-dark-300 text-xs"></i>
      <input id="assetSearch" type="text" placeholder="Search assets..." 
        class="w-full bg-dark-700/50 border border-dark-400/30 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-dark-300 focus:outline-none focus:border-accent-500/50">
    </div>
  </div>
  <div id="categoryFilters" class="flex flex-wrap gap-1.5 mb-3">
    <span class="category-chip active text-[10px] px-2 py-1 rounded-full border border-dark-400/30 text-dark-200" data-cat="All">All</span>
    <span class="category-chip text-[10px] px-2 py-1 rounded-full border border-dark-400/30 text-dark-200" data-cat="Stocks">Stocks</span>
    <span class="category-chip text-[10px] px-2 py-1 rounded-full border border-dark-400/30 text-dark-200" data-cat="Crypto">Crypto</span>
    <span class="category-chip text-[10px] px-2 py-1 rounded-full border border-dark-400/30 text-dark-200" data-cat="Commodities">Commodities</span>
    <span class="category-chip text-[10px] px-2 py-1 rounded-full border border-dark-400/30 text-dark-200" data-cat="Forex">Forex</span>
    <span class="category-chip text-[10px] px-2 py-1 rounded-full border border-dark-400/30 text-dark-200" data-cat="Indices">Indices</span>
  </div>
  <div id="assetList" class="space-y-1"></div>
</aside>

<!-- Main Content -->
<main class="flex-1 overflow-y-auto p-4 space-y-4">

  <!-- Top Stats Bar -->
  <div id="topStats" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3"></div>

  <!-- Navigation Tabs -->
  <div class="flex gap-2 flex-wrap">
    <button onclick="switchTab('dashboard')" id="tab-dashboard" class="tab-active text-xs px-4 py-2 rounded-lg font-medium transition-all"><i class="fas fa-chart-line mr-1.5"></i>Dashboard</button>
    <button onclick="switchTab('predictions')" id="tab-predictions" class="text-xs px-4 py-2 rounded-lg font-medium text-dark-200 bg-dark-600/50 border border-dark-400/30 hover:bg-dark-500/50 transition-all"><i class="fas fa-wand-magic-sparkles mr-1.5"></i>Predictions</button>
    <button onclick="switchTab('scanner')" id="tab-scanner" class="text-xs px-4 py-2 rounded-lg font-medium text-dark-200 bg-dark-600/50 border border-dark-400/30 hover:bg-dark-500/50 transition-all"><i class="fas fa-crosshairs mr-1.5"></i>Scanner</button>
    <button onclick="switchTab('portfolio')" id="tab-portfolio" class="text-xs px-4 py-2 rounded-lg font-medium text-dark-200 bg-dark-600/50 border border-dark-400/30 hover:bg-dark-500/50 transition-all"><i class="fas fa-wallet mr-1.5"></i>Portfolio</button>
    <button onclick="switchTab('ai')" id="tab-ai" class="text-xs px-4 py-2 rounded-lg font-medium text-dark-200 bg-dark-600/50 border border-dark-400/30 hover:bg-dark-500/50 transition-all"><i class="fas fa-robot mr-1.5"></i>AI Analyst</button>
  </div>

  <!-- Dashboard Tab -->
  <div id="content-dashboard" class="space-y-4">
    <!-- Price Chart -->
    <div class="glass-card rounded-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <div>
          <h2 id="chartTitle" class="text-lg font-bold text-white">Price Chart</h2>
          <p id="chartSubtitle" class="text-xs text-dark-300">Loading...</p>
        </div>
        <div class="flex gap-1.5">
          <button onclick="setTimeframe(30)" class="tf-btn text-[10px] px-2.5 py-1 rounded bg-dark-600/50 text-dark-200 hover:bg-accent-500/20">1M</button>
          <button onclick="setTimeframe(90)" class="tf-btn text-[10px] px-2.5 py-1 rounded bg-dark-600/50 text-dark-200 hover:bg-accent-500/20">3M</button>
          <button onclick="setTimeframe(180)" class="tf-btn text-[10px] px-2.5 py-1 rounded bg-accent-500/30 text-accent-400 border border-accent-500/30">6M</button>
          <button onclick="setTimeframe(365)" class="tf-btn text-[10px] px-2.5 py-1 rounded bg-dark-600/50 text-dark-200 hover:bg-accent-500/20">1Y</button>
        </div>
      </div>
      <div class="flex gap-2 mb-3 flex-wrap">
        <label class="flex items-center gap-1 text-[10px] text-dark-200 cursor-pointer"><input type="checkbox" id="show-sma" class="accent-accent-500 w-3 h-3" checked> SMA 20/50</label>
        <label class="flex items-center gap-1 text-[10px] text-dark-200 cursor-pointer"><input type="checkbox" id="show-bb" class="accent-neon-cyan w-3 h-3"> Bollinger</label>
        <label class="flex items-center gap-1 text-[10px] text-dark-200 cursor-pointer"><input type="checkbox" id="show-vol" class="accent-neon-purple w-3 h-3"> Volume</label>
        <label class="flex items-center gap-1 text-[10px] text-dark-200 cursor-pointer"><input type="checkbox" id="show-fib" class="accent-neon-yellow w-3 h-3"> Fibonacci</label>
      </div>
      <div style="height:360px"><canvas id="priceChart"></canvas></div>
    </div>
    
    <!-- Technical Indicators Row -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div class="glass-card rounded-xl p-4">
        <h3 class="text-xs font-semibold text-dark-200 mb-2"><i class="fas fa-wave-square mr-1 text-accent-400"></i>RSI (14)</h3>
        <div style="height:140px"><canvas id="rsiChart"></canvas></div>
      </div>
      <div class="glass-card rounded-xl p-4">
        <h3 class="text-xs font-semibold text-dark-200 mb-2"><i class="fas fa-chart-bar mr-1 text-neon-cyan"></i>MACD</h3>
        <div style="height:140px"><canvas id="macdChart"></canvas></div>
      </div>
      <div class="glass-card rounded-xl p-4">
        <h3 class="text-xs font-semibold text-dark-200 mb-2"><i class="fas fa-gauge-high mr-1 text-neon-purple"></i>Stochastic</h3>
        <div style="height:140px"><canvas id="stochChart"></canvas></div>
      </div>
    </div>
    
    <!-- Fibonacci Levels Table -->
    <div class="glass-card rounded-xl p-4">
      <h3 class="text-sm font-semibold text-white mb-3"><i class="fas fa-layer-group mr-1 text-neon-yellow"></i>Fibonacci Retracement Levels & Key Metrics</h3>
      <div id="fibTable" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2"></div>
    </div>
  </div>

  <!-- Predictions Tab -->
  <div id="content-predictions" class="space-y-4 hidden">
    <div class="flex items-center gap-3 mb-2">
      <span class="text-xs text-dark-200">Forecast Period:</span>
      <select id="forecastDays" onchange="loadPredictions()" class="bg-dark-700/50 border border-dark-400/30 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent-500/50">
        <option value="7">7 Days</option>
        <option value="14">14 Days</option>
        <option value="30" selected>30 Days</option>
        <option value="60">60 Days</option>
        <option value="90">90 Days</option>
      </select>
    </div>
    
    <!-- Composite Score -->
    <div id="compositeSection" class="glass-card rounded-xl p-5"></div>
    
    <!-- Prediction Charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="glass-card rounded-xl p-4">
        <h3 class="text-sm font-semibold text-white mb-1"><i class="fas fa-dice mr-1.5 text-neon-purple"></i>Monte Carlo Simulation</h3>
        <p class="text-[10px] text-dark-300 mb-3">500 probabilistic price paths with confidence intervals</p>
        <div style="height:280px"><canvas id="mcChart"></canvas></div>
        <div id="mcStats" class="mt-3 grid grid-cols-3 gap-2"></div>
      </div>
      <div class="glass-card rounded-xl p-4">
        <h3 class="text-sm font-semibold text-white mb-1"><i class="fas fa-chart-line mr-1.5 text-neon-blue"></i>Linear Regression Forecast</h3>
        <p class="text-[10px] text-dark-300 mb-3">Trend-based projection with 95% confidence band</p>
        <div style="height:280px"><canvas id="lrChart"></canvas></div>
        <div id="lrStats" class="mt-3 grid grid-cols-3 gap-2"></div>
      </div>
      <div class="glass-card rounded-xl p-4">
        <h3 class="text-sm font-semibold text-white mb-1"><i class="fas fa-magnet mr-1.5 text-neon-cyan"></i>Mean Reversion Model</h3>
        <p class="text-[10px] text-dark-300 mb-3">Price convergence toward statistical mean</p>
        <div style="height:280px"><canvas id="mrChart"></canvas></div>
        <div id="mrStats" class="mt-3 grid grid-cols-3 gap-2"></div>
      </div>
      <div class="glass-card rounded-xl p-4">
        <h3 class="text-sm font-semibold text-white mb-1"><i class="fas fa-bolt mr-1.5 text-neon-yellow"></i>Momentum Analysis</h3>
        <p class="text-[10px] text-dark-300 mb-3">RSI, MACD, Stochastic composite momentum</p>
        <div style="height:280px"><canvas id="momChart"></canvas></div>
        <div id="momStats" class="mt-3 grid grid-cols-3 gap-2"></div>
      </div>
    </div>
  </div>

  <!-- Scanner Tab -->
  <div id="content-scanner" class="space-y-4 hidden">
    <div class="glass-card rounded-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-bold text-white"><i class="fas fa-satellite-dish mr-1.5 text-accent-400"></i>Market Opportunity Scanner</h2>
        <button onclick="loadScanner()" class="text-[10px] px-3 py-1.5 rounded-lg bg-accent-500/20 text-accent-400 border border-accent-500/30 hover:bg-accent-500/30 transition">
          <i class="fas fa-sync mr-1"></i>Refresh
        </button>
      </div>
      <div id="scannerTable" class="overflow-x-auto"></div>
    </div>
  </div>

  <!-- Portfolio Tab -->
  <div id="content-portfolio" class="space-y-4 hidden">
    <div class="glass-card rounded-xl p-4">
      <h2 class="text-sm font-bold text-white mb-3"><i class="fas fa-sliders mr-1.5 text-accent-400"></i>Portfolio Optimizer</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="text-xs text-dark-200 block mb-1.5">Select Assets (hold Ctrl/Cmd for multiple)</label>
          <select id="portfolioAssets" multiple class="w-full bg-dark-700/50 border border-dark-400/30 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-500/50" style="height:200px"></select>
        </div>
        <div class="space-y-4">
          <div>
            <label class="text-xs text-dark-200 block mb-1.5">Risk Tolerance</label>
            <input type="range" id="riskSlider" min="0" max="100" value="50" class="w-full accent-accent-500" oninput="document.getElementById('riskVal').textContent=this.value+'%'">
            <div class="flex justify-between text-[10px] text-dark-300 mt-1">
              <span>Conservative</span>
              <span id="riskVal" class="text-accent-400 font-semibold">50%</span>
              <span>Aggressive</span>
            </div>
          </div>
          <button onclick="optimizePortfolio()" class="w-full py-2.5 rounded-lg bg-gradient-to-r from-accent-500 to-neon-purple text-white text-xs font-semibold hover:opacity-90 transition glow">
            <i class="fas fa-magic mr-1.5"></i>Optimize Portfolio
          </button>
        </div>
      </div>
    </div>
    <div id="portfolioResults" class="space-y-4"></div>
  </div>

  <!-- AI Analyst Tab -->
  <div id="content-ai" class="space-y-4 hidden">
    <div class="glass-card rounded-xl p-5">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-neon-purple flex items-center justify-center">
          <i class="fas fa-robot text-white text-lg"></i>
        </div>
        <div>
          <h2 class="text-sm font-bold text-white">TrendOracle AI Analyst</h2>
          <p class="text-[10px] text-dark-300">Powered by GPT — Deep market analysis with actionable insights</p>
        </div>
      </div>
      <div class="flex gap-3">
        <input id="aiQuestion" type="text" placeholder="Ask about any asset... e.g. 'What's the outlook for NVDA next month?'" 
          class="flex-1 bg-dark-700/50 border border-dark-400/30 rounded-lg px-4 py-2.5 text-xs text-white placeholder-dark-300 focus:outline-none focus:border-accent-500/50"
          onkeydown="if(event.key==='Enter')askAI()">
        <button onclick="askAI()" class="px-5 py-2.5 rounded-lg bg-gradient-to-r from-accent-500 to-neon-purple text-white text-xs font-semibold hover:opacity-90 transition glow">
          <i class="fas fa-paper-plane mr-1.5"></i>Analyze
        </button>
      </div>
    </div>
    <div id="aiResults" class="space-y-4"></div>
  </div>

</main>
</div>

<script>
// ============================================================
// APPLICATION STATE
// ============================================================
const state = {
  currentSymbol: 'AAPL',
  timeframe: 180,
  assets: {},
  categories: {},
  marketData: null,
  predictions: null,
  charts: {},
  activeTab: 'dashboard',
  categoryFilter: 'All',
}

// ============================================================
// INITIALIZATION
// ============================================================
async function init() {
  updateClock()
  setInterval(updateClock, 1000)
  
  const res = await fetch('/api/assets')
  const data = await res.json()
  state.assets = data.assets
  state.categories = data.categories
  
  renderAssetList()
  populatePortfolioSelector()
  setupEventListeners()
  
  await selectAsset('AAPL')
  loadScanner()
}

function updateClock() {
  const now = new Date()
  document.getElementById('clock').textContent = now.toLocaleTimeString('en-US', { hour12: false })
}

function setupEventListeners() {
  document.getElementById('assetSearch').addEventListener('input', (e) => {
    renderAssetList(e.target.value)
  })
  
  document.querySelectorAll('.category-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'))
      chip.classList.add('active')
      state.categoryFilter = chip.dataset.cat
      renderAssetList()
    })
  });
  
  ['show-sma', 'show-bb', 'show-vol', 'show-fib'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => renderCharts())
  })
}

// ============================================================
// ASSET LIST RENDERING
// ============================================================
function renderAssetList(search = '') {
  const container = document.getElementById('assetList')
  const filter = state.categoryFilter
  let html = ''
  
  for (const [sym, asset] of Object.entries(state.assets)) {
    if (filter !== 'All' && asset.category !== filter) continue
    if (search && !sym.toLowerCase().includes(search.toLowerCase()) && !asset.name.toLowerCase().includes(search.toLowerCase())) continue
    
    const isActive = sym === state.currentSymbol
    const price = asset.currentPrice || asset.basePrice
    const chg = asset.changePercent || 0
    const isUp = chg >= 0
    const priceStr = asset.category === 'Forex' ? price.toFixed(4) : '$' + price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
    
    html += \`<div class="sidebar-item flex items-center justify-between \${isActive ? 'active bg-accent-500/10 border border-accent-500/20' : ''}" onclick="selectAsset('\${sym}')">
      <div>
        <div class="text-xs font-semibold text-white">\${sym}</div>
        <div class="text-[10px] text-dark-300 truncate" style="max-width:120px">\${asset.name}</div>
      </div>
      <div class="text-right">
        <div class="text-[10px] font-mono text-dark-100">\${priceStr}</div>
        <div class="text-[10px] font-mono \${isUp ? 'text-neon-green' : 'text-neon-red'}">\${isUp ? '+' : ''}\${chg.toFixed(2)}%</div>
      </div>
    </div>\`
  }
  container.innerHTML = html
}

function populatePortfolioSelector() {
  const sel = document.getElementById('portfolioAssets')
  let html = ''
  for (const [sym, asset] of Object.entries(state.assets)) {
    const selected = ['AAPL','MSFT','GOOGL','BTC','GOLD','SPX'].includes(sym) ? 'selected' : ''
    html += \`<option value="\${sym}" \${selected}>\${sym} - \${asset.name} (\${asset.category})</option>\`
  }
  sel.innerHTML = html
}

// ============================================================
// MAIN DATA LOADING
// ============================================================
async function selectAsset(symbol) {
  state.currentSymbol = symbol
  renderAssetList()
  
  const res = await fetch(\`/api/market/\${symbol}?days=365\`)
  state.marketData = await res.json()
  
  // Update the sidebar price for this asset with fresh data
  if (state.assets[symbol] && state.marketData.summary) {
    state.assets[symbol].currentPrice = state.marketData.summary.currentPrice
    state.assets[symbol].changePercent = state.marketData.summary.changePercent
    renderAssetList()
  }
  
  renderTopStats()
  renderCharts()
  renderFibTable()
  
  if (state.activeTab === 'predictions') loadPredictions()
}

async function loadPredictions() {
  const days = document.getElementById('forecastDays').value
  const res = await fetch(\`/api/predict/\${state.currentSymbol}?days=\${days}\`)
  state.predictions = await res.json()
  renderPredictions()
}

async function loadScanner() {
  const container = document.getElementById('scannerTable')
  container.innerHTML = '<div class="loading-shimmer h-40 rounded-lg"></div>'
  
  const res = await fetch('/api/scanner')
  const data = await res.json()
  
  // Update sidebar prices from scanner data (most comprehensive source)
  for (const item of data.scanner) {
    if (state.assets[item.symbol]) {
      state.assets[item.symbol].currentPrice = item.price
      state.assets[item.symbol].changePercent = item.change
    }
  }
  renderAssetList()
  renderScanner(data.scanner)
}

// ============================================================
// TOP STATS
// ============================================================
function renderTopStats() {
  const d = state.marketData
  if (!d) return
  const s = d.summary
  const a = d.asset
  const isUp = s.changePercent >= 0
  
  const rsiVal = d.indicators.rsi.filter(v => v !== null).pop() || 0
  const rsiColor = rsiVal > 70 ? 'text-neon-red' : rsiVal < 30 ? 'text-neon-green' : 'text-neon-yellow'
  const rsiLabel = rsiVal > 70 ? 'Overbought' : rsiVal < 30 ? 'Oversold' : 'Neutral'
  
  document.getElementById('topStats').innerHTML = \`
    <div class="glass-card rounded-xl p-3 stat-card" style="--accent-color: \${isUp ? '#22c55e' : '#ef4444'}">
      <div class="text-[10px] text-dark-300">Price</div>
      <div class="text-lg font-bold text-white font-mono">\${a.category === 'Forex' ? s.currentPrice.toFixed(4) : '$'+s.currentPrice.toLocaleString()}</div>
      <div class="text-xs font-semibold \${isUp ? 'text-neon-green' : 'text-neon-red'}">
        <i class="fas fa-\${isUp ? 'caret-up' : 'caret-down'} mr-0.5"></i>\${isUp ? '+' : ''}\${s.changePercent}%
      </div>
    </div>
    <div class="glass-card rounded-xl p-3 stat-card" style="--accent-color: #6366f1">
      <div class="text-[10px] text-dark-300">52W Range</div>
      <div class="text-xs font-mono text-dark-200 mt-1">\${s.low52w.toLocaleString()} — \${s.high52w.toLocaleString()}</div>
      <div class="w-full bg-dark-600 rounded-full h-1.5 mt-1.5">
        <div class="progress-bar h-1.5 rounded-full" style="width:\${((s.currentPrice-s.low52w)/(s.high52w-s.low52w)*100).toFixed(0)}%"></div>
      </div>
    </div>
    <div class="glass-card rounded-xl p-3 stat-card" style="--accent-color: \${rsiVal > 70 ? '#ef4444' : rsiVal < 30 ? '#22c55e' : '#eab308'}">
      <div class="text-[10px] text-dark-300">RSI (14)</div>
      <div class="text-lg font-bold \${rsiColor} font-mono">\${rsiVal.toFixed(1)}</div>
      <div class="text-[10px] text-dark-300">\${rsiLabel}</div>
    </div>
    <div class="glass-card rounded-xl p-3 stat-card" style="--accent-color: #a855f7">
      <div class="text-[10px] text-dark-300">Volatility</div>
      <div class="text-lg font-bold text-neon-purple font-mono">\${(a.volatility * Math.sqrt(252) * 100).toFixed(1)}%</div>
      <div class="text-[10px] text-dark-300">Annualized</div>
    </div>
    <div class="glass-card rounded-xl p-3 stat-card" style="--accent-color: #06b6d4">
      <div class="text-[10px] text-dark-300">Beta</div>
      <div class="text-lg font-bold text-neon-cyan font-mono">\${a.beta}</div>
      <div class="text-[10px] text-dark-300">vs Market</div>
    </div>
    <div class="glass-card rounded-xl p-3 stat-card" style="--accent-color: #3b82f6">
      <div class="text-[10px] text-dark-300">Avg Volume</div>
      <div class="text-sm font-bold text-neon-blue font-mono">\${(s.avgVolume/1e6).toFixed(2)}M</div>
      <div class="text-[10px] text-dark-300">20-day avg</div>
    </div>
  \`
}

// ============================================================
// CHARTS
// ============================================================
function renderCharts() {
  if (!state.marketData) return
  const d = state.marketData
  const tf = state.timeframe
  const data = d.data.slice(-tf)
  const closes = data.map(d => d.close)
  const labels = data.map(d => d.date)
  const ind = d.indicators
  
  // Destroy existing charts
  Object.values(state.charts).forEach(c => c?.destroy?.())
  
  // === MAIN PRICE CHART ===
  const showSMA = document.getElementById('show-sma').checked
  const showBB = document.getElementById('show-bb').checked
  const showVol = document.getElementById('show-vol').checked
  
  const datasets = [{
    label: d.asset.symbol + ' Price',
    data: closes,
    borderColor: '#818cf8',
    backgroundColor: 'rgba(129, 140, 248, 0.05)',
    borderWidth: 2,
    fill: true,
    pointRadius: 0,
    tension: 0.1,
    yAxisID: 'y',
  }]
  
  if (showSMA) {
    datasets.push({
      label: 'SMA 20', data: ind.sma20.slice(-tf), borderColor: '#22c55e',
      borderWidth: 1, pointRadius: 0, borderDash: [4, 2], yAxisID: 'y',
    })
    datasets.push({
      label: 'SMA 50', data: ind.sma50.slice(-tf), borderColor: '#eab308',
      borderWidth: 1, pointRadius: 0, borderDash: [4, 2], yAxisID: 'y',
    })
  }
  
  if (showBB) {
    datasets.push({
      label: 'BB Upper', data: ind.bollinger.upper.slice(-tf), borderColor: 'rgba(6,182,212,0.5)',
      borderWidth: 1, pointRadius: 0, fill: false, yAxisID: 'y',
    })
    datasets.push({
      label: 'BB Lower', data: ind.bollinger.lower.slice(-tf), borderColor: 'rgba(6,182,212,0.5)',
      borderWidth: 1, pointRadius: 0, fill: '-1', backgroundColor: 'rgba(6,182,212,0.05)', yAxisID: 'y',
    })
  }
  
  if (showVol) {
    datasets.push({
      label: 'Volume', data: data.map(d => d.volume), type: 'bar',
      backgroundColor: data.map((d, i) => i > 0 && d.close >= data[i-1].close ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'),
      yAxisID: 'y1', barPercentage: 0.8,
    })
  }
  
  const priceCtx = document.getElementById('priceChart').getContext('2d')
  
  // Fibonacci annotations
  const annotations = {}
  if (document.getElementById('show-fib').checked) {
    const fib = ind.fibonacci
    const levels = [
      { val: fib.level0, label: '0%', color: '#ef4444' },
      { val: fib.level236, label: '23.6%', color: '#f97316' },
      { val: fib.level382, label: '38.2%', color: '#eab308' },
      { val: fib.level500, label: '50%', color: '#22c55e' },
      { val: fib.level618, label: '61.8%', color: '#06b6d4' },
      { val: fib.level786, label: '78.6%', color: '#8b5cf6' },
      { val: fib.level1, label: '100%', color: '#3b82f6' },
    ]
    levels.forEach((l, i) => {
      annotations['fib' + i] = {
        type: 'line', yMin: l.val, yMax: l.val,
        borderColor: l.color + '66', borderWidth: 1, borderDash: [6, 3],
        label: { display: true, content: l.label + ' (' + l.val.toFixed(2) + ')', position: 'end',
          backgroundColor: l.color + '33', color: l.color, font: { size: 9 } }
      }
    })
  }
  
  state.charts.price = new Chart(priceCtx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: true, position: 'top', labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 12, padding: 10 } },
        tooltip: { backgroundColor: 'rgba(15,23,42,0.95)', titleColor: '#e2e8f0', bodyColor: '#94a3b8', borderColor: '#334155', borderWidth: 1, padding: 10, titleFont: { size: 11 }, bodyFont: { size: 10 } },
        annotation: { annotations }
      },
      scales: {
        x: { grid: { color: 'rgba(51,65,85,0.3)' }, ticks: { color: '#64748b', font: { size: 9 }, maxTicksLimit: 12 } },
        y: { position: 'right', grid: { color: 'rgba(51,65,85,0.3)' }, ticks: { color: '#64748b', font: { size: 9 } } },
        ...(showVol ? { y1: { position: 'left', grid: { display: false }, ticks: { display: false }, max: Math.max(...data.map(d => d.volume)) * 4 } } : {}),
      }
    }
  })
  
  document.getElementById('chartTitle').textContent = d.asset.name + ' (' + d.asset.symbol + ')'
  document.getElementById('chartSubtitle').textContent = d.asset.category + ' • ' + tf + ' days • Last: ' + (d.asset.category === 'Forex' ? d.summary.currentPrice.toFixed(4) : '$' + d.summary.currentPrice.toLocaleString())
  
  // === RSI CHART ===
  const rsiData = ind.rsi.slice(-tf)
  state.charts.rsi = new Chart(document.getElementById('rsiChart').getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: rsiData, borderColor: '#a855f7', borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.2,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        annotation: { annotations: {
          ob: { type: 'line', yMin: 70, yMax: 70, borderColor: '#ef444466', borderWidth: 1, borderDash: [4,2] },
          os: { type: 'line', yMin: 30, yMax: 30, borderColor: '#22c55e66', borderWidth: 1, borderDash: [4,2] },
        }}
      },
      scales: {
        x: { display: false },
        y: { min: 0, max: 100, grid: { color: 'rgba(51,65,85,0.2)' }, ticks: { color: '#64748b', font: { size: 9 }, stepSize: 20 } }
      }
    }
  })
  
  // === MACD CHART ===
  const macdH = ind.macd.histogram.slice(-tf)
  state.charts.macd = new Chart(document.getElementById('macdChart').getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { data: ind.macd.macdLine.slice(-tf), type: 'line', borderColor: '#3b82f6', borderWidth: 1.5, pointRadius: 0, order: 1 },
        { data: ind.macd.signal.slice(-tf), type: 'line', borderColor: '#ef4444', borderWidth: 1, pointRadius: 0, borderDash: [3,2], order: 2 },
        { data: macdH, backgroundColor: macdH.map(v => v >= 0 ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'), order: 3 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { grid: { color: 'rgba(51,65,85,0.2)' }, ticks: { color: '#64748b', font: { size: 9 } } } }
    }
  })
  
  // === STOCHASTIC CHART ===
  state.charts.stoch = new Chart(document.getElementById('stochChart').getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: '%K', data: ind.stochastic.k.slice(-tf), borderColor: '#06b6d4', borderWidth: 1.5, pointRadius: 0, tension: 0.2 },
        { label: '%D', data: ind.stochastic.d.slice(-tf), borderColor: '#f97316', borderWidth: 1, pointRadius: 0, tension: 0.2, borderDash: [3,2] },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        annotation: { annotations: {
          ob: { type: 'line', yMin: 80, yMax: 80, borderColor: '#ef444466', borderWidth: 1, borderDash: [4,2] },
          os: { type: 'line', yMin: 20, yMax: 20, borderColor: '#22c55e66', borderWidth: 1, borderDash: [4,2] },
        }}
      },
      scales: { x: { display: false }, y: { min: 0, max: 100, grid: { color: 'rgba(51,65,85,0.2)' }, ticks: { color: '#64748b', font: { size: 9 }, stepSize: 20 } } }
    }
  })
}

function setTimeframe(days) {
  state.timeframe = days
  document.querySelectorAll('.tf-btn').forEach(btn => {
    btn.className = 'tf-btn text-[10px] px-2.5 py-1 rounded ' + (parseInt(btn.textContent.replace('M','').replace('Y','')) === (days <= 90 ? days/30 : days/365) ? 'bg-accent-500/30 text-accent-400 border border-accent-500/30' : 'bg-dark-600/50 text-dark-200 hover:bg-accent-500/20')
  })
  renderCharts()
}

function renderFibTable() {
  if (!state.marketData) return
  const fib = state.marketData.indicators.fibonacci
  const levels = [
    { label: '0% (High)', val: fib.level0, color: '#ef4444' },
    { label: '23.6%', val: fib.level236, color: '#f97316' },
    { label: '38.2%', val: fib.level382, color: '#eab308' },
    { label: '50%', val: fib.level500, color: '#22c55e' },
    { label: '61.8%', val: fib.level618, color: '#06b6d4' },
    { label: '78.6%', val: fib.level786, color: '#8b5cf6' },
    { label: '100% (Low)', val: fib.level1, color: '#3b82f6' },
  ]
  
  document.getElementById('fibTable').innerHTML = levels.map(l => \`
    <div class="bg-dark-700/30 rounded-lg p-2.5 border-l-2" style="border-color:\${l.color}">
      <div class="text-[10px] text-dark-300">\${l.label}</div>
      <div class="text-sm font-mono font-bold text-white">\${l.val.toLocaleString()}</div>
    </div>
  \`).join('')
}

// ============================================================
// PREDICTIONS RENDERING
// ============================================================
function renderPredictions() {
  if (!state.predictions) return
  const p = state.predictions
  const cs = p.compositeScore
  
  const scoreColor = cs.score >= 70 ? '#22c55e' : cs.score >= 55 ? '#3b82f6' : cs.score >= 45 ? '#eab308' : '#ef4444'
  
  document.getElementById('compositeSection').innerHTML = \`
    <div class="flex flex-col md:flex-row items-center gap-6">
      <div class="flex-shrink-0 text-center">
        <div class="relative w-32 h-32">
          <svg class="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" stroke="#1e293b" stroke-width="8" fill="none"/>
            <circle cx="60" cy="60" r="52" stroke="\${scoreColor}" stroke-width="8" fill="none"
              stroke-dasharray="\${cs.score * 3.27} 327" stroke-linecap="round"/>
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-2xl font-bold text-white">\${cs.score}</span>
            <span class="text-[10px] text-dark-300">/ 100</span>
          </div>
        </div>
        <div class="mt-2 text-sm font-bold" style="color:\${scoreColor}">\${cs.recommendation}</div>
        <div class="text-[10px] text-dark-300">Confidence: \${cs.confidence}</div>
      </div>
      <div class="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
        <div class="bg-dark-700/30 rounded-lg p-3 text-center">
          <div class="text-[10px] text-dark-300 mb-1"><i class="fas fa-dice mr-1 text-neon-purple"></i>Monte Carlo</div>
          <div class="text-xl font-bold text-white">\${cs.breakdown.monteCarlo}</div>
          <div class="w-full bg-dark-600 rounded-full h-1.5 mt-1"><div class="h-1.5 rounded-full bg-neon-purple" style="width:\${cs.breakdown.monteCarlo}%"></div></div>
        </div>
        <div class="bg-dark-700/30 rounded-lg p-3 text-center">
          <div class="text-[10px] text-dark-300 mb-1"><i class="fas fa-chart-line mr-1 text-neon-blue"></i>Regression</div>
          <div class="text-xl font-bold text-white">\${cs.breakdown.regression}</div>
          <div class="w-full bg-dark-600 rounded-full h-1.5 mt-1"><div class="h-1.5 rounded-full bg-neon-blue" style="width:\${cs.breakdown.regression}%"></div></div>
        </div>
        <div class="bg-dark-700/30 rounded-lg p-3 text-center">
          <div class="text-[10px] text-dark-300 mb-1"><i class="fas fa-magnet mr-1 text-neon-cyan"></i>Mean Reversion</div>
          <div class="text-xl font-bold text-white">\${cs.breakdown.meanReversion}</div>
          <div class="w-full bg-dark-600 rounded-full h-1.5 mt-1"><div class="h-1.5 rounded-full bg-neon-cyan" style="width:\${cs.breakdown.meanReversion}%"></div></div>
        </div>
        <div class="bg-dark-700/30 rounded-lg p-3 text-center">
          <div class="text-[10px] text-dark-300 mb-1"><i class="fas fa-bolt mr-1 text-neon-yellow"></i>Momentum</div>
          <div class="text-xl font-bold text-white">\${cs.breakdown.momentum}</div>
          <div class="w-full bg-dark-600 rounded-full h-1.5 mt-1"><div class="h-1.5 rounded-full bg-neon-yellow" style="width:\${cs.breakdown.momentum}%"></div></div>
        </div>
      </div>
    </div>
  \`
  
  // Prediction Charts
  renderPredictionCharts(p)
}

function renderPredictionCharts(p) {
  ['mc','lr','mr','mom'].forEach(k => state.charts[k]?.destroy?.())
  
  const mc = p.models.monteCarlo
  const lr = p.models.linearRegression
  const mr = p.models.meanReversion
  const mom = p.models.momentum
  const days = mc.predictions.map(d => 'D' + d.day)
  
  // Monte Carlo
  state.charts.mc = new Chart(document.getElementById('mcChart').getContext('2d'), {
    type: 'line',
    data: {
      labels: days,
      datasets: [
        { label: 'P95 (Bull)', data: mc.predictions.map(d => d.p95), borderColor: '#22c55e44', backgroundColor: 'rgba(34,197,94,0.05)', fill: true, pointRadius: 0, borderWidth: 1 },
        { label: 'P75', data: mc.predictions.map(d => d.p75), borderColor: '#3b82f644', backgroundColor: 'rgba(59,130,246,0.05)', fill: true, pointRadius: 0, borderWidth: 1 },
        { label: 'Median', data: mc.predictions.map(d => d.median), borderColor: '#818cf8', borderWidth: 2, pointRadius: 0, fill: false },
        { label: 'P25', data: mc.predictions.map(d => d.p25), borderColor: '#f9731644', backgroundColor: 'rgba(249,115,22,0.05)', fill: true, pointRadius: 0, borderWidth: 1 },
        { label: 'P5 (Bear)', data: mc.predictions.map(d => d.p5), borderColor: '#ef444444', backgroundColor: 'rgba(239,68,68,0.05)', fill: true, pointRadius: 0, borderWidth: 1 },
      ]
    },
    options: chartOptions()
  })
  
  document.getElementById('mcStats').innerHTML = miniStats([
    { label: 'Expected Return', value: mc.statistics.expectedReturn + '%', color: mc.statistics.expectedReturn >= 0 ? 'text-neon-green' : 'text-neon-red' },
    { label: 'Bull Probability', value: mc.statistics.bullishProbability + '%', color: 'text-neon-blue' },
    { label: 'Sharpe Ratio', value: mc.statistics.sharpeRatio, color: 'text-neon-purple' },
  ])
  
  // Linear Regression
  state.charts.lr = new Chart(document.getElementById('lrChart').getContext('2d'), {
    type: 'line',
    data: {
      labels: days,
      datasets: [
        { label: 'Upper 95%', data: lr.predictions.map(d => d.upper), borderColor: '#22c55e33', backgroundColor: 'rgba(34,197,94,0.05)', fill: true, pointRadius: 0, borderWidth: 1 },
        { label: 'Predicted', data: lr.predictions.map(d => d.predicted), borderColor: '#3b82f6', borderWidth: 2, pointRadius: 0, fill: false },
        { label: 'Lower 95%', data: lr.predictions.map(d => d.lower), borderColor: '#ef444433', backgroundColor: 'rgba(239,68,68,0.05)', fill: true, pointRadius: 0, borderWidth: 1 },
      ]
    },
    options: chartOptions()
  })
  
  document.getElementById('lrStats').innerHTML = miniStats([
    { label: 'Trend', value: lr.trendDirection, color: lr.trendDirection === 'Bullish' ? 'text-neon-green' : 'text-neon-red' },
    { label: 'R² Score', value: lr.rSquared, color: 'text-neon-cyan' },
    { label: 'Daily Δ', value: '$' + lr.dailyChange, color: 'text-neon-blue' },
  ])
  
  // Mean Reversion
  state.charts.mr = new Chart(document.getElementById('mrChart').getContext('2d'), {
    type: 'line',
    data: {
      labels: days,
      datasets: [
        { label: 'Predicted', data: mr.predictions.map(d => d.predicted), borderColor: '#06b6d4', borderWidth: 2, pointRadius: 0, fill: false },
        { label: 'Mean Level', data: mr.predictions.map(d => d.meanLevel), borderColor: '#eab30866', borderWidth: 1, borderDash: [5,3], pointRadius: 0, fill: false },
      ]
    },
    options: chartOptions()
  })
  
  document.getElementById('mrStats').innerHTML = miniStats([
    { label: 'Signal', value: mr.signal.split(' - ')[0], color: mr.signal.includes('Buy') ? 'text-neon-green' : mr.signal.includes('Sell') ? 'text-neon-red' : 'text-neon-yellow' },
    { label: 'Deviation', value: mr.deviationPercent + '%', color: 'text-neon-cyan' },
    { label: 'Mean Price', value: '$' + mr.meanLevel.toLocaleString(), color: 'text-neon-blue' },
  ])
  
  // Momentum
  state.charts.mom = new Chart(document.getElementById('momChart').getContext('2d'), {
    type: 'line',
    data: {
      labels: days,
      datasets: [
        { label: 'Momentum Forecast', data: mom.predictions.map(d => d.predicted), borderColor: '#eab308', borderWidth: 2, pointRadius: 0, fill: false, backgroundColor: 'rgba(234,179,8,0.05)' },
      ]
    },
    options: chartOptions()
  })
  
  document.getElementById('momStats').innerHTML = miniStats([
    { label: 'Signal', value: mom.signal, color: mom.signal.includes('Buy') ? 'text-neon-green' : mom.signal.includes('Sell') ? 'text-neon-red' : 'text-neon-yellow' },
    { label: 'Score', value: mom.momentumScore, color: 'text-neon-purple' },
    { label: 'RSI', value: mom.indicators.rsi, color: mom.indicators.rsi > 70 ? 'text-neon-red' : mom.indicators.rsi < 30 ? 'text-neon-green' : 'text-neon-yellow' },
  ])
}

function chartOptions() {
  return {
    responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { display: true, position: 'top', labels: { color: '#94a3b8', font: { size: 9 }, boxWidth: 10, padding: 8 } },
      tooltip: { backgroundColor: 'rgba(15,23,42,0.95)', titleColor: '#e2e8f0', bodyColor: '#94a3b8', borderColor: '#334155', borderWidth: 1 }
    },
    scales: {
      x: { grid: { color: 'rgba(51,65,85,0.2)' }, ticks: { color: '#64748b', font: { size: 8 }, maxTicksLimit: 8 } },
      y: { position: 'right', grid: { color: 'rgba(51,65,85,0.2)' }, ticks: { color: '#64748b', font: { size: 9 } } }
    }
  }
}

function miniStats(items) {
  return items.map(i => \`
    <div class="bg-dark-700/30 rounded-lg p-2 text-center">
      <div class="text-[10px] text-dark-300">\${i.label}</div>
      <div class="text-sm font-bold \${i.color} font-mono">\${i.value}</div>
    </div>
  \`).join('')
}

// ============================================================
// SCANNER
// ============================================================
function renderScanner(scanner) {
  const container = document.getElementById('scannerTable')
  container.innerHTML = \`
    <table class="w-full text-xs">
      <thead>
        <tr class="text-dark-300 border-b border-dark-400/30">
          <th class="text-left py-2 px-2">Rank</th>
          <th class="text-left py-2 px-2">Asset</th>
          <th class="text-left py-2 px-2">Category</th>
          <th class="text-right py-2 px-2">Price</th>
          <th class="text-right py-2 px-2">Change</th>
          <th class="text-center py-2 px-2">AI Score</th>
          <th class="text-center py-2 px-2">Signal</th>
          <th class="text-right py-2 px-2">Expected</th>
          <th class="text-right py-2 px-2">Bull %</th>
          <th class="text-right py-2 px-2">Volatility</th>
        </tr>
      </thead>
      <tbody>
        \${scanner.map((s, i) => {
          const isUp = s.change >= 0
          const scoreColor = s.compositeScore >= 70 ? 'text-neon-green' : s.compositeScore >= 55 ? 'text-neon-blue' : s.compositeScore >= 45 ? 'text-neon-yellow' : 'text-neon-red'
          const sigColor = s.recommendation.includes('BUY') ? 'bg-green-500/20 text-neon-green border-green-500/30' : s.recommendation.includes('SELL') ? 'bg-red-500/20 text-neon-red border-red-500/30' : 'bg-yellow-500/20 text-neon-yellow border-yellow-500/30'
          return \`<tr class="border-b border-dark-400/10 hover:bg-dark-600/30 cursor-pointer transition" onclick="selectAsset('\${s.symbol}');switchTab('dashboard')">
            <td class="py-2.5 px-2 font-mono text-dark-300">#\${i+1}</td>
            <td class="py-2.5 px-2"><span class="font-semibold text-white">\${s.symbol}</span> <span class="text-dark-300">\${s.name}</span></td>
            <td class="py-2.5 px-2 text-dark-200">\${s.category}</td>
            <td class="py-2.5 px-2 text-right font-mono text-white">\${s.category === 'Forex' ? s.price.toFixed(4) : '$'+s.price.toLocaleString()}</td>
            <td class="py-2.5 px-2 text-right font-mono \${isUp ? 'text-neon-green' : 'text-neon-red'}">\${isUp ? '+' : ''}\${s.change}%</td>
            <td class="py-2.5 px-2 text-center"><span class="font-bold \${scoreColor}">\${s.compositeScore}</span></td>
            <td class="py-2.5 px-2 text-center"><span class="text-[10px] px-2 py-0.5 rounded-full border \${sigColor}">\${s.recommendation}</span></td>
            <td class="py-2.5 px-2 text-right font-mono \${s.expectedReturn >= 0 ? 'text-neon-green' : 'text-neon-red'}">\${s.expectedReturn > 0 ? '+' : ''}\${s.expectedReturn}%</td>
            <td class="py-2.5 px-2 text-right font-mono text-neon-blue">\${s.bullishProbability}%</td>
            <td class="py-2.5 px-2 text-right font-mono text-neon-purple">\${s.volatility}%</td>
          </tr>\`
        }).join('')}
      </tbody>
    </table>
  \`
}

// ============================================================
// PORTFOLIO
// ============================================================
async function optimizePortfolio() {
  const sel = document.getElementById('portfolioAssets')
  const symbols = Array.from(sel.selectedOptions).map(o => o.value)
  if (symbols.length < 2) { alert('Select at least 2 assets'); return }
  
  const risk = document.getElementById('riskSlider').value / 100
  const container = document.getElementById('portfolioResults')
  container.innerHTML = '<div class="loading-shimmer h-60 rounded-xl"></div>'
  
  const res = await fetch('/api/portfolio/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbols, riskTolerance: risk })
  })
  const data = await res.json()
  
  // Allocation chart
  const alloc = data.allocations
  const port = data.portfolio
  const corr = data.correlationMatrix
  
  container.innerHTML = \`
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="glass-card rounded-xl p-4">
        <h3 class="text-sm font-semibold text-white mb-3"><i class="fas fa-chart-pie mr-1.5 text-accent-400"></i>Optimized Allocation</h3>
        <div style="height:240px"><canvas id="allocChart"></canvas></div>
      </div>
      <div class="glass-card rounded-xl p-4">
        <h3 class="text-sm font-semibold text-white mb-3"><i class="fas fa-chart-bar mr-1.5 text-neon-cyan"></i>Portfolio Metrics</h3>
        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="bg-dark-700/30 rounded-lg p-3 text-center">
            <div class="text-[10px] text-dark-300">Expected Return</div>
            <div class="text-xl font-bold \${port.expectedReturn >= 0 ? 'text-neon-green' : 'text-neon-red'}">\${port.expectedReturn}%</div>
          </div>
          <div class="bg-dark-700/30 rounded-lg p-3 text-center">
            <div class="text-[10px] text-dark-300">Volatility</div>
            <div class="text-xl font-bold text-neon-purple">\${port.volatility}%</div>
          </div>
          <div class="bg-dark-700/30 rounded-lg p-3 text-center">
            <div class="text-[10px] text-dark-300">Sharpe Ratio</div>
            <div class="text-xl font-bold text-neon-cyan">\${port.sharpeRatio}</div>
          </div>
          <div class="bg-dark-700/30 rounded-lg p-3 text-center">
            <div class="text-[10px] text-dark-300">Diversification</div>
            <div class="text-xl font-bold text-accent-400">\${port.diversificationScore}%</div>
          </div>
        </div>
        <div class="space-y-1.5">
          \${alloc.map(a => \`
            <div class="flex items-center gap-2 text-xs">
              <span class="w-14 font-semibold text-white">\${a.symbol}</span>
              <div class="flex-1 bg-dark-600 rounded-full h-2">
                <div class="progress-bar h-2 rounded-full" style="width:\${a.weight}%"></div>
              </div>
              <span class="w-12 text-right font-mono text-dark-200">\${a.weight}%</span>
            </div>
          \`).join('')}
        </div>
      </div>
    </div>
    <div class="glass-card rounded-xl p-4">
      <h3 class="text-sm font-semibold text-white mb-3"><i class="fas fa-table mr-1.5 text-neon-yellow"></i>Correlation Matrix</h3>
      <div class="overflow-x-auto">
        <table class="text-[10px]">
          <tr><td class="p-1"></td>\${corr.symbols.map(s => '<td class="p-1 text-center font-semibold text-dark-200">'+s+'</td>').join('')}</tr>
          \${corr.matrix.map((row, i) => \`<tr>
            <td class="p-1 font-semibold text-dark-200">\${corr.symbols[i]}</td>
            \${row.map(v => {
              const bg = v > 0.5 ? 'bg-red-500/30' : v > 0.2 ? 'bg-orange-500/20' : v > -0.2 ? 'bg-dark-600/50' : v > -0.5 ? 'bg-blue-500/20' : 'bg-blue-500/30'
              return '<td class="p-1"><div class="correlation-cell '+bg+'">'+v+'</div></td>'
            }).join('')}
          </tr>\`).join('')}
        </table>
      </div>
    </div>
  \`
  
  // Pie chart
  const colors = ['#818cf8','#22c55e','#ef4444','#eab308','#06b6d4','#a855f7','#f97316','#3b82f6','#ec4899','#14b8a6']
  state.charts.alloc?.destroy?.()
  state.charts.alloc = new Chart(document.getElementById('allocChart').getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: alloc.map(a => a.symbol),
      datasets: [{ data: alloc.map(a => a.weight), backgroundColor: colors.slice(0, alloc.length), borderColor: '#0f172a', borderWidth: 2 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 10, padding: 6 } } },
      cutout: '55%'
    }
  })
}

// ============================================================
// AI ANALYST
// ============================================================
async function askAI() {
  const question = document.getElementById('aiQuestion').value
  const symbol = state.currentSymbol
  const container = document.getElementById('aiResults')
  
  container.innerHTML = \`
    <div class="glass-card rounded-xl p-5 animate-fadeIn">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-accent-500/20 flex items-center justify-center">
          <i class="fas fa-spinner fa-spin text-accent-400"></i>
        </div>
        <div>
          <div class="text-sm font-semibold text-white">Analyzing \${symbol}...</div>
          <div class="text-[10px] text-dark-300">Running multi-model analysis with AI interpretation</div>
        </div>
      </div>
      <div class="mt-3 loading-shimmer h-40 rounded-lg"></div>
    </div>
  \`
  
  try {
    const res = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, question })
    })
    const data = await res.json()
    
    if (data.error) {
      container.innerHTML = \`<div class="glass-card rounded-xl p-5 border-red-500/30"><div class="text-neon-red text-sm"><i class="fas fa-exclamation-triangle mr-2"></i>\${data.error}</div></div>\`
      return
    }
    
    const cs = data.dataUsed.compositeScore
    const scoreColor = cs.score >= 70 ? '#22c55e' : cs.score >= 55 ? '#3b82f6' : cs.score >= 45 ? '#eab308' : '#ef4444'
    
    // Simple markdown rendering
    let html = data.analysis
      .replace(/### (.*?)\\n/g, '<h3>$1</h3>')
      .replace(/## (.*?)\\n/g, '<h2>$1</h2>')
      .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
      .replace(/\\*(.*?)\\*/g, '<em>$1</em>')
      .replace(/- (.*?)\\n/g, '<li>$1</li>')
      .replace(/\\n/g, '<br>')
    
    container.innerHTML = \`
      <div class="glass-card rounded-xl p-5 animate-slideUp">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-500 to-neon-purple flex items-center justify-center">
              <i class="fas fa-brain text-white text-sm"></i>
            </div>
            <div>
              <div class="text-sm font-semibold text-white">AI Analysis: \${symbol}</div>
              <div class="text-[10px] text-dark-300">\${new Date().toLocaleString()}</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold" style="color:\${scoreColor}">Score: \${cs.score}/100</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full border" style="color:\${scoreColor};border-color:\${scoreColor}40">\${cs.recommendation}</span>
          </div>
        </div>
        <div class="markdown-content text-sm text-dark-100 leading-relaxed">\${html}</div>
      </div>
    \`
  } catch(e) {
    container.innerHTML = \`<div class="glass-card rounded-xl p-5 border-red-500/30"><div class="text-neon-red text-sm"><i class="fas fa-exclamation-triangle mr-2"></i>Failed to get AI analysis. Please try again.</div></div>\`
  }
}

// ============================================================
// TAB SWITCHING
// ============================================================
function switchTab(tab) {
  state.activeTab = tab
  document.querySelectorAll('[id^="content-"]').forEach(el => el.classList.add('hidden'))
  document.getElementById('content-' + tab).classList.remove('hidden')
  
  document.querySelectorAll('[id^="tab-"]').forEach(btn => {
    btn.className = btn.id === 'tab-' + tab ?
      'tab-active text-xs px-4 py-2 rounded-lg font-medium transition-all' :
      'text-xs px-4 py-2 rounded-lg font-medium text-dark-200 bg-dark-600/50 border border-dark-400/30 hover:bg-dark-500/50 transition-all'
  })
  
  if (tab === 'predictions' && !state.predictions) loadPredictions()
}

// Start
init()
</script>
</body>
</html>`)
})

export default app
