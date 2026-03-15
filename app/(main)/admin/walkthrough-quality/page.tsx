'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { WalkthroughSolution, WalkthroughStep } from '@/types/walkthrough'
import { createLogger } from '@/lib/logger'


const log = createLogger('page:admin-walkthrough-quality')
// ============================================================================
// Types
// ============================================================================

interface WalkthroughRecord {
  id: string
  homework_session_id: string
  user_id: string
  question_text: string
  solution: WalkthroughSolution
  generation_status: string
  steps_rendered: number
  total_steps: number
  step_images: string[]
  topic_classified: string | null
  validation_errors: Array<{ type: string; message: string; fixInstruction?: string }> | null
  compilation_failures: number
  user_rating: number | null
  user_feedback: string | null
  created_at: string
  updated_at: string
}

interface QualityStats {
  total: number
  withFeedback: number
  thumbsUp: number
  thumbsDown: number
  failed: number
  withCompilationFailures: number
  byTopic: Record<string, number>
}

// ============================================================================
// Component
// ============================================================================

export default function WalkthroughQualityPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [walkthroughs, setWalkthroughs] = useState<WalkthroughRecord[]>([])
  const [stats, setStats] = useState<QualityStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedWalkthrough, setSelectedWalkthrough] = useState<WalkthroughRecord | null>(null)
  const [filter, setFilter] = useState('all')
  const [topicFilter, setTopicFilter] = useState('')

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
        .maybeSingle()

      if (!adminUser) {
        router.push('/dashboard')
        return
      }

      setIsAdmin(true)
    }

    checkAdmin()
  }, [router])

  // Fetch walkthroughs
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({ filter, limit: '50' })
      if (topicFilter) params.set('topic', topicFilter)

      const res = await fetch(`/api/admin/walkthrough-quality?${params}`)
      const data = await res.json()

      if (data.walkthroughs) {
        setWalkthroughs(data.walkthroughs)
        setStats(data.stats)
      }
    } catch (err) {
      log.error({ detail: err }, 'Failed to fetch walkthroughs')
    } finally {
      setIsLoading(false)
    }
  }, [filter, topicFilter])

  useEffect(() => {
    if (isAdmin) fetchData()
  }, [isAdmin, fetchData])

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString()

  // Loading / not admin
  if (isAdmin === null || (isAdmin && isLoading && walkthroughs.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-transparent p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Walkthrough Quality Review
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review step-by-step walkthroughs with diagrams and student feedback
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            <StatCard label="Total" value={stats.total} color="text-gray-900 dark:text-white" />
            <StatCard label="With Feedback" value={stats.withFeedback} color="text-violet-600" />
            <StatCard label="Thumbs Up" value={stats.thumbsUp} color="text-green-600" />
            <StatCard label="Thumbs Down" value={stats.thumbsDown} color="text-red-600" />
            <StatCard label="Failed/Partial" value={stats.failed} color="text-amber-600" />
            <StatCard label="Compile Errors" value={stats.withCompilationFailures} color="text-orange-600" />
          </div>
        )}

        {/* Topic distribution */}
        {stats && Object.keys(stats.byTopic).length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm mb-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">By Topic</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byTopic)
                .sort(([, a], [, b]) => b - a)
                .map(([topic, count]) => (
                  <button
                    key={topic}
                    onClick={() => setTopicFilter(topicFilter === topic ? '' : topic)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      topicFilter === topic
                        ? 'bg-violet-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-violet-100 dark:hover:bg-violet-900/30'
                    }`}
                  >
                    {topic} ({count})
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
          >
            <option value="all">All Walkthroughs</option>
            <option value="with_feedback">With Feedback</option>
            <option value="thumbs_down">Thumbs Down Only</option>
            <option value="failed">Failed / Partial</option>
          </select>
          <button
            onClick={fetchData}
            className="px-4 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Walkthrough List */}
        <div className="space-y-4">
          {walkthroughs.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400 shadow-sm">
              No walkthroughs found for the selected filters
            </div>
          ) : (
            walkthroughs.map((wt) => (
              <WalkthroughCard
                key={wt.id}
                walkthrough={wt}
                formatRelativeTime={formatRelativeTime}
                formatDate={formatDate}
                onSelect={() => setSelectedWalkthrough(wt)}
              />
            ))
          )}
        </div>

        {/* Detail Modal */}
        {selectedWalkthrough && (
          <WalkthroughDetailModal
            walkthrough={selectedWalkthrough}
            onClose={() => setSelectedWalkthrough(null)}
            formatDate={formatDate}
          />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Sub-Components
// ============================================================================

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  )
}

/** Card showing one walkthrough session in the list */
function WalkthroughCard({
  walkthrough: wt,
  formatRelativeTime,
  formatDate,
  onSelect,
}: {
  walkthrough: WalkthroughRecord
  formatRelativeTime: (d: string) => string
  formatDate: (d: string) => string
  onSelect: () => void
}) {
  const hasImages = wt.step_images?.some(Boolean)
  const ratingIcon = wt.user_rating === 5 ? '👍' : wt.user_rating === 1 ? '👎' : null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200/60 dark:border-gray-700/40">
      {/* Top bar: meta + rating */}
      <div className="px-4 py-3 flex items-start justify-between gap-4 border-b border-gray-100 dark:border-gray-700/40">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {wt.question_text || '(no question text)'}
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span>{formatRelativeTime(wt.created_at)}</span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span>{formatDate(wt.created_at)}</span>
            {wt.topic_classified && (
              <>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-full font-medium">
                  {wt.topic_classified}
                </span>
              </>
            )}
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <StatusBadge status={wt.generation_status} />
            {wt.compilation_failures > 0 && (
              <>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span className="text-orange-600 dark:text-orange-400 font-medium">
                  {wt.compilation_failures} compile fail{wt.compilation_failures > 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {ratingIcon && (
            <span className="text-2xl" title={`User rated: ${wt.user_rating}`}>
              {ratingIcon}
            </span>
          )}
          <button
            onClick={onSelect}
            className="px-3 py-1.5 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
          >
            View Details
          </button>
        </div>
      </div>

      {/* User feedback text (if any) */}
      {wt.user_feedback && (
        <div className="px-4 py-2 bg-red-50/50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-400">
            <span className="font-medium">Student feedback:</span> {wt.user_feedback}
          </p>
        </div>
      )}

      {/* Step images preview (first 4) */}
      {hasImages && (
        <div className="px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {wt.step_images.slice(0, 6).map((url, i) => (
              <div key={i} className="shrink-0">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt={`Step ${i + 1}`}
                    className="h-20 w-auto rounded-lg border border-gray-200 dark:border-gray-700 object-contain bg-white"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs text-gray-400">
                    Failed
                  </div>
                )}
              </div>
            ))}
            {wt.step_images.length > 6 && (
              <div className="h-20 w-16 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                +{wt.step_images.length - 6}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Steps summary when no images */}
      {!hasImages && wt.solution?.steps && (
        <div className="px-4 py-3">
          <div className="flex gap-1">
            {wt.solution.steps.slice(0, 8).map((step, i) => (
              <div
                key={i}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400 truncate max-w-[140px]"
                title={step.title}
              >
                {i + 1}. {step.title}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    complete: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    partial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    compiling: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    generating: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  }

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  )
}

/** Full-screen modal showing walkthrough details: all steps + diagrams + feedback */
function WalkthroughDetailModal({
  walkthrough: wt,
  onClose,
  formatDate,
}: {
  walkthrough: WalkthroughRecord
  onClose: () => void
  formatDate: (d: string) => string
}) {
  const steps = wt.solution?.steps || []
  const [activeStep, setActiveStep] = useState(0)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full my-8 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Walkthrough Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{formatDate(wt.created_at)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Question */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Question</label>
            <p className="mt-1 text-gray-900 dark:text-white">{wt.question_text || '(no text)'}</p>
          </div>

          {/* Meta row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetaItem label="Topic" value={wt.topic_classified || 'unknown'} />
            <MetaItem label="Status" value={wt.generation_status} />
            <MetaItem label="Steps" value={`${wt.steps_rendered}/${wt.total_steps} rendered`} />
            <MetaItem label="Compile Failures" value={String(wt.compilation_failures || 0)} />
          </div>

          {/* User feedback */}
          {(wt.user_rating !== null || wt.user_feedback) && (
            <div className={`rounded-xl p-4 border ${
              wt.user_rating === 1
                ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30'
                : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{wt.user_rating === 5 ? '👍' : wt.user_rating === 1 ? '👎' : '—'}</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Student Rating: {wt.user_rating === 5 ? 'Helpful' : wt.user_rating === 1 ? 'Not helpful' : 'No rating'}
                </span>
              </div>
              {wt.user_feedback && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 italic">
                  &quot;{wt.user_feedback}&quot;
                </p>
              )}
            </div>
          )}

          {/* Validation errors */}
          {wt.validation_errors && wt.validation_errors.length > 0 && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-4">
              <h4 className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">Validation Errors</h4>
              <div className="space-y-1">
                {wt.validation_errors.map((err, i) => (
                  <div key={i} className="text-xs text-amber-600 dark:text-amber-400 font-mono">
                    [{err.type}] {err.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step-by-step viewer */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Steps ({steps.length})
            </h3>

            {/* Step tabs */}
            <div className="flex gap-1 overflow-x-auto pb-2 mb-4">
              {steps.map((step, i) => {
                const hasImage = wt.step_images?.[i]
                return (
                  <button
                    key={i}
                    onClick={() => setActiveStep(i)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      activeStep === i
                        ? 'bg-violet-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span>Step {i + 1}</span>
                    {hasImage ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" title="Has diagram" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" title="No diagram" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Active step content */}
            {steps[activeStep] && (
              <StepViewer
                step={steps[activeStep]}
                stepIndex={activeStep}
                imageUrl={wt.step_images?.[activeStep] || null}
              />
            )}
          </div>

          {/* Final answer */}
          {wt.solution?.finalAnswer && (
            <div className="rounded-xl bg-green-50/60 dark:bg-green-900/10 border border-green-200/40 dark:border-green-900/30 p-4">
              <label className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider">Final Answer</label>
              <p className="mt-1 text-gray-900 dark:text-white text-sm">{wt.solution.finalAnswer}</p>
              {wt.solution.finalAnswerHe && (
                <p className="mt-1 text-gray-600 dark:text-gray-400 text-sm" dir="rtl">{wt.solution.finalAnswerHe}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</div>
      <div className="mt-0.5 text-sm text-gray-900 dark:text-white font-medium">{value}</div>
    </div>
  )
}

/** Renders a single step: diagram image + title + explanation (EN + HE) */
function StepViewer({
  step,
  stepIndex,
  imageUrl,
}: {
  step: WalkthroughStep
  stepIndex: number
  imageUrl: string | null
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Diagram image */}
      {imageUrl ? (
        <div className="bg-white dark:bg-gray-900 p-4 flex items-center justify-center border-b border-gray-200 dark:border-gray-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`Step ${stepIndex + 1} diagram`}
            className="max-w-full max-h-[400px] object-contain"
          />
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">No diagram for this step</p>
        </div>
      )}

      {/* Step text */}
      <div className="p-4 space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Step {stepIndex + 1}: {step.title}
          </h4>
          {step.titleHe && (
            <p className="text-sm text-gray-500 dark:text-gray-400" dir="rtl">{step.titleHe}</p>
          )}
        </div>

        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{step.explanation}</p>
          {step.explanationHe && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 whitespace-pre-wrap" dir="rtl">{step.explanationHe}</p>
          )}
        </div>

        {step.equation && (
          <div className="bg-violet-50 dark:bg-violet-900/15 rounded-lg px-3 py-2">
            <span className="text-xs text-violet-500 dark:text-violet-400 font-medium mr-2">Equation:</span>
            <code className="text-sm text-violet-800 dark:text-violet-300 font-mono">{step.equation}</code>
          </div>
        )}

        {step.newElements && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium">New elements:</span> {step.newElements}
          </div>
        )}
      </div>
    </div>
  )
}
