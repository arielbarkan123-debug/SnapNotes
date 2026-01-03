'use client'

import { useEffect, useRef, useCallback } from 'react'
import Button from './Button'

type DialogVariant = 'danger' | 'warning' | 'info'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  description?: string
  confirmText?: string
  loadingText?: string
  cancelText?: string
  variant?: DialogVariant
  isLoading?: boolean
}

const variantConfig = {
  danger: {
    icon: (
      <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    buttonVariant: 'danger' as const,
  },
  warning: {
    icon: (
      <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    buttonVariant: 'primary' as const,
  },
  info: {
    icon: (
      <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    buttonVariant: 'primary' as const,
  },
}

// Track number of open modals to prevent overflow conflicts
let openModalCount = 0

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  description,
  confirmText = 'Confirm',
  loadingText,
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const hasSetOverflow = useRef(false)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  // Store the previously focused element when dialog opens
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement
    }
  }, [isOpen])

  // Restore focus when dialog closes
  const handleClose = useCallback(() => {
    onClose()
    // Restore focus to the element that triggered the dialog
    if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
      // Use setTimeout to ensure the dialog is fully closed before restoring focus
      setTimeout(() => {
        previousActiveElement.current?.focus()
      }, 0)
    }
  }, [onClose])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, handleClose, isLoading])

  // Prevent body scroll when modal is open - use counter to handle nested modals
  useEffect(() => {
    if (isOpen && !hasSetOverflow.current) {
      openModalCount++
      hasSetOverflow.current = true
      document.body.style.overflow = 'hidden'
    }

    return () => {
      if (hasSetOverflow.current) {
        openModalCount--
        hasSetOverflow.current = false
        // Only restore overflow when no modals are open
        if (openModalCount === 0) {
          document.body.style.overflow = ''
        }
      }
    }
  }, [isOpen])

  // Focus trap
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  const config = variantConfig[variant]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={isLoading ? undefined : handleClose}
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="relative w-full sm:max-w-md bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Icon */}
        <div className="pt-6 flex justify-center">
          <div className={`w-16 h-16 ${config.bgColor} rounded-full flex items-center justify-center`}>
            {config.icon}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <h3
            id="dialog-title"
            className="text-xl font-semibold text-gray-900 dark:text-white mb-2"
          >
            {title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {message}
          </p>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-500">
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 p-4 sm:p-6 pt-0">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 min-h-[48px] sm:min-h-[44px]"
          >
            {cancelText}
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={onConfirm}
            disabled={isLoading}
            isLoading={isLoading}
            loadingText={loadingText}
            className="flex-1 min-h-[48px] sm:min-h-[44px]"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
