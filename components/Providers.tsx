'use client'

import { ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { ToastProvider } from '@/contexts/ToastContext'
import { XPProvider } from '@/contexts/XPContext'
import { SWRProvider } from './providers/SWRProvider'
import { AnalyticsProvider } from './providers/AnalyticsProvider'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <SWRProvider>
        <AnalyticsProvider>
          <ToastProvider>
            <XPProvider>
              {children}
            </XPProvider>
          </ToastProvider>
        </AnalyticsProvider>
      </SWRProvider>
    </ErrorBoundary>
  )
}

export default Providers
