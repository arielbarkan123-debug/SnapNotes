export default function OnboardingLoading() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress bar skeleton */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>

        {/* Card skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Icon skeleton */}
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse mx-auto mb-6" />

          {/* Title skeleton */}
          <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mx-auto mb-2" />

          {/* Description skeleton */}
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto mb-8" />

          {/* Options skeleton */}
          <div className="space-y-3 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-14 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse"
              />
            ))}
          </div>

          {/* Button skeleton */}
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  )
}
