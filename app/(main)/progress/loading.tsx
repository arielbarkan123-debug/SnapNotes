export default function ProgressLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-72 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-3" />
            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6">
        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      </div>

      {/* Course progress skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
