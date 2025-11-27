import { CourseCardSkeletonGrid } from '@/components/course/CourseCardSkeleton'

export default function DashboardLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          {/* Title */}
          <div className="h-9 w-64 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
          {/* Subtitle */}
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mt-2" />
        </div>
        {/* Upload Button Skeleton */}
        <div className="h-12 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg skeleton-shimmer-item" />
      </div>

      {/* Search Bar Skeleton */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <div className="h-11 bg-gray-200 dark:bg-gray-700 rounded-lg skeleton-shimmer-item" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-11 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg skeleton-shimmer-item" />
          <div className="h-11 w-11 bg-gray-200 dark:bg-gray-700 rounded-lg skeleton-shimmer-item" />
        </div>
      </div>

      {/* Course Cards Skeleton */}
      <CourseCardSkeletonGrid count={6} />
    </div>
  )
}
