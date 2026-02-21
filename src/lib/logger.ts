// ============================================================
// STRUCTURED LOGGING UTILITY
// ============================================================

type LogLevel = 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  data?: Record<string, unknown>
}

function formatLog(entry: LogEntry): string {
  const base = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`
  if (entry.data && Object.keys(entry.data).length > 0) {
    return `${base} ${JSON.stringify(entry.data)}`
  }
  return base
}

function log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    data,
  }

  const formatted = formatLog(entry)

  switch (level) {
    case 'error':
      console.error(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    default:
      console.log(formatted)
  }
}

export const logger = {
  info: (message: string, data?: Record<string, unknown>) => log('info', message, data),
  warn: (message: string, data?: Record<string, unknown>) => log('warn', message, data),
  error: (message: string, data?: Record<string, unknown>) => log('error', message, data),

  /**
   * Log an API request with method, path, status, and duration.
   */
  request: (method: string, path: string, status: number, durationMs: number) => {
    log('info', `${method} ${path} ${status}`, { durationMs })
  },

  /**
   * Log cache hit/miss for performance monitoring.
   */
  cache: (action: 'hit' | 'miss', key: string) => {
    log('info', `Cache ${action}`, { key })
  },
}
