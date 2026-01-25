'use client'

import { createContext, useContext, useCallback, useState, type ReactNode } from 'react'
import { ToastContainer, type Toast, type ToastType } from '@/components/ui/Toast'

// ============================================================================
// Types
// ============================================================================

interface ToastContextValue {
  toasts: Toast[]
  addToast: (type: ToastType, message: string, duration?: number, errorCode?: string) => void
  removeToast: (id: string) => void
  success: (message: string, duration?: number) => void
  error: (message: string, durationOrCode?: number | string, errorCode?: string) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
  clearAll: () => void
}

interface ToastProviderProps {
  children: ReactNode
}

// ============================================================================
// Context
// ============================================================================

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

// ============================================================================
// Provider
// ============================================================================

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const generateId = () => `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const addToast = useCallback((type: ToastType, message: string, duration?: number, errorCode?: string) => {
    const id = generateId()
    const newToast: Toast = { id, type, message, duration, errorCode }

    setToasts((prev) => {
      // Limit to 5 toasts max
      const updated = [...prev, newToast]
      if (updated.length > 5) {
        return updated.slice(-5)
      }
      return updated
    })
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const success = useCallback((message: string, duration?: number) => {
    addToast('success', message, duration)
  }, [addToast])

  const error = useCallback((message: string, durationOrCode?: number | string, errorCode?: string) => {
    // Support both signatures:
    // error(message, duration) - old signature
    // error(message, errorCode) - new signature with code
    // error(message, duration, errorCode) - full signature
    let duration: number | undefined
    let code: string | undefined

    if (typeof durationOrCode === 'string') {
      // error(message, errorCode)
      code = durationOrCode
      duration = 7000
    } else if (typeof durationOrCode === 'number') {
      // error(message, duration, errorCode)
      duration = durationOrCode
      code = errorCode
    } else {
      // error(message)
      duration = 7000
    }

    addToast('error', message, duration, code)
  }, [addToast])

  const warning = useCallback((message: string, duration?: number) => {
    addToast('warning', message, duration ?? 6000)
  }, [addToast])

  const info = useCallback((message: string, duration?: number) => {
    addToast('info', message, duration)
  }, [addToast])

  const clearAll = useCallback(() => {
    setToasts([])
  }, [])

  const value: ToastContextValue = {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
    clearAll,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  )
}

// ============================================================================
// Hook
// ============================================================================

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)

  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }

  return context
}

export default ToastContext
