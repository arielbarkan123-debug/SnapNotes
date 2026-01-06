'use client'

import { ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { ToastProvider } from '@/contexts/ToastContext'
import { XPProvider } from '@/contexts/XPContext'
import { SWRProvider } from './providers/SWRProvider'
import { AnalyticsProvider } from './providers/AnalyticsProvider'
import { PWAProvider } from './providers/PWAProvider'
import { MonitoringProvider } from './providers/MonitoringProvider'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <MonitoringProvider>
        <SWRProvider>
          <AnalyticsProvider>
            <PWAProvider>
              <ToastProvider>
                <XPProvider>
                  {children}
                </XPProvider>
              </ToastProvider>
            </PWAProvider>
          </AnalyticsProvider>
        </SWRProvider>
      </MonitoringProvider>
    </ErrorBoundary>
  )
}

export default Providers
