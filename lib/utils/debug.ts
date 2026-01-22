/**
 * Debug logging utilities
 * Only outputs in development environment to avoid production log pollution
 */

const isDev = process.env.NODE_ENV === 'development'

/**
 * Debug logger that only logs in development mode
 */
export const debug = {
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args)
    }
  },
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn(...args)
    }
  },
  error: (...args: unknown[]) => {
    // Errors are always logged (useful for production debugging)
    console.error(...args)
  },
  info: (...args: unknown[]) => {
    if (isDev) {
      console.info(...args)
    }
  },
}

/**
 * Create a namespaced debug logger
 * @param namespace - Prefix for all log messages (e.g., '[AuthCallback]')
 */
export function createDebugLogger(namespace: string) {
  return {
    log: (...args: unknown[]) => debug.log(namespace, ...args),
    warn: (...args: unknown[]) => debug.warn(namespace, ...args),
    error: (...args: unknown[]) => debug.error(namespace, ...args),
    info: (...args: unknown[]) => debug.info(namespace, ...args),
  }
}

export default debug
