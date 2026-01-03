'use client'

import { useEffect, useRef, useCallback } from 'react'
import Button from '@/components/ui/Button'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isDeleting: boolean
  courseTitle: string
}

// Track number of open modals to prevent overflow conflicts
let openModalCount = 0

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  courseTitle
}: DeleteConfirmModalProps) {
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
    if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
      setTimeout(() => {
        previousActiveElement.current?.focus()
      }, 0)
    }
  }, [onClose])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, handleClose, isDeleting])

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={isDeleting ? undefined : handleClose}
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        className="relative w-full sm:max-w-md bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Icon */}
        <div className="pt-6 flex justify-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <h3 id="delete-dialog-title" className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Delete Course
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Are you sure you want to delete this course?
          </p>
          <p className="text-gray-900 dark:text-white font-medium mb-4 truncate">
            &ldquo;{courseTitle}&rdquo;
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This action cannot be undone. The course and all associated data will be permanently removed.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 p-4 sm:p-6 pt-0">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isDeleting}
            className="flex-1 min-h-[48px] sm:min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={isDeleting}
            isLoading={isDeleting}
            loadingText="Deleting..."
            className="flex-1 min-h-[48px] sm:min-h-[44px]"
          >
            Delete Course
          </Button>
        </div>
      </div>
    </div>
  )
}
