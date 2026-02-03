'use client'

import Link from 'next/link'

export default function OfflinePage() {
  return (
    <div className="min-h-screen aurora-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Offline icon */}
        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-12 h-12 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a5 5 0 01-.707-7.071M3 3l18 18"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          You&apos;re Offline
        </h1>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Don&apos;t worry! Your previously viewed courses are still available offline.
          Connect to the internet to access new content.
        </p>

        {/* Actions */}
        <div className="space-y-4">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-6 bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-full font-semibold hover:from-violet-600 hover:to-violet-700 transition-colors"
          >
            Try Again
          </button>

          <Link
            href="/dashboard"
            className="block w-full py-3 px-6 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-full font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            View Cached Courses
          </Link>
        </div>

        {/* Offline tips */}
        <div className="mt-10 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
          <h3 className="font-semibold text-violet-900 dark:text-violet-200 mb-2">
            Offline Mode Tips
          </h3>
          <ul className="text-sm text-violet-700 dark:text-violet-300 text-left space-y-1">
            <li>• Courses you&apos;ve opened before are available offline</li>
            <li>• Your progress is saved locally and syncs when online</li>
            <li>• New courses require an internet connection</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
