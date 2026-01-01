export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header skeleton */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-5 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
            >
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Filters skeleton */}
        <div className="flex gap-3 mb-6">
          <div className="h-10 w-36 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-10 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
            >
              <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
              <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
