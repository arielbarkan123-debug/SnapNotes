'use client'

import { ReactNode } from 'react'

// ============================================================================
// Types
// ============================================================================

interface SkeletonProps {
  className?: string
  children?: ReactNode
}

interface SkeletonTextProps extends SkeletonProps {
  lines?: number
  lastLineWidth?: string
}

interface SkeletonCircleProps extends SkeletonProps {
  size?: number | string
}

interface SkeletonRectProps extends SkeletonProps {
  width?: number | string
  height?: number | string
}

// ============================================================================
// Base Skeleton Component
// ============================================================================

export function Skeleton({ className = '', children }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
      aria-hidden="true"
    >
      {children}
    </div>
  )
}

// ============================================================================
// Skeleton Variants
// ============================================================================

/**
 * Text skeleton - simulates lines of text
 */
export function SkeletonText({
  lines = 3,
  lastLineWidth = '60%',
  className = '',
}: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
          style={{
            width: index === lines - 1 ? lastLineWidth : '100%',
          }}
        />
      ))}
    </div>
  )
}

/**
 * Circle skeleton - for avatars, icons
 */
export function SkeletonCircle({
  size = 40,
  className = '',
}: SkeletonCircleProps) {
  const sizeStyle = typeof size === 'number' ? `${size}px` : size

  return (
    <div
      className={`rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse ${className}`}
      style={{ width: sizeStyle, height: sizeStyle }}
      aria-hidden="true"
    />
  )
}

/**
 * Rectangle skeleton - for images, cards
 */
export function SkeletonRect({
  width = '100%',
  height = 100,
  className = '',
}: SkeletonRectProps) {
  const widthStyle = typeof width === 'number' ? `${width}px` : width
  const heightStyle = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className}`}
      style={{ width: widthStyle, height: heightStyle }}
      aria-hidden="true"
    />
  )
}

/**
 * Card skeleton - common card layout
 */
export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* Image placeholder */}
      <div className="h-40 bg-gray-200 dark:bg-gray-700 animate-pulse" />

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />

        {/* Description lines */}
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-5/6" />
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2 pt-2">
          <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Spinner Component
// ============================================================================

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const spinnerSizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin ${spinnerSizes[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

// ============================================================================
// Loading Overlay
// ============================================================================

interface LoadingOverlayProps {
  message?: string
}

export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4 text-indigo-600 dark:text-indigo-400" />
        <p className="text-gray-600 dark:text-gray-400">{message}</p>
      </div>
    </div>
  )
}

// ============================================================================
// Default Export
// ============================================================================

export default Skeleton
