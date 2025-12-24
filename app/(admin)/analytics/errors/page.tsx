'use client'

import { useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function ErrorsPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })
  const [errorType, setErrorType] = useState<string>('')
  const [page, setPage] = useState(1)

  const { data, error, isLoading } = useSWR(
    `/api/admin/analytics/errors?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&page=${page}${errorType ? `&type=${errorType}` : ''}`,
    fetcher
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Error Tracking</h1>
        <div className="flex items-center gap-4">
          <select
            value={errorType}
            onChange={(e) => setErrorType(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Types</option>
            <option value="javascript">JavaScript</option>
            <option value="api">API</option>
            <option value="network">Network</option>
            <option value="unhandled">Unhandled</option>
          </select>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-red-500">Failed to load error data</p>
      ) : (
        <>
          {/* Error Type Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(data?.typeBreakdown || {}).map(([type, count]) => (
              <div key={type} className="bg-white dark:bg-gray-800 rounded-xl p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{type}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{count as number}</p>
              </div>
            ))}
          </div>

          {/* Top Errors */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Errors</h3>
            <div className="space-y-3">
              {data?.topErrors?.map((err: { message: string; count: number }, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300 font-mono truncate flex-1">
                    {err.message}
                  </p>
                  <span className="ml-4 px-2 py-1 bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 text-xs rounded">
                    {err.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Errors */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Errors ({data?.total || 0})
            </h3>
            <div className="space-y-4">
              {data?.errors?.map((err: {
                id: string
                error_type: string
                error_message: string
                page_path: string
                occurred_at: string
                stack_trace?: string
              }) => (
                <div key={err.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      err.error_type === 'javascript' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      err.error_type === 'api' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {err.error_type}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(err.occurred_at).toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {err.page_path}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white font-mono">
                    {err.error_message}
                  </p>
                  {err.stack_trace && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                        Stack trace
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-x-auto">
                        {err.stack_trace}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {data?.total > data?.limit && (
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-600 dark:text-gray-400">
                  Page {page} of {Math.ceil(data.total / data.limit)}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(data.total / data.limit)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
