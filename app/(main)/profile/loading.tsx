export default function ProfileLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header skeleton */}
      <div className="text-center mb-8">
        <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse mx-auto mb-4" />
        <div className="h-7 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mx-auto mb-2" />
        <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm">
            <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto mb-1" />
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto" />
          </div>
        ))}
      </div>

      {/* Settings skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
