export default function PrepareGuideLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3" />
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-8" />
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
          </div>
        ))}
      </div>
    </div>
  )
}
