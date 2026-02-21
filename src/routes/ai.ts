// ============================================================
// ROUTE: POST /api/ai/analyze
// With input validation, API key protection, and timeout
// ============================================================

import { Hono } from 'hono'
import type { Bindings } from '../lib/types'
import { MAX_SYMBOL_LENGTH, MAX_QUESTION_LENGTH, AI_FETCH_TIMEOUT_MS } from '../lib/constants'
import { safeReadJson, sanitizeInput } from '../lib/utils'
import { ASSETS, getHistoricalData } from '../engine/market-data'
import { calculateRSI } from '../engine/indicators'
import { calculateCompositeScore } from '../engine/predictions'
import { logger } from '../lib/logger'

const route = new Hono<{ Bindings: Bindings }>()

route.post('/analyze', async (c) => {
  const body = await safeReadJson(c)
  if (!body) return c.json({ error: 'Invalid JSON payload', code: 'INVALID_JSON' }, 400)

  const symbol = sanitizeInput(body.symbol, MAX_SYMBOL_LENGTH).toUpperCase()
  const question = sanitizeInput(body.question, MAX_QUESTION_LENGTH)

  const asset = ASSETS[symbol]
  if (!asset) return c.json({ error: 'Asset not found', code: 'ASSET_NOT_FOUND' }, 404)

  const data = getHistoricalData(asset, 90)
  const closes = data.map((d) => d.close)
  const last = closes[closes.length - 1]
  const lookback = Math.min(30, closes.length - 1)
  const referencePrice = closes[closes.length - 1 - lookback]
  const change30d = ((last - referencePrice) / referencePrice * 100).toFixed(2)
  const rsi = calculateRSI(closes).filter((v) => v !== null).pop()
  const composite = calculateCompositeScore(data, asset)

  const apiKey = c.env?.OPENAI_API_KEY || (typeof process !== 'undefined' ? process.env?.OPENAI_API_KEY : '')
  const baseUrl = c.env?.OPENAI_BASE_URL || (typeof process !== 'undefined' ? process.env?.OPENAI_BASE_URL : '')

  if (!apiKey || !baseUrl) {
    return c.json({ error: 'AI service not configured. The AI Analyst feature requires an API key.', code: 'AI_NOT_CONFIGURED' }, 503)
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
    logger.info('AI analysis requested', { symbol, hasQuestion: !!question })

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), AI_FETCH_TIMEOUT_MS)

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
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
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      // Sanitize error - never expose API key or raw upstream details
      logger.error('AI provider error', { status: response.status, symbol })
      return c.json({ error: `AI provider returned an error (status ${response.status}). Please try again later.`, code: 'AI_PROVIDER_ERROR' }, 502)
    }

    const result = (await response.json()) as { choices?: { message?: { content?: string } }[] }

    return c.json({
      analysis: result.choices?.[0]?.message?.content || 'Analysis unavailable',
      dataUsed: {
        currentPrice: last,
        change30d,
        rsi,
        compositeScore: composite,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error && err.name === 'AbortError'
      ? 'AI analysis timed out. Please try again.'
      : 'AI analysis failed. Please try again later.'
    logger.error('AI analysis failed', { symbol, error: message })
    return c.json({ error: message, code: 'AI_ANALYSIS_FAILED' }, 500)
  }
})

export default route
