# TrendOracle AI - Multi-Algorithm Market Prediction Platform

## Project Overview
- **Name**: TrendOracle AI
- **Goal**: Powerful market prediction and trend analysis platform combining multiple quantitative algorithms with AI-powered analysis
- **Stack**: Hono + TypeScript + Cloudflare Pages + Chart.js + TailwindCSS + GPT AI

## Features

### ✅ Completed Features
1. **Multi-Asset Coverage** - 22 assets across 5 categories (Stocks, Crypto, Commodities, Forex, Indices)
2. **Interactive Price Charts** - Full OHLCV data with toggleable overlays (SMA, Bollinger Bands, Volume, Fibonacci)
3. **Technical Indicators** - RSI, MACD, Stochastic Oscillator, ATR, EMA, SMA, Bollinger Bands
4. **4 Prediction Models**:
   - Monte Carlo Simulation (500 paths with percentile bands)
   - Linear Regression Forecast (with 95% confidence interval)
   - Mean Reversion Model (half-life convergence)
   - Momentum Analysis (RSI/MACD/Stochastic composite)
5. **AI Composite Score** - Weighted combination of all 4 models (0-100 scale)
6. **Market Scanner** - Ranks all 22 assets by AI score with key metrics
7. **Portfolio Optimizer** - Multi-asset allocation with correlation matrix, risk slider, Sharpe ratio
8. **AI Analyst** - GPT-powered deep analysis with specific price targets and actionable recommendations
9. **Fibonacci Retracement** - 7-level retracement displayed on chart and in data table
10. **Premium Dark Theme UI** - Glassmorphism, neon accents, smooth animations

### API Endpoints
| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Main application dashboard |
| `/api/assets` | GET | All available assets and categories |
| `/api/market/:symbol` | GET | Historical data + technical indicators (`?days=365`) |
| `/api/predict/:symbol` | GET | All prediction models + composite score (`?days=30`) |
| `/api/scanner` | GET | Market scanner with ranked opportunities |
| `/api/portfolio/optimize` | POST | Portfolio optimization (`{ symbols, riskTolerance }`) |
| `/api/ai/analyze` | POST | AI analysis (`{ symbol, question }`) |
| `/api/compare` | POST | Compare multiple assets (`{ symbols }`) |

## URLs
- **GitHub**: https://github.com/daniildaletski-max/BloomTrade
- **Live**: https://3000-ifdlfy2s374s35nt5wxwl-2e1b9533.sandbox.novita.ai

## Data Architecture
- **Market Data**: Deterministic seeded PRNG-based realistic market simulation
- **Technical Indicators**: Calculated in real-time (SMA, EMA, RSI, MACD, Bollinger, ATR, Stochastic, Fibonacci)
- **Prediction Engine**: 4 statistical models running server-side
- **AI Integration**: OpenAI-compatible API for deep analysis

## User Guide
1. **Browse Assets** - Use the sidebar to search/filter assets by category
2. **Dashboard** - View price charts with technical indicators (toggle SMA, Bollinger, Volume, Fibonacci)
3. **Predictions** - Switch to Predictions tab to see all 4 models with AI composite score
4. **Scanner** - Market Scanner ranks all assets by opportunity score
5. **Portfolio** - Select multiple assets, adjust risk tolerance, get optimized allocation
6. **AI Analyst** - Ask questions about any asset for GPT-powered analysis

## Deployment
- **Platform**: Cloudflare Pages
- **Status**: ✅ Active (Local Development)
- **Tech Stack**: Hono + TypeScript + Chart.js + TailwindCSS + OpenAI API
- **Last Updated**: 2026-02-21
