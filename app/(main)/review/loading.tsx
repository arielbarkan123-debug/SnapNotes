export default function ReviewLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Card skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse mb-4" />
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
}
