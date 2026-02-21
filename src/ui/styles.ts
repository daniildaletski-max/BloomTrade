// ============================================================
// EXTRACTED CSS STYLES
// ============================================================

export function getStyles(): string {
  return `
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

/* Mobile sidebar */
.sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 40; }
.sidebar-overlay.active { display: block; }
@media (max-width: 767px) {
  #sidebar { position: fixed; left: -280px; top: 57px; bottom: 0; z-index: 45; transition: left 0.3s ease; width: 280px; }
  #sidebar.open { left: 0; }
  .scanner-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .scanner-table-wrap th:first-child,
  .scanner-table-wrap td:first-child { position: sticky; left: 0; background: rgba(15, 23, 42, 0.95); z-index: 1; }
}

/* Toast notifications */
.toast-container { position: fixed; top: 70px; right: 16px; z-index: 100; display: flex; flex-direction: column; gap: 8px; }
.toast { padding: 10px 16px; border-radius: 8px; font-size: 0.75rem; backdrop-filter: blur(20px); animation: slideIn 0.3s ease-out, fadeOut 0.3s ease-in 2.7s forwards; max-width: 320px; }
.toast-success { background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); color: #22c55e; }
.toast-error { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; }
.toast-info { background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); color: #818cf8; }
@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
@keyframes fadeOut { to { opacity: 0; transform: translateY(-10px); } }

/* Price flash animation */
.price-flash-green { animation: flashGreen 0.6s ease-out; }
.price-flash-red { animation: flashRed 0.6s ease-out; }
@keyframes flashGreen { 0% { background-color: rgba(34,197,94,0.2); } 100% { background-color: transparent; } }
@keyframes flashRed { 0% { background-color: rgba(239,68,68,0.2); } 100% { background-color: transparent; } }

/* Keyboard focus styles */
:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; border-radius: 4px; }
`
}
