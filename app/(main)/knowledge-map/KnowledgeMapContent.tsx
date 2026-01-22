'use client'

// =============================================================================
// Knowledge Map Content
// Interactive visualization of concepts and mastery levels
// =============================================================================

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEventTracking, useFunnelTracking } from '@/lib/analytics/hooks'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface Concept {
  id: string
  name: string
  description: string | null
  subject: string
  topic: string
  subtopic: string | null
  difficultyLevel: number
  masteryLevel: number
  totalExposures: number
  successfulRecalls: number
  lastReviewedAt: string | null
  hasGap: boolean
  gapType: string | null
  gapSeverity: string | null
}

interface Edge {
  from: string
  to: string
  strength: number
}

interface Course {
  id: string
  title: string
}

interface KnowledgeMapContentProps {
  concepts: Concept[]
  edges: Edge[]
  courses: Course[]
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function getMasteryColor(level: number): string {
  if (level >= 0.8) return 'bg-green-500'
  if (level >= 0.6) return 'bg-green-400'
  if (level >= 0.4) return 'bg-yellow-400'
  if (level >= 0.2) return 'bg-orange-400'
  if (level > 0) return 'bg-red-400'
  return 'bg-gray-300 dark:bg-gray-600'
}

function getMasteryLabel(level: number): string {
  if (level >= 0.8) return 'Mastered'
  if (level >= 0.6) return 'Proficient'
  if (level >= 0.4) return 'Learning'
  if (level >= 0.2) return 'Beginner'
  if (level > 0) return 'Started'
  return 'Not Started'
}

function getMasteryTextColor(level: number): string {
  if (level >= 0.8) return 'text-green-600 dark:text-green-400'
  if (level >= 0.6) return 'text-green-500 dark:text-green-400'
  if (level >= 0.4) return 'text-yellow-600 dark:text-yellow-400'
  if (level >= 0.2) return 'text-orange-600 dark:text-orange-400'
  if (level > 0) return 'text-red-600 dark:text-red-400'
  return 'text-gray-500 dark:text-gray-400'
}

// -----------------------------------------------------------------------------
// Concept Card Component
// -----------------------------------------------------------------------------

interface ConceptCardProps {
  concept: Concept
  isSelected: boolean
  onClick: () => void
}

function ConceptCard({ concept, isSelected, onClick }: ConceptCardProps) {
  const masteryPercent = Math.round(concept.masteryLevel * 100)

  return (
    <button
      onClick={onClick}
      className={`
        w-full p-4 rounded-lg border text-left transition-all
        ${isSelected
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-500'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
        }
        ${concept.hasGap ? 'ring-1 ring-amber-400' : ''}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-white truncate">
            {concept.name}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {concept.topic}
          </p>
        </div>
        {concept.hasGap && (
          <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">
            Gap
          </span>
        )}
      </div>

      {/* Mastery Bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-medium ${getMasteryTextColor(concept.masteryLevel)}`}>
            {getMasteryLabel(concept.masteryLevel)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {masteryPercent}%
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${getMasteryColor(concept.masteryLevel)} transition-all duration-300`}
            style={{ width: `${masteryPercent}%` }}
          />
        </div>
      </div>
    </button>
  )
}

// -----------------------------------------------------------------------------
// Concept Detail Panel
// -----------------------------------------------------------------------------

interface ConceptDetailProps {
  concept: Concept
  prerequisites: Concept[]
  dependents: Concept[]
  onClose: () => void
  onPractice: () => void
}

function ConceptDetail({
  concept,
  prerequisites,
  dependents,
  onClose,
  onPractice,
}: ConceptDetailProps) {
  const masteryPercent = Math.round(concept.masteryLevel * 100)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {concept.name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {concept.subject} → {concept.topic}
            {concept.subtopic && ` → ${concept.subtopic}`}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Description */}
      {concept.description && (
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {concept.description}
        </p>
      )}

      {/* Mastery Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className={`text-2xl font-bold ${getMasteryTextColor(concept.masteryLevel)}`}>
            {masteryPercent}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Mastery</p>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {concept.totalExposures}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Exposures</p>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {concept.totalExposures > 0
              ? Math.round((concept.successfulRecalls / concept.totalExposures) * 100)
              : 0}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Recall Rate</p>
        </div>
      </div>

      {/* Gap Warning */}
      {concept.hasGap && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400">⚠️</span>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Knowledge Gap Detected
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {concept.gapType?.replace('_', ' ')} ({concept.gapSeverity})
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Prerequisites */}
      {prerequisites.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Prerequisites ({prerequisites.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {prerequisites.map((prereq) => (
              <span
                key={prereq.id}
                className={`
                  px-2 py-1 rounded text-xs font-medium
                  ${prereq.masteryLevel >= 0.6
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  }
                `}
              >
                {prereq.name}
                {prereq.masteryLevel >= 0.6 ? ' ✓' : ' ⚠'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Unlocks */}
      {dependents.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Unlocks ({dependents.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {dependents.map((dep) => (
              <span
                key={dep.id}
                className="px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {dep.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onPractice}
          className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
        >
          Practice This Concept
        </button>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export default function KnowledgeMapContent({
  concepts,
  edges,
  courses: _courses,
}: KnowledgeMapContentProps) {
  const router = useRouter()
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null)
  const [filterSubject, setFilterSubject] = useState<string>('')
  const [filterMastery, setFilterMastery] = useState<string>('')
  const [showGapsOnly, setShowGapsOnly] = useState(false)

  // Analytics
  const { trackFeature } = useEventTracking()
  const { trackStep } = useFunnelTracking('knowledge_map')

  // Track page view on mount
  useEffect(() => {
    trackStep('map_opened', 1)
    trackFeature('knowledge_map_view', {
      totalConcepts: concepts.length,
      masteredCount: concepts.filter(c => c.masteryLevel >= 0.8).length,
      gapsCount: concepts.filter(c => c.hasGap).length,
    })
  }, [trackStep, trackFeature, concepts])

  // Get unique subjects
  const subjects = useMemo(() => {
    const uniqueSubjects = [...new Set(concepts.map((c) => c.subject))]
    return uniqueSubjects.sort()
  }, [concepts])

  // Filter concepts
  const filteredConcepts = useMemo(() => {
    return concepts.filter((c) => {
      if (filterSubject && c.subject !== filterSubject) return false
      if (showGapsOnly && !c.hasGap) return false
      if (filterMastery === 'mastered' && c.masteryLevel < 0.8) return false
      if (filterMastery === 'learning' && (c.masteryLevel >= 0.8 || c.masteryLevel === 0)) return false
      if (filterMastery === 'not_started' && c.masteryLevel > 0) return false
      return true
    })
  }, [concepts, filterSubject, filterMastery, showGapsOnly])

  // Group by topic
  const groupedConcepts = useMemo(() => {
    const groups = new Map<string, Concept[]>()
    for (const concept of filteredConcepts) {
      const key = `${concept.subject} / ${concept.topic}`
      const existing = groups.get(key)
      if (existing) {
        existing.push(concept)
      } else {
        groups.set(key, [concept])
      }
    }
    return groups
  }, [filteredConcepts])

  // Get selected concept details
  const selectedConcept = selectedConceptId
    ? concepts.find((c) => c.id === selectedConceptId)
    : null

  const prerequisites = selectedConceptId
    ? edges
        .filter((e) => e.to === selectedConceptId)
        .map((e) => concepts.find((c) => c.id === e.from))
        .filter((c): c is Concept => c !== undefined)
    : []

  const dependents = selectedConceptId
    ? edges
        .filter((e) => e.from === selectedConceptId)
        .map((e) => concepts.find((c) => c.id === e.to))
        .filter((c): c is Concept => c !== undefined)
    : []

  // Calculate stats
  const totalConcepts = concepts.length
  const masteredCount = concepts.filter((c) => c.masteryLevel >= 0.8).length
  const learningCount = concepts.filter((c) => c.masteryLevel > 0 && c.masteryLevel < 0.8).length
  const gapsCount = concepts.filter((c) => c.hasGap).length
  const overallMastery = totalConcepts > 0
    ? Math.round((concepts.reduce((sum, c) => sum + c.masteryLevel, 0) / totalConcepts) * 100)
    : 0

  // Track concept selection
  const handleConceptSelect = (conceptId: string | null) => {
    if (conceptId && conceptId !== selectedConceptId) {
      const concept = concepts.find(c => c.id === conceptId)
      if (concept) {
        trackStep('concept_viewed', 2)
        trackFeature('knowledge_map_concept_view', {
          conceptId,
          conceptName: concept.name,
          masteryLevel: concept.masteryLevel,
          hasGap: concept.hasGap,
        })
      }
    }
    setSelectedConceptId(conceptId)
  }

  const handlePractice = () => {
    if (selectedConceptId) {
      const concept = concepts.find(c => c.id === selectedConceptId)
      trackStep('action_taken', 5)
      trackFeature('knowledge_map_practice_click', {
        conceptId: selectedConceptId,
        conceptName: concept?.name,
        hasGap: concept?.hasGap,
      })
      router.push(`/practice?conceptIds=${selectedConceptId}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Knowledge Map
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Visualize your concept mastery and learning progress
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalConcepts}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Concepts</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{masteredCount}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Mastered</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{learningCount}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Learning</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{gapsCount}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gaps</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{overallMastery}%</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Overall Mastery</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All Subjects</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>

          <select
            value={filterMastery}
            onChange={(e) => setFilterMastery(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All Mastery Levels</option>
            <option value="mastered">Mastered (80%+)</option>
            <option value="learning">Learning (1-79%)</option>
            <option value="not_started">Not Started</option>
          </select>

          <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showGapsOnly}
              onChange={(e) => setShowGapsOnly(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-gray-700 dark:text-gray-300">Gaps Only</span>
          </label>
        </div>

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Concept Grid */}
          <div className="flex-1">
            {filteredConcepts.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No Concepts Found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {concepts.length === 0
                    ? 'Complete some lessons to start building your knowledge map.'
                    : 'Try adjusting your filters.'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Array.from(groupedConcepts.entries()).map(([group, groupConcepts]) => (
                  <div key={group}>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                      {group}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {groupConcepts.map((concept) => (
                        <ConceptCard
                          key={concept.id}
                          concept={concept}
                          isSelected={concept.id === selectedConceptId}
                          onClick={() => handleConceptSelect(
                            concept.id === selectedConceptId ? null : concept.id
                          )}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selectedConcept && (
            <div className="hidden lg:block w-96 flex-shrink-0">
              <div className="sticky top-8">
                <ConceptDetail
                  concept={selectedConcept}
                  prerequisites={prerequisites}
                  dependents={dependents}
                  onClose={() => handleConceptSelect(null)}
                  onPractice={handlePractice}
                />
              </div>
            </div>
          )}
        </div>

        {/* Mobile Detail Modal */}
        {selectedConcept && (
          <div className="lg:hidden fixed inset-0 bg-black/50 z-50 flex items-end">
            <div className="w-full max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-t-2xl">
              <div className="p-4">
                <ConceptDetail
                  concept={selectedConcept}
                  prerequisites={prerequisites}
                  dependents={dependents}
                  onClose={() => handleConceptSelect(null)}
                  onPractice={handlePractice}
                />
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Legend</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Mastered (80%+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Learning (40-79%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Beginner (1-39%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-300 dark:bg-gray-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Not Started</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">Gap</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">Knowledge Gap</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
