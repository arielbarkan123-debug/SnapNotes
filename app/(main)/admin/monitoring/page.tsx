'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

// ============================================================================
// Types
// ============================================================================

interface ErrorLog {
  id: string
  error_type: string
  error_message: string
  error_stack?: string
  component_name?: string
  page_path?: string
  user_id?: string
  session_id?: string
  user_agent?: string
  browser?: string
  browser_version?: string
  os?: string
  os_version?: string
  device_type?: string
  screen_resolution?: string
  context?: Record<string, unknown>
  api_endpoint?: string
  http_method?: string
  http_status?: number
  created_at: string
  error_hash: string
}

interface ErrorStats {
  total: number
  byType: Record<string, number>
  byPage: Record<string, number>
  last24h: number
  lastHour: number
}

// ============================================================================
// Component
// ============================================================================

export default function MonitoringDashboard() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [errors, setErrors] = useState<ErrorLog[]>([])
  const [stats, setStats] = useState<ErrorStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null)
  const [timeRange, setTimeRange] = useState('24h')
  const [errorType, setErrorType] = useState<string>('')
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Check admin access
  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!adminUser) {
        router.push('/dashboard')
        return
      }

      setIsAdmin(true)
    }

    checkAdmin()
  }, [router])

  // Fetch errors
  const fetchErrors = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        range: timeRange,
        limit: '100',
      })
      if (errorType) params.set('type', errorType)

      const response = await fetch(`/api/monitoring/errors?${params}`)
      const data = await response.json()

      if (data.errors) {
        setErrors(data.errors)
        calculateStats(data.errors)
      }
    } catch (err) {
      console.error('Failed to fetch errors:', err)
    } finally {
      setIsLoading(false)
    }
  }, [timeRange, errorType])

  // Calculate stats from errors
  const calculateStats = (errorList: ErrorLog[]) => {
    const now = Date.now()
    const hourAgo = now - 60 * 60 * 1000
    const dayAgo = now - 24 * 60 * 60 * 1000

    const byType: Record<string, number> = {}
    const byPage: Record<string, number> = {}
    let lastHour = 0
    let last24h = 0

    errorList.forEach(err => {
      // Count by type
      byType[err.error_type] = (byType[err.error_type] || 0) + 1

      // Count by page
      if (err.page_path) {
        byPage[err.page_path] = (byPage[err.page_path] || 0) + 1
      }

      // Count by time
      const errorTime = new Date(err.created_at).getTime()
      if (errorTime > hourAgo) lastHour++
      if (errorTime > dayAgo) last24h++
    })

    setStats({
      total: errorList.length,
      byType,
      byPage,
      lastHour,
      last24h,
    })
  }

  // Initial fetch
  useEffect(() => {
    if (isAdmin) {
      fetchErrors()
    }
  }, [isAdmin, fetchErrors])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!isAdmin || !autoRefresh) return

    const interval = setInterval(fetchErrors, 30000)
    return () => clearInterval(interval)
  }, [isAdmin, autoRefresh, fetchErrors])

  // Clear old errors
  const handleClearOld = async () => {
    if (!confirm('Delete errors older than 7 days?')) return

    try {
      await fetch('/api/monitoring/errors?olderThan=7d', { method: 'DELETE' })
      fetchErrors()
    } catch (err) {
      console.error('Failed to clear errors:', err)
    }
  }

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString()
  }

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  if (isAdmin === null || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Error Monitoring
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track and debug application errors in real-time
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300"
              />
              Auto-refresh
            </label>
            <Button onClick={fetchErrors} variant="secondary" size="sm">
              Refresh
            </Button>
            <Button onClick={handleClearOld} variant="secondary" size="sm">
              Clear Old
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Errors</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="text-sm text-gray-500 dark:text-gray-400">Last Hour</div>
              <div className="text-2xl font-bold text-red-600">{stats.lastHour}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="text-sm text-gray-500 dark:text-gray-400">Last 24h</div>
              <div className="text-2xl font-bold text-amber-600">{stats.last24h}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="text-sm text-gray-500 dark:text-gray-400">Error Types</div>
              <div className="text-2xl font-bold text-indigo-600">{Object.keys(stats.byType).length}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <select
            value={errorType}
            onChange={(e) => setErrorType(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
          >
            <option value="">All Types</option>
            <option value="javascript">JavaScript</option>
            <option value="api">API</option>
            <option value="network">Network</option>
            <option value="unhandled">Unhandled</option>
          </select>
        </div>

        {/* Error List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Message</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Page</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Device</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {errors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No errors found for the selected time range
                    </td>
                  </tr>
                ) : (
                  errors.map((error) => (
                    <tr key={error.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        <div>{formatRelativeTime(error.created_at)}</div>
                        <div className="text-xs text-gray-400">{formatDate(error.created_at)}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          error.error_type === 'javascript' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          error.error_type === 'api' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          error.error_type === 'network' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        }`}>
                          {error.error_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-md">
                        <div className="text-sm text-gray-900 dark:text-white truncate">
                          {error.error_message}
                        </div>
                        {error.component_name && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            in {error.component_name}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {error.page_path || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        <div>{error.device_type || 'Unknown'}</div>
                        <div className="text-xs text-gray-400">{error.browser} {error.browser_version}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedError(error)}
                          className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Error Detail Modal */}
        {selectedError && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedError(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Error Details</h3>
                <button onClick={() => setSelectedError(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Error Message</div>
                  <div className="text-red-600 dark:text-red-400 font-mono text-sm break-all">{selectedError.error_message}</div>
                </div>

                {selectedError.error_stack && (
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Stack Trace</div>
                    <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                      {selectedError.error_stack}
                    </pre>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Page</div>
                    <div className="text-gray-900 dark:text-white">{selectedError.page_path || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Component</div>
                    <div className="text-gray-900 dark:text-white">{selectedError.component_name || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Browser</div>
                    <div className="text-gray-900 dark:text-white">{selectedError.browser} {selectedError.browser_version}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">OS</div>
                    <div className="text-gray-900 dark:text-white">{selectedError.os} {selectedError.os_version}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Device</div>
                    <div className="text-gray-900 dark:text-white">{selectedError.device_type || 'Unknown'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Screen</div>
                    <div className="text-gray-900 dark:text-white">{selectedError.screen_resolution || '-'}</div>
                  </div>
                </div>

                {selectedError.context && Object.keys(selectedError.context).length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Context</div>
                    <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                      {JSON.stringify(selectedError.context, null, 2)}
                    </pre>
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">User Agent</div>
                  <div className="text-gray-600 dark:text-gray-400 text-xs break-all">{selectedError.user_agent}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Timestamp</div>
                  <div className="text-gray-900 dark:text-white">{formatDate(selectedError.created_at)}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
