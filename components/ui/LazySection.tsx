'use client'

import { type ReactNode } from 'react'
import { useInView } from '@/hooks/useInView'

interface LazySectionProps {
  children: ReactNode
  // Skeleton to show while not in view
  skeleton?: ReactNode
  // Custom className for the wrapper
  className?: string
  // Margin before triggering load (default: 200px - loads slightly before visible)
  rootMargin?: string
  // Minimum height to prevent layout shift
  minHeight?: string | number
  // Optional: force render immediately (for SSR or above-the-fold content)
  forceRender?: boolean
}

/**
 * LazySection component - only renders children when scrolled into view
 * Shows a skeleton placeholder until the section is visible
 */
export function LazySection({
  children,
  skeleton,
  className = '',
  rootMargin = '200px',
  minHeight,
  forceRender = false,
}: LazySectionProps) {
  const { ref, inView } = useInView({
    rootMargin,
    triggerOnce: true,
    initialInView: forceRender,
  })

  const minHeightStyle = minHeight
    ? typeof minHeight === 'number'
      ? `${minHeight}px`
      : minHeight
    : undefined

  // If forceRender is true, skip the intersection observer logic
  if (forceRender) {
    return <div className={className}>{children}</div>
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{ minHeight: !inView ? minHeightStyle : undefined }}
    >
      {inView ? children : skeleton}
    </div>
  )
}

/**
 * Pre-built skeleton variants for common section types
 */

export function ChartSectionSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mb-4" />
      <div className="h-48 bg-gray-100 dark:bg-gray-700/50 rounded-lg skeleton-shimmer-item" />
    </div>
  )
}

export function MasteryMapSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mb-4" />
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg skeleton-shimmer-item" />
              <div className="flex-1">
                <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mb-2" />
                <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
              </div>
              <div className="hidden sm:block w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full skeleton-shimmer-item" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AreasSectionSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
        <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg skeleton-shimmer-item" />
            <div className="flex-1">
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mb-1" />
              <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function InsightsSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="p-3 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
              <div className="flex-1">
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mb-1" />
                <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function RecommendationSkeleton() {
  return (
    <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl border border-violet-200 dark:border-violet-800/50 p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-violet-200 dark:bg-violet-800/50 rounded-lg skeleton-shimmer-item" />
        <div className="flex-1">
          <div className="h-5 w-48 bg-violet-200 dark:bg-violet-800/50 rounded skeleton-shimmer-item mb-2" />
          <div className="h-4 w-full bg-violet-200 dark:bg-violet-800/50 rounded skeleton-shimmer-item mb-1" />
          <div className="h-4 w-2/3 bg-violet-200 dark:bg-violet-800/50 rounded skeleton-shimmer-item" />
        </div>
      </div>
    </div>
  )
}

export function SRSWidgetSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
        <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg skeleton-shimmer-item" />
      </div>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full skeleton-shimmer-item" />
        <div className="flex-1">
          <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mb-2" />
          <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
        </div>
      </div>
    </div>
  )
}

export default LazySection
