export default function ProcessingLoading() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Animated icon placeholder */}
          <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse mx-auto mb-6" />

          {/* Title skeleton */}
          <div className="h-7 w-56 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mx-auto mb-3" />

          {/* Description skeleton */}
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto mb-8" />

          {/* Progress bar skeleton */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>

          {/* Steps skeleton */}
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                <div className="h-4 flex-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
