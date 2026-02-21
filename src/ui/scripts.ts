// ============================================================
// CLIENT-SIDE JAVASCRIPT (extracted from inline template)
// Enhanced with: auto-refresh, comparison UI, toast system,
// keyboard nav, accessibility, retry logic
// ============================================================

export function getClientScript(): string {
  return `
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
  autoRefreshInterval: null,
  lastUpdated: null,
}

// ============================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer')
  if (!container) {
    container = document.createElement('div')
    container.id = 'toastContainer'
    container.className = 'toast-container'
    container.setAttribute('role', 'status')
    container.setAttribute('aria-live', 'polite')
    document.body.appendChild(container)
  }
  const toast = document.createElement('div')
  toast.className = 'toast toast-' + type
  toast.textContent = message
  container.appendChild(toast)
  setTimeout(() => toast.remove(), 3000)
}

// ============================================================
// FETCH WITH RETRY
// ============================================================
async function fetchWithRetry(url, options = {}, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, options)
      if (!res.ok && i < retries) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)))
        continue
      }
      return res
    } catch (err) {
      if (i === retries) throw err
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)))
    }
  }
}

// ============================================================
// INITIALIZATION
// ============================================================
async function init() {
  updateClock()
  setInterval(updateClock, 1000)

  try {
    const res = await fetchWithRetry('/api/assets')
    const data = await res.json()
    state.assets = data.assets
    state.categories = data.categories

    renderAssetList()
    populatePortfolioSelector()
    populateCompareSelector()
    setupEventListeners()

    await selectAsset('AAPL')
    loadScanner()

    // Auto-refresh every 60 seconds
    startAutoRefresh()
  } catch (err) {
    showToast('Failed to load initial data. Please refresh.', 'error')
  }
}

function updateClock() {
  const now = new Date()
  const el = document.getElementById('clock')
  if (el) el.textContent = now.toLocaleTimeString('en-US', { hour12: false })
}

function startAutoRefresh() {
  if (state.autoRefreshInterval) clearInterval(state.autoRefreshInterval)
  state.autoRefreshInterval = setInterval(async () => {
    if (state.activeTab === 'dashboard' && state.currentSymbol) {
      try {
        const res = await fetch('/api/market/' + state.currentSymbol + '?days=365')
        const newData = await res.json()
        const oldPrice = state.marketData?.summary?.currentPrice
        state.marketData = newData

        if (state.assets[state.currentSymbol] && newData.summary) {
          state.assets[state.currentSymbol].currentPrice = newData.summary.currentPrice
          state.assets[state.currentSymbol].changePercent = newData.summary.changePercent
        }

        state.lastUpdated = new Date()
        updateLastUpdated()
        renderTopStats()
        renderCharts()
        renderAssetList()

        // Flash green/red on price change
        if (oldPrice && oldPrice !== newData.summary.currentPrice) {
          const priceEl = document.querySelector('.stat-card')
          if (priceEl) {
            priceEl.classList.add(newData.summary.currentPrice > oldPrice ? 'price-flash-green' : 'price-flash-red')
            setTimeout(() => priceEl.classList.remove('price-flash-green', 'price-flash-red'), 600)
          }
        }
      } catch {}
    }
  }, 60000)
}

function updateLastUpdated() {
  const el = document.getElementById('lastUpdated')
  if (el && state.lastUpdated) {
    el.textContent = 'Updated: ' + state.lastUpdated.toLocaleTimeString('en-US', { hour12: false })
  }
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
    document.getElementById(id)?.addEventListener('change', () => renderCharts())
  })

  // Sidebar overlay for mobile
  const overlay = document.getElementById('sidebarOverlay')
  if (overlay) {
    overlay.addEventListener('click', () => toggleSidebar(false))
  }

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    // Number keys 1-5 for tabs
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      const tabMap = { '1': 'dashboard', '2': 'predictions', '3': 'scanner', '4': 'portfolio', '5': 'ai' }
      if (tabMap[e.key] && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'SELECT') {
        switchTab(tabMap[e.key])
        e.preventDefault()
      }
    }
  })
}

// ============================================================
// MOBILE SIDEBAR TOGGLE
// ============================================================
function toggleSidebar(forceOpen) {
  const sidebar = document.getElementById('sidebar')
  const overlay = document.getElementById('sidebarOverlay')
  const isOpen = sidebar.classList.contains('open')
  const shouldOpen = forceOpen !== undefined ? forceOpen : !isOpen

  if (shouldOpen) {
    sidebar.classList.add('open')
    overlay.classList.add('active')
  } else {
    sidebar.classList.remove('open')
    overlay.classList.remove('active')
  }
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

    html += '<div class="sidebar-item flex items-center justify-between ' + (isActive ? 'active bg-accent-500/10 border border-accent-500/20' : '') + '" onclick="selectAsset(\\'' + sym + '\\')" role="option" aria-selected="' + isActive + '" tabindex="0" onkeydown="if(event.key===\\'Enter\\')selectAsset(\\'' + sym + '\\')">'
    html += '<div><div class="text-xs font-semibold text-white">' + sym + '</div>'
    html += '<div class="text-[10px] text-dark-300 truncate" style="max-width:120px">' + asset.name + '</div></div>'
    html += '<div class="text-right"><div class="text-[10px] font-mono text-dark-100">' + priceStr + '</div>'
    html += '<div class="text-[10px] font-mono ' + (isUp ? 'text-neon-green' : 'text-neon-red') + '">' + (isUp ? '+' : '') + chg.toFixed(2) + '%</div></div></div>'
  }
  container.innerHTML = html
}

function populatePortfolioSelector() {
  const sel = document.getElementById('portfolioAssets')
  if (!sel) return
  let html = ''
  for (const [sym, asset] of Object.entries(state.assets)) {
    const selected = ['AAPL','MSFT','GOOGL','BTC','GOLD','SPX'].includes(sym) ? 'selected' : ''
    html += '<option value="' + sym + '" ' + selected + '>' + sym + ' - ' + asset.name + ' (' + asset.category + ')</option>'
  }
  sel.innerHTML = html
}

function populateCompareSelector() {
  const sel = document.getElementById('compareAssets')
  if (!sel) return
  let html = ''
  for (const [sym, asset] of Object.entries(state.assets)) {
    const selected = ['AAPL','MSFT','BTC','GOLD'].includes(sym) ? 'selected' : ''
    html += '<option value="' + sym + '" ' + selected + '>' + sym + ' - ' + asset.name + '</option>'
  }
  sel.innerHTML = html
}

// ============================================================
// MAIN DATA LOADING
// ============================================================
async function selectAsset(symbol) {
  state.currentSymbol = symbol
  renderAssetList()

  // Close mobile sidebar
  toggleSidebar(false)

  try {
    const res = await fetchWithRetry('/api/market/' + symbol + '?days=365')
    state.marketData = await res.json()

    if (state.assets[symbol] && state.marketData.summary) {
      state.assets[symbol].currentPrice = state.marketData.summary.currentPrice
      state.assets[symbol].changePercent = state.marketData.summary.changePercent
      renderAssetList()
    }

    state.lastUpdated = new Date()
    updateLastUpdated()
    renderTopStats()
    renderCharts()
    renderFibTable()

    if (state.activeTab === 'predictions') loadPredictions()
  } catch (err) {
    showToast('Failed to load data for ' + symbol, 'error')
  }
}

async function loadPredictions() {
  const days = document.getElementById('forecastDays').value
  try {
    const res = await fetchWithRetry('/api/predict/' + state.currentSymbol + '?days=' + days)
    state.predictions = await res.json()
    renderPredictions()
  } catch (err) {
    showToast('Failed to load predictions', 'error')
  }
}

async function loadScanner() {
  const container = document.getElementById('scannerTable')
  container.innerHTML = '<div class="loading-shimmer h-40 rounded-lg" role="status" aria-label="Loading scanner data"></div>'

  try {
    const res = await fetchWithRetry('/api/scanner')
    const data = await res.json()

    for (const item of data.scanner) {
      if (state.assets[item.symbol]) {
        state.assets[item.symbol].currentPrice = item.price
        state.assets[item.symbol].changePercent = item.change
      }
    }
    renderAssetList()
    renderScanner(data.scanner)
  } catch (err) {
    container.innerHTML = '<div class="text-center text-dark-300 py-8"><i class="fas fa-exclamation-triangle text-neon-yellow mr-2"></i>Failed to load scanner. <button onclick="loadScanner()" class="text-accent-400 underline ml-1">Retry</button></div>'
  }
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

  document.getElementById('topStats').innerHTML =
    '<div class="glass-card rounded-xl p-3 stat-card" style="--accent-color: ' + (isUp ? '#22c55e' : '#ef4444') + '">' +
      '<div class="text-[10px] text-dark-300">Price</div>' +
      '<div class="text-lg font-bold text-white font-mono">' + (a.category === 'Forex' ? s.currentPrice.toFixed(4) : '$'+s.currentPrice.toLocaleString()) + '</div>' +
      '<div class="text-xs font-semibold ' + (isUp ? 'text-neon-green' : 'text-neon-red') + '">' +
        '<i class="fas fa-' + (isUp ? 'caret-up' : 'caret-down') + ' mr-0.5"></i>' + (isUp ? '+' : '') + s.changePercent + '%' +
      '</div>' +
    '</div>' +
    '<div class="glass-card rounded-xl p-3 stat-card" style="--accent-color: #6366f1">' +
      '<div class="text-[10px] text-dark-300">52W Range</div>' +
      '<div class="text-xs font-mono text-dark-200 mt-1">' + s.low52w.toLocaleString() + ' — ' + s.high52w.toLocaleString() + '</div>' +
      '<div class="w-full bg-dark-600 rounded-full h-1.5 mt-1.5" role="progressbar" aria-valuenow="' + ((s.currentPrice-s.low52w)/(s.high52w-s.low52w)*100).toFixed(0) + '" aria-valuemin="0" aria-valuemax="100">' +
        '<div class="progress-bar h-1.5 rounded-full" style="width:' + ((s.currentPrice-s.low52w)/(s.high52w-s.low52w)*100).toFixed(0) + '%"></div>' +
      '</div>' +
    '</div>' +
    '<div class="glass-card rounded-xl p-3 stat-card" style="--accent-color: ' + (rsiVal > 70 ? '#ef4444' : rsiVal < 30 ? '#22c55e' : '#eab308') + '">' +
      '<div class="text-[10px] text-dark-300">RSI (14)</div>' +
      '<div class="text-lg font-bold ' + rsiColor + ' font-mono">' + rsiVal.toFixed(1) + '</div>' +
      '<div class="text-[10px] text-dark-300">' + rsiLabel + '</div>' +
    '</div>' +
    '<div class="glass-card rounded-xl p-3 stat-card" style="--accent-color: #a855f7">' +
      '<div class="text-[10px] text-dark-300">Volatility</div>' +
      '<div class="text-lg font-bold text-neon-purple font-mono">' + (a.volatility * Math.sqrt(252) * 100).toFixed(1) + '%</div>' +
      '<div class="text-[10px] text-dark-300">Annualized</div>' +
    '</div>' +
    '<div class="glass-card rounded-xl p-3 stat-card" style="--accent-color: #06b6d4">' +
      '<div class="text-[10px] text-dark-300">Beta</div>' +
      '<div class="text-lg font-bold text-neon-cyan font-mono">' + a.beta + '</div>' +
      '<div class="text-[10px] text-dark-300">vs Market</div>' +
    '</div>' +
    '<div class="glass-card rounded-xl p-3 stat-card" style="--accent-color: #3b82f6">' +
      '<div class="text-[10px] text-dark-300">Avg Volume</div>' +
      '<div class="text-sm font-bold text-neon-blue font-mono">' + (s.avgVolume/1e6).toFixed(2) + 'M</div>' +
      '<div class="text-[10px] text-dark-300" id="lastUpdated">20-day avg</div>' +
    '</div>'
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

  Object.values(state.charts).forEach(c => c?.destroy?.())

  const showSMA = document.getElementById('show-sma')?.checked
  const showBB = document.getElementById('show-bb')?.checked
  const showVol = document.getElementById('show-vol')?.checked

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

  const annotations = {}
  if (document.getElementById('show-fib')?.checked) {
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
  document.getElementById('chartSubtitle').textContent = d.asset.category + ' \\u2022 ' + tf + ' days \\u2022 Last: ' + (d.asset.category === 'Forex' ? d.summary.currentPrice.toFixed(4) : '$' + d.summary.currentPrice.toLocaleString())

  // RSI
  const rsiData = ind.rsi.slice(-tf)
  state.charts.rsi = new Chart(document.getElementById('rsiChart').getContext('2d'), {
    type: 'line',
    data: { labels, datasets: [{ data: rsiData, borderColor: '#a855f7', borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.2 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, annotation: { annotations: {
        ob: { type: 'line', yMin: 70, yMax: 70, borderColor: '#ef444466', borderWidth: 1, borderDash: [4,2] },
        os: { type: 'line', yMin: 30, yMax: 30, borderColor: '#22c55e66', borderWidth: 1, borderDash: [4,2] },
      }}},
      scales: { x: { display: false }, y: { min: 0, max: 100, grid: { color: 'rgba(51,65,85,0.2)' }, ticks: { color: '#64748b', font: { size: 9 }, stepSize: 20 } } }
    }
  })

  // MACD
  const macdH = ind.macd.histogram.slice(-tf)
  state.charts.macd = new Chart(document.getElementById('macdChart').getContext('2d'), {
    type: 'bar',
    data: { labels, datasets: [
      { data: ind.macd.macdLine.slice(-tf), type: 'line', borderColor: '#3b82f6', borderWidth: 1.5, pointRadius: 0, order: 1 },
      { data: ind.macd.signal.slice(-tf), type: 'line', borderColor: '#ef4444', borderWidth: 1, pointRadius: 0, borderDash: [3,2], order: 2 },
      { data: macdH, backgroundColor: macdH.map(v => v >= 0 ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'), order: 3 },
    ]},
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { grid: { color: 'rgba(51,65,85,0.2)' }, ticks: { color: '#64748b', font: { size: 9 } } } }
    }
  })

  // Stochastic
  state.charts.stoch = new Chart(document.getElementById('stochChart').getContext('2d'), {
    type: 'line',
    data: { labels, datasets: [
      { label: '%K', data: ind.stochastic.k.slice(-tf), borderColor: '#06b6d4', borderWidth: 1.5, pointRadius: 0, tension: 0.2 },
      { label: '%D', data: ind.stochastic.d.slice(-tf), borderColor: '#f97316', borderWidth: 1, pointRadius: 0, tension: 0.2, borderDash: [3,2] },
    ]},
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, annotation: { annotations: {
        ob: { type: 'line', yMin: 80, yMax: 80, borderColor: '#ef444466', borderWidth: 1, borderDash: [4,2] },
        os: { type: 'line', yMin: 20, yMax: 20, borderColor: '#22c55e66', borderWidth: 1, borderDash: [4,2] },
      }}},
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

  document.getElementById('fibTable').innerHTML = levels.map(l =>
    '<div class="bg-dark-700/30 rounded-lg p-2.5 border-l-2" style="border-color:' + l.color + '">' +
      '<div class="text-[10px] text-dark-300">' + l.label + '</div>' +
      '<div class="text-sm font-mono font-bold text-white">' + l.val.toLocaleString() + '</div>' +
    '</div>'
  ).join('')
}

// ============================================================
// PREDICTIONS
// ============================================================
function renderPredictions() {
  if (!state.predictions) return
  const p = state.predictions
  const cs = p.compositeScore

  const scoreColor = cs.score >= 70 ? '#22c55e' : cs.score >= 55 ? '#3b82f6' : cs.score >= 45 ? '#eab308' : '#ef4444'

  document.getElementById('compositeSection').innerHTML =
    '<div class="flex flex-col md:flex-row items-center gap-6">' +
      '<div class="flex-shrink-0 text-center">' +
        '<div class="relative w-32 h-32">' +
          '<svg class="w-32 h-32 -rotate-90" viewBox="0 0 120 120" role="img" aria-label="Composite score ' + cs.score + ' out of 100">' +
            '<circle cx="60" cy="60" r="52" stroke="#1e293b" stroke-width="8" fill="none"/>' +
            '<circle cx="60" cy="60" r="52" stroke="' + scoreColor + '" stroke-width="8" fill="none" stroke-dasharray="' + cs.score * 3.27 + ' 327" stroke-linecap="round"/>' +
          '</svg>' +
          '<div class="absolute inset-0 flex flex-col items-center justify-center">' +
            '<span class="text-2xl font-bold text-white">' + cs.score + '</span>' +
            '<span class="text-[10px] text-dark-300">/ 100</span>' +
          '</div>' +
        '</div>' +
        '<div class="mt-2 text-sm font-bold" style="color:' + scoreColor + '">' + cs.recommendation + '</div>' +
        '<div class="text-[10px] text-dark-300">Confidence: ' + cs.confidence + '</div>' +
      '</div>' +
      '<div class="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 w-full">' +
        '<div class="bg-dark-700/30 rounded-lg p-3 text-center"><div class="text-[10px] text-dark-300 mb-1"><i class="fas fa-dice mr-1 text-neon-purple"></i>Monte Carlo</div><div class="text-xl font-bold text-white">' + cs.breakdown.monteCarlo + '</div><div class="w-full bg-dark-600 rounded-full h-1.5 mt-1"><div class="h-1.5 rounded-full bg-neon-purple" style="width:' + cs.breakdown.monteCarlo + '%"></div></div></div>' +
        '<div class="bg-dark-700/30 rounded-lg p-3 text-center"><div class="text-[10px] text-dark-300 mb-1"><i class="fas fa-chart-line mr-1 text-neon-blue"></i>Regression</div><div class="text-xl font-bold text-white">' + cs.breakdown.regression + '</div><div class="w-full bg-dark-600 rounded-full h-1.5 mt-1"><div class="h-1.5 rounded-full bg-neon-blue" style="width:' + cs.breakdown.regression + '%"></div></div></div>' +
        '<div class="bg-dark-700/30 rounded-lg p-3 text-center"><div class="text-[10px] text-dark-300 mb-1"><i class="fas fa-magnet mr-1 text-neon-cyan"></i>Mean Reversion</div><div class="text-xl font-bold text-white">' + cs.breakdown.meanReversion + '</div><div class="w-full bg-dark-600 rounded-full h-1.5 mt-1"><div class="h-1.5 rounded-full bg-neon-cyan" style="width:' + cs.breakdown.meanReversion + '%"></div></div></div>' +
        '<div class="bg-dark-700/30 rounded-lg p-3 text-center"><div class="text-[10px] text-dark-300 mb-1"><i class="fas fa-bolt mr-1 text-neon-yellow"></i>Momentum</div><div class="text-xl font-bold text-white">' + cs.breakdown.momentum + '</div><div class="w-full bg-dark-600 rounded-full h-1.5 mt-1"><div class="h-1.5 rounded-full bg-neon-yellow" style="width:' + cs.breakdown.momentum + '%"></div></div></div>' +
      '</div>' +
    '</div>'

  renderPredictionCharts(p)
}

function renderPredictionCharts(p) {
  ['mc','lr','mr','mom'].forEach(k => state.charts[k]?.destroy?.())

  const mc = p.models.monteCarlo
  const lr = p.models.linearRegression
  const mr = p.models.meanReversion
  const mom = p.models.momentum
  const days = mc.predictions.map(d => 'D' + d.day)

  state.charts.mc = new Chart(document.getElementById('mcChart').getContext('2d'), {
    type: 'line',
    data: { labels: days, datasets: [
      { label: 'P95 (Bull)', data: mc.predictions.map(d => d.p95), borderColor: '#22c55e44', backgroundColor: 'rgba(34,197,94,0.05)', fill: true, pointRadius: 0, borderWidth: 1 },
      { label: 'P75', data: mc.predictions.map(d => d.p75), borderColor: '#3b82f644', backgroundColor: 'rgba(59,130,246,0.05)', fill: true, pointRadius: 0, borderWidth: 1 },
      { label: 'Median', data: mc.predictions.map(d => d.median), borderColor: '#818cf8', borderWidth: 2, pointRadius: 0, fill: false },
      { label: 'P25', data: mc.predictions.map(d => d.p25), borderColor: '#f9731644', backgroundColor: 'rgba(249,115,22,0.05)', fill: true, pointRadius: 0, borderWidth: 1 },
      { label: 'P5 (Bear)', data: mc.predictions.map(d => d.p5), borderColor: '#ef444444', backgroundColor: 'rgba(239,68,68,0.05)', fill: true, pointRadius: 0, borderWidth: 1 },
    ]},
    options: chartOptions()
  })

  document.getElementById('mcStats').innerHTML = miniStats([
    { label: 'Expected Return', value: mc.statistics.expectedReturn + '%', color: mc.statistics.expectedReturn >= 0 ? 'text-neon-green' : 'text-neon-red' },
    { label: 'Bull Probability', value: mc.statistics.bullishProbability + '%', color: 'text-neon-blue' },
    { label: 'Sharpe Ratio', value: mc.statistics.sharpeRatio, color: 'text-neon-purple' },
  ])

  state.charts.lr = new Chart(document.getElementById('lrChart').getContext('2d'), {
    type: 'line',
    data: { labels: days, datasets: [
      { label: 'Upper 95%', data: lr.predictions.map(d => d.upper), borderColor: '#22c55e33', backgroundColor: 'rgba(34,197,94,0.05)', fill: true, pointRadius: 0, borderWidth: 1 },
      { label: 'Predicted', data: lr.predictions.map(d => d.predicted), borderColor: '#3b82f6', borderWidth: 2, pointRadius: 0, fill: false },
      { label: 'Lower 95%', data: lr.predictions.map(d => d.lower), borderColor: '#ef444433', backgroundColor: 'rgba(239,68,68,0.05)', fill: true, pointRadius: 0, borderWidth: 1 },
    ]},
    options: chartOptions()
  })

  document.getElementById('lrStats').innerHTML = miniStats([
    { label: 'Trend', value: lr.trendDirection, color: lr.trendDirection === 'Bullish' ? 'text-neon-green' : 'text-neon-red' },
    { label: 'R\\u00b2 Score', value: lr.rSquared, color: 'text-neon-cyan' },
    { label: 'Daily \\u0394', value: '$' + lr.dailyChange, color: 'text-neon-blue' },
  ])

  state.charts.mr = new Chart(document.getElementById('mrChart').getContext('2d'), {
    type: 'line',
    data: { labels: days, datasets: [
      { label: 'Predicted', data: mr.predictions.map(d => d.predicted), borderColor: '#06b6d4', borderWidth: 2, pointRadius: 0, fill: false },
      { label: 'Mean Level', data: mr.predictions.map(d => d.meanLevel), borderColor: '#eab30866', borderWidth: 1, borderDash: [5,3], pointRadius: 0, fill: false },
    ]},
    options: chartOptions()
  })

  document.getElementById('mrStats').innerHTML = miniStats([
    { label: 'Signal', value: mr.signal.split(' - ')[0], color: mr.signal.includes('Buy') ? 'text-neon-green' : mr.signal.includes('Sell') ? 'text-neon-red' : 'text-neon-yellow' },
    { label: 'Deviation', value: mr.deviationPercent + '%', color: 'text-neon-cyan' },
    { label: 'Mean Price', value: '$' + mr.meanLevel.toLocaleString(), color: 'text-neon-blue' },
  ])

  state.charts.mom = new Chart(document.getElementById('momChart').getContext('2d'), {
    type: 'line',
    data: { labels: days, datasets: [
      { label: 'Momentum Forecast', data: mom.predictions.map(d => d.predicted), borderColor: '#eab308', borderWidth: 2, pointRadius: 0, fill: false, backgroundColor: 'rgba(234,179,8,0.05)' },
    ]},
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
  return items.map(i =>
    '<div class="bg-dark-700/30 rounded-lg p-2 text-center">' +
      '<div class="text-[10px] text-dark-300">' + i.label + '</div>' +
      '<div class="text-sm font-bold ' + i.color + ' font-mono">' + i.value + '</div>' +
    '</div>'
  ).join('')
}

// ============================================================
// SCANNER
// ============================================================
function renderScanner(scanner) {
  const container = document.getElementById('scannerTable')
  let tableHTML = '<div class="scanner-table-wrap"><table class="w-full text-xs"><thead>'
  tableHTML += '<tr class="text-dark-300 border-b border-dark-400/30">'
  tableHTML += '<th class="text-left py-2 px-2">Rank</th><th class="text-left py-2 px-2">Asset</th><th class="text-left py-2 px-2">Category</th>'
  tableHTML += '<th class="text-right py-2 px-2">Price</th><th class="text-right py-2 px-2">Change</th>'
  tableHTML += '<th class="text-center py-2 px-2">AI Score</th><th class="text-center py-2 px-2">Signal</th>'
  tableHTML += '<th class="text-right py-2 px-2">Expected</th><th class="text-right py-2 px-2">Bull %</th><th class="text-right py-2 px-2">Volatility</th>'
  tableHTML += '</tr></thead><tbody>'

  scanner.forEach((s, i) => {
    const isUp = s.change >= 0
    const scoreColor = s.compositeScore >= 70 ? 'text-neon-green' : s.compositeScore >= 55 ? 'text-neon-blue' : s.compositeScore >= 45 ? 'text-neon-yellow' : 'text-neon-red'
    const sigColor = s.recommendation.includes('BUY') ? 'bg-green-500/20 text-neon-green border-green-500/30' : s.recommendation.includes('SELL') ? 'bg-red-500/20 text-neon-red border-red-500/30' : 'bg-yellow-500/20 text-neon-yellow border-yellow-500/30'
    tableHTML += '<tr class="border-b border-dark-400/10 hover:bg-dark-600/30 cursor-pointer transition" onclick="selectAsset(\\'' + s.symbol + '\\');switchTab(\\'dashboard\\')" tabindex="0" onkeydown="if(event.key===\\'Enter\\'){selectAsset(\\'' + s.symbol + '\\');switchTab(\\'dashboard\\')}">'
    tableHTML += '<td class="py-2.5 px-2 font-mono text-dark-300">#' + (i+1) + '</td>'
    tableHTML += '<td class="py-2.5 px-2"><span class="font-semibold text-white">' + s.symbol + '</span> <span class="text-dark-300">' + s.name + '</span></td>'
    tableHTML += '<td class="py-2.5 px-2 text-dark-200">' + s.category + '</td>'
    tableHTML += '<td class="py-2.5 px-2 text-right font-mono text-white">' + (s.category === 'Forex' ? s.price.toFixed(4) : '$'+s.price.toLocaleString()) + '</td>'
    tableHTML += '<td class="py-2.5 px-2 text-right font-mono ' + (isUp ? 'text-neon-green' : 'text-neon-red') + '">' + (isUp ? '+' : '') + s.change + '%</td>'
    tableHTML += '<td class="py-2.5 px-2 text-center"><span class="font-bold ' + scoreColor + '">' + s.compositeScore + '</span></td>'
    tableHTML += '<td class="py-2.5 px-2 text-center"><span class="text-[10px] px-2 py-0.5 rounded-full border ' + sigColor + '">' + s.recommendation + '</span></td>'
    tableHTML += '<td class="py-2.5 px-2 text-right font-mono ' + (s.expectedReturn >= 0 ? 'text-neon-green' : 'text-neon-red') + '">' + (s.expectedReturn > 0 ? '+' : '') + s.expectedReturn + '%</td>'
    tableHTML += '<td class="py-2.5 px-2 text-right font-mono text-neon-blue">' + s.bullishProbability + '%</td>'
    tableHTML += '<td class="py-2.5 px-2 text-right font-mono text-neon-purple">' + s.volatility + '%</td>'
    tableHTML += '</tr>'
  })

  tableHTML += '</tbody></table></div>'
  container.innerHTML = tableHTML
}

// ============================================================
// PORTFOLIO
// ============================================================
async function optimizePortfolio() {
  const sel = document.getElementById('portfolioAssets')
  const symbols = Array.from(sel.selectedOptions).map(o => o.value)
  if (symbols.length < 2) { showToast('Select at least 2 assets', 'error'); return }

  const risk = document.getElementById('riskSlider').value / 100
  const container = document.getElementById('portfolioResults')
  container.innerHTML = '<div class="loading-shimmer h-60 rounded-xl" role="status" aria-label="Optimizing portfolio"></div>'

  try {
    const res = await fetchWithRetry('/api/portfolio/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols, riskTolerance: risk })
    })
    const data = await res.json()

    if (data.error) {
      container.innerHTML = '<div class="glass-card rounded-xl p-5 border-red-500/30"><div class="text-neon-red text-sm"><i class="fas fa-exclamation-triangle mr-2"></i>' + data.error + '</div></div>'
      return
    }

    const alloc = data.allocations
    const port = data.portfolio
    const corr = data.correlationMatrix

    let html = '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">'
    html += '<div class="glass-card rounded-xl p-4"><h3 class="text-sm font-semibold text-white mb-3"><i class="fas fa-chart-pie mr-1.5 text-accent-400"></i>Optimized Allocation</h3><div style="height:240px"><canvas id="allocChart"></canvas></div></div>'
    html += '<div class="glass-card rounded-xl p-4"><h3 class="text-sm font-semibold text-white mb-3"><i class="fas fa-chart-bar mr-1.5 text-neon-cyan"></i>Portfolio Metrics</h3>'
    html += '<div class="grid grid-cols-2 gap-3 mb-4">'
    html += '<div class="bg-dark-700/30 rounded-lg p-3 text-center"><div class="text-[10px] text-dark-300">Expected Return</div><div class="text-xl font-bold ' + (port.expectedReturn >= 0 ? 'text-neon-green' : 'text-neon-red') + '">' + port.expectedReturn + '%</div></div>'
    html += '<div class="bg-dark-700/30 rounded-lg p-3 text-center"><div class="text-[10px] text-dark-300">Volatility</div><div class="text-xl font-bold text-neon-purple">' + port.volatility + '%</div></div>'
    html += '<div class="bg-dark-700/30 rounded-lg p-3 text-center"><div class="text-[10px] text-dark-300">Sharpe Ratio</div><div class="text-xl font-bold text-neon-cyan">' + port.sharpeRatio + '</div></div>'
    html += '<div class="bg-dark-700/30 rounded-lg p-3 text-center"><div class="text-[10px] text-dark-300">Diversification</div><div class="text-xl font-bold text-accent-400">' + port.diversificationScore + '%</div></div>'
    html += '</div><div class="space-y-1.5">'
    alloc.forEach(a => {
      html += '<div class="flex items-center gap-2 text-xs"><span class="w-14 font-semibold text-white">' + a.symbol + '</span><div class="flex-1 bg-dark-600 rounded-full h-2"><div class="progress-bar h-2 rounded-full" style="width:' + a.weight + '%"></div></div><span class="w-12 text-right font-mono text-dark-200">' + a.weight + '%</span></div>'
    })
    html += '</div></div></div>'

    // Correlation matrix
    html += '<div class="glass-card rounded-xl p-4"><h3 class="text-sm font-semibold text-white mb-3"><i class="fas fa-table mr-1.5 text-neon-yellow"></i>Correlation Matrix</h3><div class="overflow-x-auto"><table class="text-[10px]">'
    html += '<tr><td class="p-1"></td>' + corr.symbols.map(s => '<td class="p-1 text-center font-semibold text-dark-200">' + s + '</td>').join('') + '</tr>'
    corr.matrix.forEach((row, i) => {
      html += '<tr><td class="p-1 font-semibold text-dark-200">' + corr.symbols[i] + '</td>'
      row.forEach(v => {
        const bg = v > 0.5 ? 'bg-red-500/30' : v > 0.2 ? 'bg-orange-500/20' : v > -0.2 ? 'bg-dark-600/50' : v > -0.5 ? 'bg-blue-500/20' : 'bg-blue-500/30'
        html += '<td class="p-1"><div class="correlation-cell ' + bg + '">' + v + '</div></td>'
      })
      html += '</tr>'
    })
    html += '</table></div></div>'

    container.innerHTML = html

    // Pie chart
    const colors = ['#818cf8','#22c55e','#ef4444','#eab308','#06b6d4','#a855f7','#f97316','#3b82f6','#ec4899','#14b8a6']
    state.charts.alloc?.destroy?.()
    state.charts.alloc = new Chart(document.getElementById('allocChart').getContext('2d'), {
      type: 'doughnut',
      data: { labels: alloc.map(a => a.symbol), datasets: [{ data: alloc.map(a => a.weight), backgroundColor: colors.slice(0, alloc.length), borderColor: '#0f172a', borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 10, padding: 6 } } }, cutout: '55%' }
    })
  } catch (err) {
    container.innerHTML = '<div class="glass-card rounded-xl p-5 border-red-500/30"><div class="text-neon-red text-sm"><i class="fas fa-exclamation-triangle mr-2"></i>Portfolio optimization failed. Please try again.</div></div>'
  }
}

// ============================================================
// COMPARISON VIEW
// ============================================================
async function runComparison() {
  const sel = document.getElementById('compareAssets')
  const symbols = Array.from(sel.selectedOptions).map(o => o.value)
  if (symbols.length < 2) { showToast('Select at least 2 assets to compare', 'error'); return }
  if (symbols.length > 4) { showToast('Select at most 4 assets', 'error'); return }

  const container = document.getElementById('compareResults')
  container.innerHTML = '<div class="loading-shimmer h-60 rounded-xl" role="status" aria-label="Running comparison"></div>'

  try {
    const res = await fetchWithRetry('/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols })
    })
    const data = await res.json()
    renderComparison(data.comparisons)
  } catch (err) {
    container.innerHTML = '<div class="glass-card rounded-xl p-5 border-red-500/30"><div class="text-neon-red text-sm"><i class="fas fa-exclamation-triangle mr-2"></i>Comparison failed. Please try again.</div></div>'
  }
}

function renderComparison(comparisons) {
  if (!comparisons || comparisons.length === 0) return
  const container = document.getElementById('compareResults')
  const colors = ['#818cf8', '#22c55e', '#eab308', '#06b6d4']

  let html = '<div class="glass-card rounded-xl p-4"><h3 class="text-sm font-semibold text-white mb-3"><i class="fas fa-columns mr-1.5 text-accent-400"></i>Comparison Summary</h3>'
  html += '<div class="overflow-x-auto"><table class="w-full text-xs">'
  html += '<thead><tr class="text-dark-300 border-b border-dark-400/30"><th class="text-left py-2 px-2">Metric</th>'
  comparisons.forEach((c, i) => {
    html += '<th class="text-center py-2 px-2" style="color:' + colors[i] + '">' + c.symbol + '</th>'
  })
  html += '</tr></thead><tbody>'

  const metrics = [
    { label: 'Price', fn: c => c.category === 'Forex' ? c.currentPrice.toFixed(4) : '$' + c.currentPrice.toLocaleString() },
    { label: 'AI Score', fn: c => c.compositeScore.score + '/100' },
    { label: 'Signal', fn: c => c.compositeScore.recommendation },
    { label: 'Expected Return', fn: c => c.monteCarlo.expectedReturn + '%' },
    { label: 'Bull Probability', fn: c => c.monteCarlo.bullishProbability + '%' },
    { label: 'Volatility', fn: c => c.monteCarlo.volatility + '%' },
    { label: 'Sharpe Ratio', fn: c => c.monteCarlo.sharpeRatio },
    { label: 'Max Upside', fn: c => c.monteCarlo.maxUpside + '%' },
    { label: 'Max Downside', fn: c => c.monteCarlo.maxDownside + '%' },
  ]

  metrics.forEach(m => {
    html += '<tr class="border-b border-dark-400/10"><td class="py-2 px-2 text-dark-200">' + m.label + '</td>'
    comparisons.forEach(c => {
      html += '<td class="py-2 px-2 text-center font-mono text-white">' + m.fn(c) + '</td>'
    })
    html += '</tr>'
  })

  html += '</tbody></table></div></div>'
  container.innerHTML = html
}

// ============================================================
// AI ANALYST
// ============================================================
async function askAI() {
  const question = document.getElementById('aiQuestion').value
  const symbol = state.currentSymbol
  const container = document.getElementById('aiResults')

  container.innerHTML =
    '<div class="glass-card rounded-xl p-5 animate-fadeIn">' +
      '<div class="flex items-center gap-3">' +
        '<div class="w-8 h-8 rounded-lg bg-accent-500/20 flex items-center justify-center"><i class="fas fa-spinner fa-spin text-accent-400"></i></div>' +
        '<div><div class="text-sm font-semibold text-white">Analyzing ' + symbol + '...</div>' +
        '<div class="text-[10px] text-dark-300">Running multi-model analysis with AI interpretation</div></div>' +
      '</div>' +
      '<div class="mt-3 loading-shimmer h-40 rounded-lg" role="status" aria-label="AI analyzing"></div>' +
    '</div>'

  try {
    const res = await fetchWithRetry('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, question })
    })
    const data = await res.json()

    if (data.error) {
      container.innerHTML = '<div class="glass-card rounded-xl p-5 border-red-500/30"><div class="text-neon-red text-sm"><i class="fas fa-exclamation-triangle mr-2"></i>' + data.error + '</div></div>'
      return
    }

    const cs = data.dataUsed.compositeScore
    const scoreColor = cs.score >= 70 ? '#22c55e' : cs.score >= 55 ? '#3b82f6' : cs.score >= 45 ? '#eab308' : '#ef4444'

    let htmlContent = data.analysis
      .replace(/### (.*?)\\n/g, '<h3>$1</h3>')
      .replace(/## (.*?)\\n/g, '<h2>$1</h2>')
      .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
      .replace(/\\*(.*?)\\*/g, '<em>$1</em>')
      .replace(/- (.*?)\\n/g, '<li>$1</li>')
      .replace(/\\n/g, '<br>')

    container.innerHTML =
      '<div class="glass-card rounded-xl p-5 animate-slideUp">' +
        '<div class="flex items-center justify-between mb-4">' +
          '<div class="flex items-center gap-3">' +
            '<div class="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-500 to-neon-purple flex items-center justify-center"><i class="fas fa-brain text-white text-sm"></i></div>' +
            '<div><div class="text-sm font-semibold text-white">AI Analysis: ' + symbol + '</div><div class="text-[10px] text-dark-300">' + new Date().toLocaleString() + '</div></div>' +
          '</div>' +
          '<div class="flex items-center gap-2">' +
            '<span class="text-xs font-bold" style="color:' + scoreColor + '">Score: ' + cs.score + '/100</span>' +
            '<span class="text-[10px] px-2 py-0.5 rounded-full border" style="color:' + scoreColor + ';border-color:' + scoreColor + '40">' + cs.recommendation + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="markdown-content text-sm text-dark-100 leading-relaxed">' + htmlContent + '</div>' +
      '</div>'
  } catch(e) {
    container.innerHTML = '<div class="glass-card rounded-xl p-5 border-red-500/30"><div class="text-neon-red text-sm"><i class="fas fa-exclamation-triangle mr-2"></i>Failed to get AI analysis. Please try again.</div></div>'
  }
}

// ============================================================
// TAB SWITCHING
// ============================================================
function switchTab(tab) {
  state.activeTab = tab
  document.querySelectorAll('[id^="content-"]').forEach(el => el.classList.add('hidden'))
  document.getElementById('content-' + tab)?.classList.remove('hidden')

  document.querySelectorAll('[id^="tab-"]').forEach(btn => {
    const isActive = btn.id === 'tab-' + tab
    btn.className = isActive ?
      'tab-active text-xs px-4 py-2 rounded-lg font-medium transition-all' :
      'text-xs px-4 py-2 rounded-lg font-medium text-dark-200 bg-dark-600/50 border border-dark-400/30 hover:bg-dark-500/50 transition-all'
    btn.setAttribute('aria-selected', isActive)
  })

  if (tab === 'predictions' && !state.predictions) loadPredictions()
}

// Start
init()
`
}
