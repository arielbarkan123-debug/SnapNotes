export default function ExamsLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        <div className="h-10 w-36 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      </div>

      {/* Exam cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              <div>
                <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
                <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
