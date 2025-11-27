'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

interface OriginalImageModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  title?: string
}

export default function OriginalImageModal({
  isOpen,
  onClose,
  imageUrl,
  title = 'Original Notes'
}: OriginalImageModalProps) {
  const [scale, setScale] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Reset scale when modal opens
  useEffect(() => {
    if (isOpen) {
      setScale(1)
      setIsLoading(true)
    }
  }, [isOpen])

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.25, 3))
  }, [])

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.25, 0.5))
  }, [])

  const handleResetZoom = useCallback(() => {
    setScale(1)
  }, [])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 sm:bg-black/90"
      onClick={onClose}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-black/70 sm:from-black/50 to-transparent z-10 safe-area-inset-top">
        <h3 className="text-white font-medium text-sm sm:text-base truncate max-w-[150px] sm:max-w-none">{title}</h3>
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-white/10 rounded-lg p-0.5 sm:p-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleZoomOut()
              }}
              className="p-2 sm:p-2 text-white hover:bg-white/10 active:bg-white/20 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Zoom out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleResetZoom()
              }}
              className="px-2 sm:px-3 py-2 text-white text-xs sm:text-sm font-medium hover:bg-white/10 active:bg-white/20 rounded-lg transition-colors min-w-[48px] sm:min-w-[60px] min-h-[44px] flex items-center justify-center"
              aria-label="Reset zoom"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleZoomIn()
              }}
              className="p-2 sm:p-2 text-white hover:bg-white/10 active:bg-white/20 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Zoom in"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white/10 active:bg-white/20 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Image Container */}
      <div
        className="relative w-full h-full sm:w-auto sm:h-auto sm:max-w-[90vw] sm:max-h-[85vh] overflow-auto flex items-center justify-center pt-16 pb-12 sm:pt-0 sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease-out',
          }}
        >
          <Image
            src={imageUrl}
            alt={title}
            width={800}
            height={1100}
            className="rounded-lg shadow-2xl max-w-full sm:max-w-none"
            style={{ maxHeight: '85vh', width: 'auto', height: 'auto' }}
            onLoad={() => setIsLoading(false)}
            priority
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs sm:text-sm safe-area-inset-bottom">
        <span className="hidden sm:inline">Click outside or press Esc to close</span>
        <span className="sm:hidden">Tap outside to close</span>
      </div>
    </div>
  )
}
