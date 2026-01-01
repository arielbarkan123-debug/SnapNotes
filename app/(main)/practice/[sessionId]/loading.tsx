export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>

        {/* Progress bar skeleton */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>

        {/* Question card skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="h-8 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
          <div className="space-y-3 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-14 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
              />
            ))}
          </div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  )
}
