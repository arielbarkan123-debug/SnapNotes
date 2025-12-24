'use client'

import { useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function FunnelsPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })

  const { data, isLoading } = useSWR(
    `/api/admin/analytics/funnels?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
    fetcher
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Funnels</h1>
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
        <div className="animate-pulse space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 h-64"></div>
        </div>
      ) : data?.funnels?.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">No funnel data available yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {data?.funnels?.map((funnel: {
            name: string
            steps: { name: string; count: number; conversionRate: number; dropOffRate: number }[]
            overallConversionRate: number
            totalEntries: number
            totalCompletions: number
          }) => (
            <div key={funnel.name} className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                  {funnel.name.replace(/_/g, ' ')}
                </h3>
                <div className="text-right">
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {funnel.overallConversionRate}%
                  </p>
                  <p className="text-sm text-gray-500">Overall Conversion</p>
                </div>
              </div>
              <div className="relative">
                {funnel.steps.map((step, i) => {
                  const width = Math.max(30, step.conversionRate)
                  return (
                    <div key={step.name} className="flex items-center gap-4 mb-3">
                      <div className="w-32 text-sm text-gray-600 dark:text-gray-400 capitalize truncate">
                        {step.name.replace(/_/g, ' ')}
                      </div>
                      <div className="flex-1 relative">
                        <div
                          className="h-8 bg-indigo-500 rounded flex items-center justify-end px-3"
                          style={{ width: `${width}%` }}
                        >
                          <span className="text-white text-sm font-medium">{step.count}</span>
                        </div>
                      </div>
                      <div className="w-20 text-right">
                        <span className={`text-sm ${step.dropOffRate > 50 ? 'text-red-500' : 'text-gray-500'}`}>
                          {i > 0 ? `-${step.dropOffRate}%` : '-'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
