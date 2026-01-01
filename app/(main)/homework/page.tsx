'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Button from '@/components/ui/Button'
import { useEventTracking } from '@/lib/analytics/hooks'

// ============================================================================
// Types
// ============================================================================

interface RecentItem {
  id: string
  type: 'check' | 'help'
  title: string
  subject: string
  date: string
  status: string
  grade?: string
}

// ============================================================================
// Feature Card Component
// ============================================================================

function FeatureCard({
  icon,
  title,
  description,
  features,
  buttonText,
  buttonIcon,
  href,
  gradient,
  popular,
}: {
  icon: string
  title: string
  description: string
  features: string[]
  buttonText: string
  buttonIcon: string
  href: string
  gradient: string
  popular?: boolean
}) {
  return (
    <div className={`relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-all hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-600`}>
      {popular && (
        <div className="absolute top-4 right-4">
          <span className="px-2.5 py-1 text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full">
            Popular
          </span>
        </div>
      )}

      {/* Gradient Header */}
      <div className={`${gradient} px-6 py-8`}>
        <div className="text-5xl mb-3">{icon}</div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{description}</p>
      </div>

      {/* Features List */}
      <div className="px-6 py-5 space-y-3">
        {features.map((feature, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-300">{feature}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="px-6 pb-6">
        <Link href={href}>
          <Button variant="primary" size="lg" className="w-full">
            <span className="mr-2">{buttonIcon}</span>
            {buttonText}
          </Button>
        </Link>
      </div>
    </div>
  )
}

// ============================================================================
// Quick Action Card
// ============================================================================

function QuickActionCard({
  icon,
  title,
  description,
  href,
}: {
  icon: string
  title: string
  description: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all group"
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{description}</p>
      </div>
      <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

// ============================================================================
// Stats Card
// ============================================================================

function StatsCard({ value, label, icon }: { value: string; label: string; icon: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  )
}

// ============================================================================
// Page Component
// ============================================================================

export default function HomeworkHubPage() {
  const router = useRouter()
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [stats, setStats] = useState({ checksCount: 0, helpSessions: 0, avgGrade: '-' })
  const [isLoading, setIsLoading] = useState(true)

  // Analytics
  const { trackFeature } = useEventTracking()

  // Track hub view
  useEffect(() => {
    trackFeature('homework_hub_view', { source: 'navigation' })
  }, [trackFeature])

  useEffect(() => {
    async function fetchRecent() {
      try {
        // Fetch recent homework checks
        const checksRes = await fetch('/api/homework/check?limit=3')
        if (checksRes.ok) {
          const { checks } = await checksRes.json()
          const recentChecks: RecentItem[] = (checks || []).map((check: any) => ({
            id: check.id,
            type: 'check' as const,
            title: check.topic || 'Homework Check',
            subject: check.subject || 'General',
            date: new Date(check.created_at).toLocaleDateString(),
            status: check.status,
            grade: check.feedback?.gradeEstimate,
          }))
          setRecentItems(recentChecks)
          setStats(prev => ({ ...prev, checksCount: checks?.length || 0 }))
        }
      } catch {
        // Error handled silently - UI shows empty state
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecent()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* Hero Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl shadow-lg">
              📚
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Homework Hub
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-0.5">
                Your all-in-one homework assistant
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatsCard value={stats.checksCount.toString()} label="Checks Done" icon="✅" />
          <StatsCard value={stats.helpSessions.toString()} label="Help Sessions" icon="🎓" />
          <StatsCard value={stats.avgGrade} label="Avg Grade" icon="📊" />
        </div>

        {/* Main Features */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Choose Your Tool
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Homework Checker */}
            <FeatureCard
              icon="📝"
              title="Homework Checker"
              description="Get your homework reviewed before submitting"
              features={[
                "Upload task & your answer",
                "Instant AI-powered feedback",
                "Grade estimate with explanations",
                "Match teacher's grading style",
                "Actionable improvement tips"
              ]}
              buttonText="Check My Homework"
              buttonIcon="✓"
              href="/homework/check"
              gradient="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20"
              popular
            />

            {/* Homework Helper */}
            <FeatureCard
              icon="🎓"
              title="Homework Helper"
              description="Get guided help to solve problems yourself"
              features={[
                "Socratic tutoring method",
                "Step-by-step guidance",
                "Learn while solving",
                "Hints when you're stuck",
                "Build real understanding"
              ]}
              buttonText="Get Help"
              buttonIcon="💡"
              href="/homework/help"
              gradient="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <QuickActionCard
              icon="📷"
              title="Quick Check"
              description="Upload and check homework instantly"
              href="/homework/check"
            />
            <QuickActionCard
              icon="❓"
              title="Ask for Help"
              description="Get guided help with a problem"
              href="/homework/help"
            />
            <QuickActionCard
              icon="📜"
              title="View History"
              description="See all your past homework"
              href="/homework/history"
            />
            <QuickActionCard
              icon="📈"
              title="My Progress"
              description="Track your improvement over time"
              href="/progress"
            />
          </div>
        </div>

        {/* Recent Activity */}
        {recentItems.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Activity
              </h2>
              <Link
                href="/homework/history"
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                View all
              </Link>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {recentItems.map((item, idx) => (
                <Link
                  key={item.id}
                  href={`/homework/${item.id}`}
                  className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    idx !== recentItems.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-lg">
                      {item.type === 'check' ? '📝' : '🎓'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{item.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.subject} • {item.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.grade && (
                      <span className="px-2.5 py-1 text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                        {item.grade}
                      </span>
                    )}
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && recentItems.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="text-5xl mb-4">🚀</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Ready to get started?
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
              Choose a tool above to check your homework or get help with a problem. Your activity will appear here.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
