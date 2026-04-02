/**
 * Structured Logger for X+1
 *
 * Uses pino for structured JSON logging in production and readable output in development.
 * Works in both server (Node.js) and browser (React) environments.
 *
 * Usage:
 *   import { createLogger } from '@/lib/logger'
 *   const log = createLogger('ai:claude')
 *   log.info('Processing request')
 *   log.error({ err }, 'Generation failed')
 *   log.debug({ courseId }, 'Course loaded')
 */

import pino from 'pino'

const isServer = typeof window === 'undefined'
const isDev = process.env.NODE_ENV !== 'production'

// Server config: structured JSON for production, readable for dev
const serverConfig: pino.LoggerOptions = {
  level: isDev ? 'debug' : 'warn',
  formatters: {
    level: (label: string) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
}

// Browser config: uses console API underneath
const browserConfig: pino.LoggerOptions = {
  level: isDev ? 'debug' : 'warn',
  browser: {
    asObject: false,
  },
}

const rootLogger = pino(isServer ? serverConfig : browserConfig)

/**
 * Create a namespaced child logger.
 *
 * @param module - Namespace for the logger (e.g., 'ai:claude', 'homework:checker', 'api:srs')
 * @returns A pino child logger with the module field set
 *
 * @example
 * const log = createLogger('ai:claude')
 * log.info('Processing request')
 * log.error({ err, courseId }, 'Generation failed')
 * log.debug({ attempt: 3 }, 'Retrying...')
 * log.warn('Falling back to legacy pipeline')
 */
export function createLogger(module: string) {
  return rootLogger.child({ module })
}

export default rootLogger
