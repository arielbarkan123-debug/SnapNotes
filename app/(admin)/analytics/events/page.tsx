'use client'

import { useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function EventsPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })

  const { data, isLoading } = useSWR(
    `/api/admin/analytics/events?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
    fetcher
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Events</h1>
        <div className="flex items-center gap-4">
          <input type="date" value={dateRange.startDate}
            onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          <span className="text-gray-500">to</span>
          <input type="date" value={dateRange.endDate}
            onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse grid grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 h-64"></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 h-64"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Events</h3>
            <div className="space-y-3">
              {data?.topEvents?.map((event: { name: string; count: number }, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">{event.name}</span>
                  <span className="text-gray-500">{event.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">By Category</h3>
            <div className="space-y-3">
              {data?.categoryBreakdown?.map((cat: { category: string; count: number }, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300 capitalize">{cat.category}</span>
                  <span className="text-gray-500">{cat.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
