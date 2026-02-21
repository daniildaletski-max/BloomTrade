// ============================================================
// SHARED TYPES
// ============================================================

export type Bindings = {
  OPENAI_API_KEY: string
  OPENAI_BASE_URL: string
}

export interface AssetConfig {
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

export interface Candle {
  date: string
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type JsonObject = Record<string, unknown>

export interface CompositeScore {
  score: number
  recommendation: string
  confidence: string
  breakdown: {
    monteCarlo: number
    regression: number
    meanReversion: number
    momentum: number
  }
}

export interface MonteCarloResult {
  predictions: {
    day: number
    p5: number
    p25: number
    median: number
    p75: number
    p95: number
    mean: number
  }[]
  statistics: {
    expectedReturn: number
    maxUpside: number
    maxDownside: number
    volatility: number
    bullishProbability: number
    sharpeRatio: number
    simulations: number
  }
}

export interface LinearRegressionResult {
  predictions: {
    day: number
    predicted: number
    upper: number
    lower: number
  }[]
  slope: number
  intercept: number
  rSquared: number
  trendDirection: string
  dailyChange: number
}

export interface MeanReversionResult {
  predictions: {
    day: number
    predicted: number
    meanLevel: number
  }[]
  currentDeviation: number
  meanLevel: number
  sma50: number
  signal: string
  deviationPercent: number
}

export interface MomentumResult {
  predictions: {
    day: number
    predicted: number
  }[]
  momentumScore: number
  signal: string
  indicators: {
    rsi: number
    rsiSignal: string
    macdHistogram: number
    macdSignal: string
    stochasticK: number
    stochasticSignal: string
  }
}

export interface MACDResult {
  macdLine: (number | null)[]
  signal: (number | null)[]
  histogram: (number | null)[]
}

export interface BollingerResult {
  middle: (number | null)[]
  upper: (number | null)[]
  lower: (number | null)[]
}

export interface StochasticResult {
  k: (number | null)[]
  d: (number | null)[]
}

export interface FibonacciResult {
  level0: number
  level236: number
  level382: number
  level500: number
  level618: number
  level786: number
  level1: number
}

export interface PortfolioAllocation {
  symbol: string
  name: string
  annualReturn: number
  annualVolatility: number
  sharpe: number
  currentPrice: number
  weight: number
}

export interface PortfolioResult {
  allocations: PortfolioAllocation[]
  portfolio: {
    expectedReturn: number
    volatility: number
    sharpeRatio: number
    diversificationScore: number
  }
  correlationMatrix: {
    symbols: string[]
    matrix: number[][]
  }
  riskTolerance: number
}

export interface ScannerItem {
  symbol: string
  name: string
  category: string
  price: number
  change: number
  compositeScore: number
  recommendation: string
  confidence: string
  expectedReturn: number
  bullishProbability: number
  volatility: number
}

export interface RateLimitEntry {
  count: number
  resetAt: number
}
