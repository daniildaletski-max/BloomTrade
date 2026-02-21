// ============================================================
// SHARED CONSTANTS
// ============================================================

export const DAY_MS = 86400000
export const DEFAULT_MARKET_DAYS = 365
export const DEFAULT_PREDICT_DAYS = 30
export const MAX_MARKET_DAYS = 3650
export const MAX_FORECAST_DAYS = 365

// Input validation limits
export const MAX_SYMBOL_LENGTH = 10
export const MAX_QUESTION_LENGTH = 500
export const MAX_SYMBOLS_ARRAY = 20

// Cache settings
export const CACHE_MAX_SIZE = 512
export const CACHE_TTL_MS = DAY_MS // 24 hours
export const SCANNER_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// Rate limiting (requests per window)
export const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
export const RATE_LIMITS = {
  ai: 5,
  portfolio: 10,
  scanner: 10,
  default: 30,
} as const

// AI fetch timeout
export const AI_FETCH_TIMEOUT_MS = 15_000

// App version
export const APP_VERSION = '2.0.0'
