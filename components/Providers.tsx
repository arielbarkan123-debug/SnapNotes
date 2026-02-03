'use client'

import { type ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { ErrorBoundary } from './ErrorBoundary'
import { ToastProvider } from '@/contexts/ToastContext'
import { XPProvider } from '@/contexts/XPContext'
import { VisualsProvider } from '@/contexts/VisualsContext'
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
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <MonitoringProvider>
          <SWRProvider>
            <AnalyticsProvider>
              <PWAProvider>
                <ToastProvider>
                  <XPProvider>
                    <VisualsProvider>
                      {children}
                    </VisualsProvider>
                  </XPProvider>
                </ToastProvider>
              </PWAProvider>
            </AnalyticsProvider>
          </SWRProvider>
        </MonitoringProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default Providers
