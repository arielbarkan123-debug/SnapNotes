'use client'

import { useState } from 'react'
import { type CourseSection } from '@/types'

interface CourseContentProps {
  sections: CourseSection[]
}

export default function CourseContent({ sections }: CourseContentProps) {
  // Safely handle null/undefined sections
  const safeSections = sections || []
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set(safeSections.map((_, i) => i)) // All expanded by default
  )

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedSections(newExpanded)
  }

  const expandAll = () => {
    setExpandedSections(new Set(safeSections.map((_, i) => i)))
  }

  const collapseAll = () => {
    setExpandedSections(new Set())
  }

  if (safeSections.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-[22px] shadow-card p-8 border border-gray-100 dark:border-gray-700 text-center">
        <p className="text-gray-500 dark:text-gray-400">No sections available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-end gap-2 text-sm">
        <button
          onClick={expandAll}
          className="text-violet-600 dark:text-violet-400 hover:underline"
        >
          Expand All
        </button>
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <button
          onClick={collapseAll}
          className="text-violet-600 dark:text-violet-400 hover:underline"
        >
          Collapse All
        </button>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {safeSections.map((section, index) => (
          <SectionCard
            key={index}
            section={section}
            index={index}
            isExpanded={expandedSections.has(index)}
            onToggle={() => toggleSection(index)}
            totalSections={safeSections.length}
          />
        ))}
      </div>
    </div>
  )
}

interface SectionCardProps {
  section: CourseSection
  index: number
  isExpanded: boolean
  onToggle: () => void
  totalSections: number
}

function SectionCard({ section, index, isExpanded, onToggle, totalSections }: SectionCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-[22px] shadow-card border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-start hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-4">
          <span className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-500 text-white rounded-xl text-sm font-bold shadow-sm">
            {index + 1}
          </span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {section.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Section {index + 1} of {totalSections}
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Section Content */}
      {isExpanded && (
        <div className="px-5 pb-6 space-y-6 border-t border-gray-100 dark:border-gray-700">
          {/* Explanation */}
          <div className="pt-5">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {section.explanation}
            </p>
          </div>

          {/* Original Notes Quote */}
          {section.originalNotes && (
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-orange-400 rounded-full" />
              <div className="pl-5">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-2">
                  From Your Notes
                </p>
                <blockquote className="text-gray-600 dark:text-gray-400 italic leading-relaxed">
                  &ldquo;{section.originalNotes}&rdquo;
                </blockquote>
              </div>
            </div>
          )}

          {/* Key Points */}
          {section.keyPoints && section.keyPoints.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-green-800 dark:text-green-300 uppercase tracking-wide mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Key Points
              </h4>
              <ul className="space-y-2">
                {section.keyPoints.map((point, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-gray-700 dark:text-gray-300"
                  >
                    <span className="flex-shrink-0 w-5 h-5 mt-0.5 flex items-center justify-center bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                      {i + 1}
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Formulas */}
          {section.formulas && section.formulas.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Formulas
              </h4>
              <div className="space-y-3">
                {section.formulas.map((formula, i) => (
                  <div
                    key={i}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                  >
                    <code className="block text-lg text-violet-600 dark:text-violet-400 font-mono mb-2 overflow-x-auto">
                      {formula.formula}
                    </code>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formula.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Diagrams */}
          {section.diagrams && section.diagrams.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Diagrams &amp; Visuals
              </h4>
              <div className="space-y-3">
                {section.diagrams.map((diagram, i) => (
                  <div
                    key={i}
                    className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800"
                  >
                    <p className="font-medium text-blue-900 dark:text-blue-200 mb-1">
                      {diagram.description}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <span className="font-medium">Significance:</span> {diagram.significance}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Examples */}
          {section.examples && section.examples.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Examples
              </h4>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-100 dark:border-purple-800">
                <ul className="space-y-3">
                  {section.examples.map((example, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-gray-700 dark:text-gray-300"
                    >
                      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-bold">
                        {i + 1}
                      </span>
                      <span>{example}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
