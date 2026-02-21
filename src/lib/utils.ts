// ============================================================
// UTILITY FUNCTIONS
// ============================================================

import type { JsonObject, AssetConfig } from './types'
import { MAX_SYMBOL_LENGTH, MAX_SYMBOLS_ARRAY } from './constants'

export function parseClampedInt(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number.parseInt(value ?? '', 10)
  if (Number.isNaN(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}

export function parseRiskTolerance(value: unknown, fallback = 0.5): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.max(0, Math.min(1, value))
}

export function normalizeSymbols(
  value: unknown,
  assets: Record<string, AssetConfig>,
  minCount: number = 1
): string[] | null {
  if (!Array.isArray(value)) return null
  const symbols = Array.from(
    new Set(
      value
        .slice(0, MAX_SYMBOLS_ARRAY)
        .filter((v): v is string => typeof v === 'string' && v.length <= MAX_SYMBOL_LENGTH)
        .map((v) => v.trim().toUpperCase())
        .filter((v) => Boolean(assets[v]))
    )
  )

  return symbols.length >= minCount ? symbols : null
}

export async function safeReadJson(c: { req: { json: () => Promise<unknown> } }): Promise<JsonObject | null> {
  try {
    const result = await c.req.json()
    if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
      return result as JsonObject
    }
    return null
  } catch {
    return null
  }
}

/**
 * Seeded pseudo-random number generator for deterministic market data.
 * Uses a linear congruential generator.
 */
export function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

/**
 * Sanitize user input by trimming and limiting length.
 */
export function sanitizeInput(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}
