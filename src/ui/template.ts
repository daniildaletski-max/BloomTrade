// ============================================================
// MAIN HTML TEMPLATE
// Enhanced with: mobile sidebar, comparison tab, accessibility
// ============================================================

import { getStyles } from './styles'
import { getClientScript } from './scripts'

export function getPageHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="TrendOracle AI - Multi-algorithm market prediction platform with Monte Carlo simulation, linear regression, mean reversion, and momentum analysis.">
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
${getStyles()}
</style>
</head>
<body class="bg-dark-900 text-dark-100 font-sans min-h-screen">

<!-- Skip to main content for accessibility -->
<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:bg-accent-500 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg">Skip to main content</a>

<!-- Top Navigation Bar -->
<nav class="glass sticky top-0 z-50 px-4 py-3 flex items-center justify-between" role="navigation" aria-label="Main navigation">
  <div class="flex items-center gap-3">
    <!-- Mobile menu button -->
    <button onclick="toggleSidebar()" class="md:hidden w-9 h-9 rounded-lg bg-dark-600/50 flex items-center justify-center text-dark-200 hover:text-white transition" aria-label="Toggle asset sidebar" aria-expanded="false">
      <i class="fas fa-bars text-sm"></i>
    </button>
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
      <span class="w-2 h-2 rounded-full bg-neon-green pulse-dot" aria-hidden="true"></span>
      <span>Live</span>
    </div>
    <div id="clock" class="text-xs font-mono text-dark-300" aria-live="off"></div>
  </div>
</nav>

<!-- Mobile sidebar overlay -->
<div id="sidebarOverlay" class="sidebar-overlay" aria-hidden="true"></div>

<div class="flex h-[calc(100vh-57px)]">

<!-- Sidebar - Asset Browser -->
<aside id="sidebar" class="w-64 glass border-r border-dark-400/30 overflow-y-auto flex-shrink-0 p-3" role="listbox" aria-label="Asset browser">
  <div class="mb-3">
    <div class="relative">
      <i class="fas fa-search absolute left-3 top-2.5 text-dark-300 text-xs" aria-hidden="true"></i>
      <input id="assetSearch" type="text" placeholder="Search assets..."
        class="w-full bg-dark-700/50 border border-dark-400/30 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-dark-300 focus:outline-none focus:border-accent-500/50"
        aria-label="Search assets">
    </div>
  </div>
  <div id="categoryFilters" class="flex flex-wrap gap-1.5 mb-3" role="radiogroup" aria-label="Filter by category">
    <span class="category-chip active text-[10px] px-2 py-1 rounded-full border border-dark-400/30 text-dark-200" data-cat="All" role="radio" aria-checked="true" tabindex="0">All</span>
    <span class="category-chip text-[10px] px-2 py-1 rounded-full border border-dark-400/30 text-dark-200" data-cat="Stocks" role="radio" aria-checked="false" tabindex="0">Stocks</span>
    <span class="category-chip text-[10px] px-2 py-1 rounded-full border border-dark-400/30 text-dark-200" data-cat="Crypto" role="radio" aria-checked="false" tabindex="0">Crypto</span>
    <span class="category-chip text-[10px] px-2 py-1 rounded-full border border-dark-400/30 text-dark-200" data-cat="Commodities" role="radio" aria-checked="false" tabindex="0">Commodities</span>
    <span class="category-chip text-[10px] px-2 py-1 rounded-full border border-dark-400/30 text-dark-200" data-cat="Forex" role="radio" aria-checked="false" tabindex="0">Forex</span>
    <span class="category-chip text-[10px] px-2 py-1 rounded-full border border-dark-400/30 text-dark-200" data-cat="Indices" role="radio" aria-checked="false" tabindex="0">Indices</span>
  </div>
  <div id="assetList" class="space-y-1"></div>
</aside>

