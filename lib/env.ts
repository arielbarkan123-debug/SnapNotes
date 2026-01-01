/**
 * Environment Variable Validation
 *
 * This module validates that all required environment variables are set
 * and provides type-safe access to them.
 *
 * Import this at the top of server-side code to fail fast if env vars are missing.
 */

// =============================================================================
// Types
// =============================================================================

interface ServerEnv {
  SUPABASE_SERVICE_ROLE_KEY: string
  ANTHROPIC_API_KEY: string
}

interface ClientEnv {
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  NEXT_PUBLIC_APP_URL?: string
}

interface Env extends ServerEnv, ClientEnv {}

// =============================================================================
// Validation
// =============================================================================

class EnvError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EnvError'
  }
}

function validateRequired(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new EnvError(
      `Missing required environment variable: ${name}\n` +
      `Please add it to your .env.local file.\n` +
      `See .env.example for reference.`
    )
  }
  return value
}

function validateUrl(name: string, value: string | undefined): string {
  const validated = validateRequired(name, value)
  try {
    new URL(validated)
    return validated
  } catch {
    throw new EnvError(
      `Invalid URL in environment variable: ${name}\n` +
      `Value: ${validated}\n` +
      `Please provide a valid URL.`
    )
  }
}

// =============================================================================
// Environment Objects
// =============================================================================

/**
 * Server-side environment variables
 * These should NEVER be exposed to the client
 */
export function getServerEnv(): ServerEnv {
  // Only validate on server
  if (typeof window !== 'undefined') {
    throw new EnvError(
      'getServerEnv() was called on the client side. ' +
      'Server environment variables must only be accessed in server components or API routes.'
    )
  }

  return {
    SUPABASE_SERVICE_ROLE_KEY: validateRequired(
      'SUPABASE_SERVICE_ROLE_KEY',
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
    ANTHROPIC_API_KEY: validateRequired(
      'ANTHROPIC_API_KEY',
      process.env.ANTHROPIC_API_KEY
    ),
  }
}

/**
 * Client-side environment variables
 * These are safe to expose in the browser (NEXT_PUBLIC_ prefix)
 */
export function getClientEnv(): ClientEnv {
  return {
    NEXT_PUBLIC_SUPABASE_URL: validateUrl(
      'NEXT_PUBLIC_SUPABASE_URL',
      process.env.NEXT_PUBLIC_SUPABASE_URL
    ),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: validateRequired(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  }
}

/**
 * All environment variables (server-side only)
 */
export function getEnv(): Env {
  return {
    ...getServerEnv(),
    ...getClientEnv(),
  }
}

// =============================================================================
// Quick Access Helpers
// =============================================================================

/**
 * Get Supabase URL (safe for client)
 */
export function getSupabaseUrl(): string {
  return validateUrl(
    'NEXT_PUBLIC_SUPABASE_URL',
    process.env.NEXT_PUBLIC_SUPABASE_URL
  )
}

/**
 * Get Supabase anon key (safe for client)
 */
export function getSupabaseAnonKey(): string {
  return validateRequired(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * Get Anthropic API key (server-side only)
 */
export function getAnthropicApiKey(): string {
  if (typeof window !== 'undefined') {
    throw new EnvError('Anthropic API key must only be accessed on the server')
  }
  return validateRequired(
    'ANTHROPIC_API_KEY',
    process.env.ANTHROPIC_API_KEY
  )
}

/**
 * Check if all required environment variables are set
 * Call this during app startup to fail fast
 */
export function validateEnv(): void {
  const errors: string[] = []

  // Check client env vars
  const clientVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ]

  for (const name of clientVars) {
    if (!process.env[name]) {
      errors.push(`Missing: ${name}`)
    }
  }

  // Check server env vars (only on server)
  if (typeof window === 'undefined') {
    const serverVars = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'ANTHROPIC_API_KEY',
    ]

    for (const name of serverVars) {
      if (!process.env[name]) {
        errors.push(`Missing: ${name}`)
      }
    }
  }

  if (errors.length > 0) {
    throw new EnvError(
      `Environment validation failed:\n` +
      errors.map(e => `  - ${e}`).join('\n') +
      `\n\nPlease check your .env.local file. See .env.example for reference.`
    )
  }
}

// =============================================================================
// Default Export
// =============================================================================

const envUtils = {
  getServerEnv,
  getClientEnv,
  getEnv,
  validateEnv,
  getSupabaseUrl,
  getSupabaseAnonKey,
  getAnthropicApiKey,
}

export default envUtils
