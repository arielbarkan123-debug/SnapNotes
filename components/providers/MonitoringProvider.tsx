'use client'

import { useEffect, ReactNode } from 'react'
import { errorReporter } from '@/lib/monitoring'

interface MonitoringProviderProps {
  children: ReactNode
}

/**
 * MonitoringProvider - Initializes error monitoring for the application
 * Captures unhandled errors, promise rejections, and provides error reporting
 */
export function MonitoringProvider({ children }: MonitoringProviderProps) {
  useEffect(() => {
    // Initialize error reporter on mount
    errorReporter.initialize()
  }, [])

  return <>{children}</>
}

export default MonitoringProvider
