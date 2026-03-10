/**
 * Debug logging utilities
 *
 * Delegates to the structured pino logger from @/lib/logger.
 * Maintains backward compatibility with existing code that uses
 * debug.log(), debug.error(), createDebugLogger(), etc.
 *
 * - In development: all levels logged
 * - In production: only warn + error logged (pino handles level filtering)
 */

import { createLogger } from '@/lib/logger'

const log = createLogger('debug')

/**
 * Debug logger that delegates to structured pino logger
 */
export const debug = {
  log: (...args: unknown[]) => {
    log.debug({ args: args.length === 1 ? args[0] : args }, String(args[0]))
  },
  warn: (...args: unknown[]) => {
    log.warn({ args: args.length === 1 ? args[0] : args }, String(args[0]))
  },
  error: (...args: unknown[]) => {
    log.error({ args: args.length === 1 ? args[0] : args }, String(args[0]))
  },
  info: (...args: unknown[]) => {
    log.info({ args: args.length === 1 ? args[0] : args }, String(args[0]))
  },
}

/**
 * Create a namespaced debug logger
 * @param namespace - Namespace for the logger (e.g., 'AuthCallback', 'UploadHandler')
 */
export function createDebugLogger(namespace: string) {
  const nsLog = createLogger(namespace)
  return {
    log: (...args: unknown[]) => {
      nsLog.debug({ args: args.length === 1 ? args[0] : args }, String(args[0]))
    },
    warn: (...args: unknown[]) => {
      nsLog.warn({ args: args.length === 1 ? args[0] : args }, String(args[0]))
    },
    error: (...args: unknown[]) => {
      nsLog.error({ args: args.length === 1 ? args[0] : args }, String(args[0]))
    },
    info: (...args: unknown[]) => {
      nsLog.info({ args: args.length === 1 ? args[0] : args }, String(args[0]))
    },
  }
}

export default debug
