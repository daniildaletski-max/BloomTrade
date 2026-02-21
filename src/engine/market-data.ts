// ============================================================
// MARKET DATA ENGINE - Realistic market data generation
// ============================================================

import type { AssetConfig, Candle } from '../lib/types'
import { DAY_MS, DEFAULT_MARKET_DAYS, CACHE_MAX_SIZE, CACHE_TTL_MS } from '../lib/constants'
import { seededRandom } from '../lib/utils'
import { LRUCache } from '../lib/cache'

// ============================================================
// ASSET CONFIGURATION
// ============================================================

export const ASSETS: Record<string, AssetConfig> = {
  // Stocks
  AAPL: { name: 'Apple Inc.', symbol: 'AAPL', category: 'Stocks', basePrice: 198.5, volatility: 0.022, trend: 0.0003, beta: 1.2, dividendYield: 0.005, sector: 'Technology' },
  MSFT: { name: 'Microsoft Corp.', symbol: 'MSFT', category: 'Stocks', basePrice: 415.8, volatility: 0.020, trend: 0.0004, beta: 1.1, dividendYield: 0.008, sector: 'Technology' },
  GOOGL: { name: 'Alphabet Inc.', symbol: 'GOOGL', category: 'Stocks', basePrice: 175.2, volatility: 0.024, trend: 0.0003, beta: 1.15, dividendYield: 0.0, sector: 'Technology' },
  AMZN: { name: 'Amazon.com', symbol: 'AMZN', category: 'Stocks', basePrice: 205.7, volatility: 0.026, trend: 0.0004, beta: 1.3, dividendYield: 0.0, sector: 'Technology' },
  TSLA: { name: 'Tesla Inc.', symbol: 'TSLA', category: 'Stocks', basePrice: 245.3, volatility: 0.042, trend: 0.0002, beta: 1.8, dividendYield: 0.0, sector: 'Automotive' },
  NVDA: { name: 'NVIDIA Corp.', symbol: 'NVDA', category: 'Stocks', basePrice: 875.4, volatility: 0.035, trend: 0.0006, beta: 1.6, dividendYield: 0.001, sector: 'Technology' },
  JPM: { name: 'JPMorgan Chase', symbol: 'JPM', category: 'Stocks', basePrice: 198.6, volatility: 0.018, trend: 0.0002, beta: 1.05, dividendYield: 0.025, sector: 'Finance' },
  V: { name: 'Visa Inc.', symbol: 'V', category: 'Stocks', basePrice: 282.1, volatility: 0.016, trend: 0.0003, beta: 0.95, dividendYield: 0.007, sector: 'Finance' },

  // Crypto
  BTC: { name: 'Bitcoin', symbol: 'BTC', category: 'Crypto', basePrice: 97500, volatility: 0.038, trend: 0.0005, beta: 2.0, dividendYield: 0.0 },
  ETH: { name: 'Ethereum', symbol: 'ETH', category: 'Crypto', basePrice: 3420, volatility: 0.045, trend: 0.0004, beta: 2.2, dividendYield: 0.0 },
  SOL: { name: 'Solana', symbol: 'SOL', category: 'Crypto', basePrice: 198, volatility: 0.055, trend: 0.0006, beta: 2.5, dividendYield: 0.0 },
  BNB: { name: 'Binance Coin', symbol: 'BNB', category: 'Crypto', basePrice: 615, volatility: 0.035, trend: 0.0003, beta: 1.8, dividendYield: 0.0 },

  // Commodities
  GOLD: { name: 'Gold', symbol: 'GOLD', category: 'Commodities', basePrice: 2045, volatility: 0.012, trend: 0.0002, beta: 0.3, dividendYield: 0.0 },
  SILVER: { name: 'Silver', symbol: 'SILVER', category: 'Commodities', basePrice: 24.8, volatility: 0.018, trend: 0.0001, beta: 0.5, dividendYield: 0.0 },
  OIL: { name: 'Crude Oil WTI', symbol: 'OIL', category: 'Commodities', basePrice: 78.5, volatility: 0.025, trend: -0.0001, beta: 0.8, dividendYield: 0.0 },
  NATGAS: { name: 'Natural Gas', symbol: 'NATGAS', category: 'Commodities', basePrice: 2.85, volatility: 0.035, trend: -0.0002, beta: 0.7, dividendYield: 0.0 },

  // Forex
  EURUSD: { name: 'EUR/USD', symbol: 'EURUSD', category: 'Forex', basePrice: 1.0875, volatility: 0.006, trend: 0.00001, beta: 0.2, dividendYield: 0.0 },
  GBPUSD: { name: 'GBP/USD', symbol: 'GBPUSD', category: 'Forex', basePrice: 1.268, volatility: 0.007, trend: 0.00002, beta: 0.25, dividendYield: 0.0 },
  USDJPY: { name: 'USD/JPY', symbol: 'USDJPY', category: 'Forex', basePrice: 149.5, volatility: 0.008, trend: 0.0001, beta: 0.3, dividendYield: 0.0 },

  // Indices
  SPX: { name: 'S&P 500', symbol: 'SPX', category: 'Indices', basePrice: 5088, volatility: 0.012, trend: 0.0003, beta: 1.0, dividendYield: 0.014 },
  NDX: { name: 'NASDAQ 100', symbol: 'NDX', category: 'Indices', basePrice: 17985, volatility: 0.016, trend: 0.0004, beta: 1.2, dividendYield: 0.007 },
  DJI: { name: 'Dow Jones', symbol: 'DJI', category: 'Indices', basePrice: 38654, volatility: 0.01, trend: 0.0002, beta: 0.9, dividendYield: 0.018 },
}

