'use client'

import { ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { ToastProvider } from '@/contexts/ToastContext'
import { XPProvider } from '@/contexts/XPContext'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <XPProvider>
          {children}
        </XPProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default Providers
