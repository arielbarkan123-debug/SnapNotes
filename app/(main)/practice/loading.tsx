export default function PracticeLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header skeleton */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse mx-auto mb-4" />
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mx-auto mb-2" />
        <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto" />
      </div>

      {/* Course selector skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6">
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>

      {/* Start button skeleton */}
      <div className="h-14 w-full bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
    </div>
  )
}