// ============================================================
// DATA GENERATION
// ============================================================

export function generateHistoricalData(asset: AssetConfig, days: number = DEFAULT_MARKET_DAYS): Candle[] {
  const now = Date.now()
  const seedBase = asset.symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + Math.floor(now / DAY_MS)
  const rand = seededRandom(seedBase)

  const data: Candle[] = []
  let price = asset.basePrice * (0.92 + rand() * 0.16)
  let volume = 1000000 + rand() * 5000000

  for (let i = days; i >= 0; i--) {
    const date = new Date(now - i * DAY_MS)
    if (date.getDay() === 0 || date.getDay() === 6) {
      if (asset.category !== 'Crypto' && asset.category !== 'Forex') continue
    }

    const drift = asset.trend + (rand() - 0.5) * 0.001
    const shock = (rand() - 0.5) * 2 * asset.volatility
    const meanReversion = ((asset.basePrice - price) / asset.basePrice) * 0.008

    const returnVal = drift + shock + meanReversion
    price = price * (1 + returnVal)

    const dayVol = asset.volatility * (0.5 + rand() * 1.5)
    const open = price * (1 + (rand() - 0.5) * dayVol * 0.5)
    const high = Math.max(open, price) * (1 + rand() * dayVol * 0.3)
    const low = Math.min(open, price) * (1 - rand() * dayVol * 0.3)

    volume = volume * (0.8 + rand() * 0.4)

    const decimals = asset.basePrice < 10 ? 4 : 2

    data.push({
      date: date.toISOString().split('T')[0],
      timestamp: date.getTime(),
      open: +open.toFixed(decimals),
      high: +high.toFixed(decimals),
      low: +low.toFixed(decimals),
      close: +price.toFixed(decimals),
      volume: Math.round(volume),
    })
  }
  return data
}

// ============================================================
// CACHE
// ============================================================

const historyCache = new LRUCache<Candle[]>(CACHE_MAX_SIZE, CACHE_TTL_MS)

export function getHistoricalData(asset: AssetConfig, days: number): Candle[] {
  const normalizedDays = Math.max(2, days)
  const seedDay = Math.floor(Date.now() / DAY_MS)
  const key = `${asset.symbol}:${normalizedDays}:${seedDay}`

  const cached = historyCache.get(key)
  if (cached) return cached

  const generated = generateHistoricalData(asset, normalizedDays)
  historyCache.set(key, generated)

  return generated
}

export function getCacheSize(): number {
  return historyCache.size
}
