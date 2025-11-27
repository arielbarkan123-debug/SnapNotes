export default function CourseLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Breadcrumb Skeleton */}
      <nav className="flex items-center gap-2 mb-6">
        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
      </nav>

      {/* Header Skeleton */}
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="h-9 w-3/4 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mb-3" />
            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg skeleton-shimmer-item" />
            <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg skeleton-shimmer-item" />
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-8">
          {/* Overview Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg skeleton-shimmer-item" />
              <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <div className="space-y-3">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
                <div className="h-5 w-11/12 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
                <div className="h-5 w-4/5 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
                <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
              </div>
            </div>
          </section>

          {/* Key Concepts Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg skeleton-shimmer-item" />
              <div className="h-7 w-32 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <div className="flex flex-wrap gap-2">
                {[80, 100, 60, 90, 70].map((width, i) => (
                  <div
                    key={i}
                    className="h-9 bg-gray-200 dark:bg-gray-700 rounded-full skeleton-shimmer-item"
                    style={{ width: `${width}px` }}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Course Content Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg skeleton-shimmer-item" />
              <div className="h-7 w-36 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
                >
                  <div className="p-4 flex items-center gap-4">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full skeleton-shimmer-item flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
                    </div>
                    <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Summary Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg skeleton-shimmer-item" />
              <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6 border border-amber-100 dark:border-amber-800">
              <div className="space-y-3">
                <div className="h-4 bg-amber-200/50 dark:bg-amber-800/50 rounded skeleton-shimmer-item" />
                <div className="h-4 w-5/6 bg-amber-200/50 dark:bg-amber-800/50 rounded skeleton-shimmer-item" />
                <div className="h-4 w-4/5 bg-amber-200/50 dark:bg-amber-800/50 rounded skeleton-shimmer-item" />
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Original Image Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700 sticky top-4">
            <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mb-3" />
            <div className="aspect-[3/4] bg-gray-200 dark:bg-gray-700 rounded-lg skeleton-shimmer-item" />
          </div>

          {/* Further Study */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
            <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mt-0.5" />
                  <div className="h-4 flex-1 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mb-4" />
            <div className="space-y-2">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg skeleton-shimmer-item" />
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg skeleton-shimmer-item" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
