'use client'

import { ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { ToastProvider } from '@/contexts/ToastContext'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default Providers
