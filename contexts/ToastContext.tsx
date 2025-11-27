'use client'

import { createContext, useContext, useCallback, useState, ReactNode } from 'react'
import { ToastContainer, Toast, ToastType } from '@/components/ui/Toast'

// ============================================================================
// Types
// ============================================================================

interface ToastContextValue {
  toasts: Toast[]
  addToast: (type: ToastType, message: string, duration?: number) => void
  removeToast: (id: string) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
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

  const addToast = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = generateId()
    const newToast: Toast = { id, type, message, duration }

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

  const error = useCallback((message: string, duration?: number) => {
    addToast('error', message, duration ?? 7000) // Errors show longer
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
