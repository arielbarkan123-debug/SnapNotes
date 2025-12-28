export default function SettingsLoading() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="mb-4 h-5 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-9 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="mt-2 h-5 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Cards skeleton */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-4 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
              <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
              <div>
                <div className="h-5 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mt-1 h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
            <div className="space-y-4 p-6">
              <div className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
              <div className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