<!-- Main Content -->
<main id="main-content" class="flex-1 overflow-y-auto p-4 space-y-4">

  <!-- Top Stats Bar -->
  <div id="topStats" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3"></div>

  <!-- Navigation Tabs -->
  <div class="flex gap-2 flex-wrap" role="tablist" aria-label="View tabs">
    <button onclick="switchTab('dashboard')" id="tab-dashboard" class="tab-active text-xs px-4 py-2 rounded-lg font-medium transition-all" role="tab" aria-selected="true" aria-controls="content-dashboard"><i class="fas fa-chart-line mr-1.5" aria-hidden="true"></i>Dashboard</button>
    <button onclick="switchTab('predictions')" id="tab-predictions" class="text-xs px-4 py-2 rounded-lg font-medium text-dark-200 bg-dark-600/50 border border-dark-400/30 hover:bg-dark-500/50 transition-all" role="tab" aria-selected="false" aria-controls="content-predictions"><i class="fas fa-wand-magic-sparkles mr-1.5" aria-hidden="true"></i>Predictions</button>
    <button onclick="switchTab('scanner')" id="tab-scanner" class="text-xs px-4 py-2 rounded-lg font-medium text-dark-200 bg-dark-600/50 border border-dark-400/30 hover:bg-dark-500/50 transition-all" role="tab" aria-selected="false" aria-controls="content-scanner"><i class="fas fa-crosshairs mr-1.5" aria-hidden="true"></i>Scanner</button>
    <button onclick="switchTab('portfolio')" id="tab-portfolio" class="text-xs px-4 py-2 rounded-lg font-medium text-dark-200 bg-dark-600/50 border border-dark-400/30 hover:bg-dark-500/50 transition-all" role="tab" aria-selected="false" aria-controls="content-portfolio"><i class="fas fa-wallet mr-1.5" aria-hidden="true"></i>Portfolio</button>
    <button onclick="switchTab('compare')" id="tab-compare" class="text-xs px-4 py-2 rounded-lg font-medium text-dark-200 bg-dark-600/50 border border-dark-400/30 hover:bg-dark-500/50 transition-all" role="tab" aria-selected="false" aria-controls="content-compare"><i class="fas fa-columns mr-1.5" aria-hidden="true"></i>Compare</button>
    <button onclick="switchTab('ai')" id="tab-ai" class="text-xs px-4 py-2 rounded-lg font-medium text-dark-200 bg-dark-600/50 border border-dark-400/30 hover:bg-dark-500/50 transition-all" role="tab" aria-selected="false" aria-controls="content-ai"><i class="fas fa-robot mr-1.5" aria-hidden="true"></i>AI Analyst</button>
  </div>

  <!-- Dashboard Tab -->
  <div id="content-dashboard" class="space-y-4" role="tabpanel" aria-labelledby="tab-dashboard">
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
      <div style="height:360px"><canvas id="priceChart" aria-label="Price chart for selected asset"></canvas></div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div class="glass-card rounded-xl p-4">
        <h3 class="text-xs font-semibold text-dark-200 mb-2"><i class="fas fa-wave-square mr-1 text-accent-400" aria-hidden="true"></i>RSI (14)</h3>
        <div style="height:140px"><canvas id="rsiChart" aria-label="RSI indicator chart"></canvas></div>
      </div>
      <div class="glass-card rounded-xl p-4">
        <h3 class="text-xs font-semibold text-dark-200 mb-2"><i class="fas fa-chart-bar mr-1 text-neon-cyan" aria-hidden="true"></i>MACD</h3>
        <div style="height:140px"><canvas id="macdChart" aria-label="MACD indicator chart"></canvas></div>
      </div>
      <div class="glass-card rounded-xl p-4">
        <h3 class="text-xs font-semibold text-dark-200 mb-2"><i class="fas fa-gauge-high mr-1 text-neon-purple" aria-hidden="true"></i>Stochastic</h3>
        <div style="height:140px"><canvas id="stochChart" aria-label="Stochastic oscillator chart"></canvas></div>
      </div>
    </div>

    <div class="glass-card rounded-xl p-4">
      <h3 class="text-sm font-semibold text-white mb-3"><i class="fas fa-layer-group mr-1 text-neon-yellow" aria-hidden="true"></i>Fibonacci Retracement Levels & Key Metrics</h3>
      <div id="fibTable" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2"></div>
    </div>
  </div>

  <!-- Predictions Tab -->
  <div id="content-predictions" class="space-y-4 hidden" role="tabpanel" aria-labelledby="tab-predictions">
    <div class="flex items-center gap-3 mb-2">
      <span class="text-xs text-dark-200">Forecast Period:</span>
      <select id="forecastDays" onchange="loadPredictions()" class="bg-dark-700/50 border border-dark-400/30 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent-500/50" aria-label="Forecast period">
        <option value="7">7 Days</option>
        <option value="14">14 Days</option>
        <option value="30" selected>30 Days</option>
        <option value="60">60 Days</option>
        <option value="90">90 Days</option>
      </select>
    </div>
    <div id="compositeSection" class="glass-card rounded-xl p-5"></div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="glass-card rounded-xl p-4">
        <h3 class="text-sm font-semibold text-white mb-1"><i class="fas fa-dice mr-1.5 text-neon-purple" aria-hidden="true"></i>Monte Carlo Simulation</h3>
        <p class="text-[10px] text-dark-300 mb-3">500 probabilistic price paths with confidence intervals</p>
        <div style="height:280px"><canvas id="mcChart" aria-label="Monte Carlo simulation chart"></canvas></div>
        <div id="mcStats" class="mt-3 grid grid-cols-3 gap-2"></div>
      </div>
      <div class="glass-card rounded-xl p-4">
        <h3 class="text-sm font-semibold text-white mb-1"><i class="fas fa-chart-line mr-1.5 text-neon-blue" aria-hidden="true"></i>Linear Regression Forecast</h3>
        <p class="text-[10px] text-dark-300 mb-3">Trend-based projection with 95% confidence band</p>
        <div style="height:280px"><canvas id="lrChart" aria-label="Linear regression forecast chart"></canvas></div>
        <div id="lrStats" class="mt-3 grid grid-cols-3 gap-2"></div>
      </div>
      <div class="glass-card rounded-xl p-4">
        <h3 class="text-sm font-semibold text-white mb-1"><i class="fas fa-magnet mr-1.5 text-neon-cyan" aria-hidden="true"></i>Mean Reversion Model</h3>
        <p class="text-[10px] text-dark-300 mb-3">Price convergence toward statistical mean</p>
        <div style="height:280px"><canvas id="mrChart" aria-label="Mean reversion model chart"></canvas></div>
        <div id="mrStats" class="mt-3 grid grid-cols-3 gap-2"></div>
      </div>
      <div class="glass-card rounded-xl p-4">
        <h3 class="text-sm font-semibold text-white mb-1"><i class="fas fa-bolt mr-1.5 text-neon-yellow" aria-hidden="true"></i>Momentum Analysis</h3>
        <p class="text-[10px] text-dark-300 mb-3">RSI, MACD, Stochastic composite momentum</p>
        <div style="height:280px"><canvas id="momChart" aria-label="Momentum analysis chart"></canvas></div>
        <div id="momStats" class="mt-3 grid grid-cols-3 gap-2"></div>
      </div>
    </div>
  </div>

  <!-- Scanner Tab -->
  <div id="content-scanner" class="space-y-4 hidden" role="tabpanel" aria-labelledby="tab-scanner">
    <div class="glass-card rounded-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-bold text-white"><i class="fas fa-satellite-dish mr-1.5 text-accent-400" aria-hidden="true"></i>Market Opportunity Scanner</h2>
        <button onclick="loadScanner()" class="text-[10px] px-3 py-1.5 rounded-lg bg-accent-500/20 text-accent-400 border border-accent-500/30 hover:bg-accent-500/30 transition">
          <i class="fas fa-sync mr-1" aria-hidden="true"></i>Refresh
        </button>
      </div>
      <div id="scannerTable" class="overflow-x-auto"></div>
    </div>
  </div>

  <!-- Portfolio Tab -->
  <div id="content-portfolio" class="space-y-4 hidden" role="tabpanel" aria-labelledby="tab-portfolio">
    <div class="glass-card rounded-xl p-4">
      <h2 class="text-sm font-bold text-white mb-3"><i class="fas fa-sliders mr-1.5 text-accent-400" aria-hidden="true"></i>Portfolio Optimizer</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="portfolioAssets" class="text-xs text-dark-200 block mb-1.5">Select Assets (hold Ctrl/Cmd for multiple)</label>
          <select id="portfolioAssets" multiple class="w-full bg-dark-700/50 border border-dark-400/30 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-500/50" style="height:200px" aria-label="Select assets for portfolio"></select>
        </div>
        <div class="space-y-4">
          <div>
            <label for="riskSlider" class="text-xs text-dark-200 block mb-1.5">Risk Tolerance</label>
            <input type="range" id="riskSlider" min="0" max="100" value="50" class="w-full accent-accent-500" oninput="document.getElementById('riskVal').textContent=this.value+'%'" aria-label="Risk tolerance slider">
            <div class="flex justify-between text-[10px] text-dark-300 mt-1">
              <span>Conservative</span>
              <span id="riskVal" class="text-accent-400 font-semibold" aria-live="polite">50%</span>
              <span>Aggressive</span>
            </div>
          </div>
          <button onclick="optimizePortfolio()" class="w-full py-2.5 rounded-lg bg-gradient-to-r from-accent-500 to-neon-purple text-white text-xs font-semibold hover:opacity-90 transition glow">
            <i class="fas fa-magic mr-1.5" aria-hidden="true"></i>Optimize Portfolio
          </button>
        </div>
      </div>
    </div>
    <div id="portfolioResults" class="space-y-4"></div>
  </div>

  <!-- Compare Tab (NEW) -->
  <div id="content-compare" class="space-y-4 hidden" role="tabpanel" aria-labelledby="tab-compare">
    <div class="glass-card rounded-xl p-4">
      <h2 class="text-sm font-bold text-white mb-3"><i class="fas fa-columns mr-1.5 text-accent-400" aria-hidden="true"></i>Asset Comparison</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="compareAssets" class="text-xs text-dark-200 block mb-1.5">Select 2-4 Assets to Compare</label>
          <select id="compareAssets" multiple class="w-full bg-dark-700/50 border border-dark-400/30 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-500/50" style="height:200px" aria-label="Select assets to compare"></select>
        </div>
        <div class="flex items-end">
          <button onclick="runComparison()" class="w-full py-2.5 rounded-lg bg-gradient-to-r from-accent-500 to-neon-cyan text-white text-xs font-semibold hover:opacity-90 transition glow">
            <i class="fas fa-columns mr-1.5" aria-hidden="true"></i>Compare Assets
          </button>
        </div>
      </div>
    </div>
    <div id="compareResults" class="space-y-4"></div>
  </div>

  <!-- AI Analyst Tab -->
  <div id="content-ai" class="space-y-4 hidden" role="tabpanel" aria-labelledby="tab-ai">
    <div class="glass-card rounded-xl p-5">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-neon-purple flex items-center justify-center">
          <i class="fas fa-robot text-white text-lg" aria-hidden="true"></i>
        </div>
        <div>
          <h2 class="text-sm font-bold text-white">TrendOracle AI Analyst</h2>
          <p class="text-[10px] text-dark-300">Powered by GPT -- Deep market analysis with actionable insights</p>
        </div>
      </div>
      <div class="flex gap-3">
        <input id="aiQuestion" type="text" placeholder="Ask about any asset... e.g. 'What's the outlook for NVDA next month?'"
          class="flex-1 bg-dark-700/50 border border-dark-400/30 rounded-lg px-4 py-2.5 text-xs text-white placeholder-dark-300 focus:outline-none focus:border-accent-500/50"
          onkeydown="if(event.key==='Enter')askAI()" aria-label="Ask AI analyst a question" maxlength="500">
        <button onclick="askAI()" class="px-5 py-2.5 rounded-lg bg-gradient-to-r from-accent-500 to-neon-purple text-white text-xs font-semibold hover:opacity-90 transition glow">
          <i class="fas fa-paper-plane mr-1.5" aria-hidden="true"></i>Analyze
        </button>
      </div>
    </div>
    <div id="aiResults" class="space-y-4"></div>
  </div>

</main>
</div>

<script>
${getClientScript()}
</script>
</body>
</html>`
}
