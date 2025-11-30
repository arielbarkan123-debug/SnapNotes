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
      className={`bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item ${className}`}
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
          className="h-4 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item"
          style={{
            width: index === lines - 1 ? lastLineWidth : '100%',
          }}
        />
      ))}
    </div>
  )
}

/**
 * Circle skeleton - for avatars, profile images
 */
export function SkeletonCircle({
  size = 40,
  className = '',
}: SkeletonCircleProps) {
  const sizeStyle = typeof size === 'number' ? `${size}px` : size

  return (
    <div
      className={`rounded-full bg-gray-200 dark:bg-gray-700 skeleton-shimmer-item ${className}`}
      style={{ width: sizeStyle, height: sizeStyle }}
      aria-hidden="true"
    />
  )
}

/**
 * Avatar skeleton - alias for circle with common avatar sizes
 */
export function SkeletonAvatar({
  size = 40,
  className = '',
}: SkeletonCircleProps) {
  return <SkeletonCircle size={size} className={className} />
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
      className={`bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item ${className}`}
      style={{ width: widthStyle, height: heightStyle }}
      aria-hidden="true"
    />
  )
}

/**
 * Button skeleton - small rectangle for buttons
 */
export function SkeletonButton({
  width = 100,
  height = 40,
  className = '',
}: SkeletonRectProps) {
  const widthStyle = typeof width === 'number' ? `${width}px` : width
  const heightStyle = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={`bg-gray-200 dark:bg-gray-700 rounded-lg skeleton-shimmer-item ${className}`}
      style={{ width: widthStyle, height: heightStyle }}
      aria-hidden="true"
    />
  )
}

/**
 * Card skeleton - common card layout with image + content
 */
export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* Image placeholder */}
      <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent skeleton-shimmer" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item w-3/4" />

        {/* Description lines */}
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item w-5/6" />
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2 pt-2">
          <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
        </div>
      </div>
    </div>
  )
}

/**
 * Stat card skeleton - for dashboard stat boxes
 */
export function SkeletonStatCard({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 ${className}`}
      aria-hidden="true"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 skeleton-shimmer-item" />
        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
      </div>
      <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mb-2" />
      <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
    </div>
  )
}

/**
 * Chart skeleton - for chart/graph areas
 */
export function SkeletonChart({ height = 256, className = '' }: { height?: number; className?: string }) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 ${className}`}
      aria-hidden="true"
    >
      <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mb-4" />
      <div
        className="bg-gray-100 dark:bg-gray-700/50 rounded-lg skeleton-shimmer-item"
        style={{ height: `${height}px` }}
      />
    </div>
  )
}

/**
 * Exam card skeleton - for exam list items
 */
export function SkeletonExamCard({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 ${className}`}
      aria-hidden="true"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mb-2" />
          <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
        </div>
        <div className="text-right">
          <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full skeleton-shimmer-item" />
        </div>
      </div>
    </div>
  )
}

/**
 * Flashcard skeleton - for practice flashcard area
 */
export function SkeletonFlashcard({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-2xl mx-auto ${className}`}
      aria-hidden="true"
    >
      {/* Progress bar */}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-6 skeleton-shimmer-item" />

      {/* Card type badge */}
      <div className="flex justify-center mb-4">
        <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full skeleton-shimmer-item" />
      </div>

      {/* Question area */}
      <div className="min-h-[200px] flex flex-col items-center justify-center space-y-4">
        <div className="h-6 w-4/5 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
        <div className="h-6 w-3/5 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
        <div className="h-6 w-2/5 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
      </div>

      {/* Answer options */}
      <div className="mt-8 space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="h-12 bg-gray-100 dark:bg-gray-700/50 rounded-lg skeleton-shimmer-item"
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Course card skeleton - matches CourseCard layout exactly
 */
export function SkeletonCourseCard({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* Thumbnail - aspect-square to match CourseCard */}
      <div className="relative aspect-square w-full bg-gray-200 dark:bg-gray-700">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent skeleton-shimmer" />
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item w-4/5 mb-2" />
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
      </div>
    </div>
  )
}

/**
 * Course card skeleton grid - for loading multiple cards
 */
export function SkeletonCourseCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCourseCard key={index} />
      ))}
    </div>
  )
}

// ============================================================================
// Spinner Component (keeping for backwards compatibility)
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
