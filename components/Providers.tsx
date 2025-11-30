'use client'

import { ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { ToastProvider } from '@/contexts/ToastContext'
import { XPProvider } from '@/contexts/XPContext'
import { SWRProvider } from './providers/SWRProvider'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <SWRProvider>
        <ToastProvider>
          <XPProvider>
            {children}
          </XPProvider>
        </ToastProvider>
      </SWRProvider>
    </ErrorBoundary>
  )
}

export default Providers
