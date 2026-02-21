// ============================================================
// PORTFOLIO OPTIMIZATION ENGINE
// ============================================================

import type { AssetConfig, PortfolioResult } from '../lib/types'
import { ASSETS, getHistoricalData } from './market-data'

export function optimizePortfolio(symbols: string[], riskTolerance: number = 0.5): PortfolioResult | { error: string } {
  const assetData: {
    symbol: string
    name: string
    annualReturn: number
    annualVolatility: number
    sharpe: number
    currentPrice: number
  }[] = []
  const returns: number[][] = []

  for (const sym of symbols) {
    const asset: AssetConfig | undefined = ASSETS[sym]
    if (!asset) continue
    const data = getHistoricalData(asset, 252)
    const closes = data.map((d) => d.close)
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

  // Generate optimized weights based on risk tolerance
  const n = assetData.length
  if (n === 0) return { error: 'No valid assets' }

  const weights: number[] = assetData.map((a) => {
    const returnWeight = a.annualReturn
    const riskPenalty = a.annualVolatility * (1 - riskTolerance)
    return Math.max(0.02, returnWeight - riskPenalty + 5)
  })

  const totalWeight = weights.reduce((a, b) => a + b, 0)
  const normalizedWeights = weights.map((w) => +(w / totalWeight * 100).toFixed(1))

  // Portfolio metrics
  const portReturn = assetData.reduce((sum, a, i) => sum + (a.annualReturn * normalizedWeights[i]) / 100, 0)
  const portVol = Math.sqrt(assetData.reduce((sum, a, i) => sum + Math.pow((a.annualVolatility * normalizedWeights[i]) / 100, 2), 0))

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
      symbols: symbols.filter((s) => ASSETS[s]),
      matrix: correlations,
    },
    riskTolerance,
  }
}
