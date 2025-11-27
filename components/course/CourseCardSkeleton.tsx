'use client'

// ============================================================================
// Course Card Skeleton
// Matches the layout of CourseCard for seamless loading states
// ============================================================================

interface CourseCardSkeletonProps {
  className?: string
}

export function CourseCardSkeleton({ className = '' }: CourseCardSkeletonProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* Image placeholder - matches aspect ratio */}
      <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent skeleton-shimmer" />
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-4/5 mb-3 skeleton-shimmer-item" />

        {/* Key concepts tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full skeleton-shimmer-item" />
          <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full skeleton-shimmer-item" />
          <div className="h-6 w-14 bg-gray-200 dark:bg-gray-700 rounded-full skeleton-shimmer-item" />
        </div>

        {/* Overview text */}
        <div className="space-y-2 mb-4">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6 skeleton-shimmer-item" />
        </div>

        {/* Footer - date */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
          <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Course Card Skeleton Grid
// For loading multiple cards at once
// ============================================================================

interface CourseCardSkeletonGridProps {
  count?: number
}

export function CourseCardSkeletonGrid({ count = 6 }: CourseCardSkeletonGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <CourseCardSkeleton key={index} />
      ))}
    </div>
  )
}

export default CourseCardSkeleton
