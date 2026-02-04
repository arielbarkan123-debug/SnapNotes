'use client'

import { useEffect, useRef, useCallback } from 'react'
import GuideSectionRenderer from './GuideSectionRenderer'
import type { GuideTopic, GuideSection } from '@/types/prepare'

interface GuideRendererProps {
  topics: GuideTopic[]
  quickReference?: GuideSection
  onSectionVisible: (sectionId: string) => void
  onAskAboutSection: (sectionTitle: string) => void
}

export default function GuideRenderer({
  topics,
  quickReference,
  onSectionVisible,
  onAskAboutSection,
}: GuideRendererProps) {
  const observerRef = useRef<IntersectionObserver | null>(null)

  const setupObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            onSectionVisible(entry.target.id)
          }
        }
      },
      {
        rootMargin: '-100px 0px -60% 0px',
        threshold: 0,
      }
    )

    // Observe all topic and section elements
    const elements = document.querySelectorAll('[data-guide-section]')
    elements.forEach((el) => observerRef.current?.observe(el))

    return () => observerRef.current?.disconnect()
  }, [onSectionVisible])

  useEffect(() => {
    // Delay to ensure DOM is ready
    const timeout = setTimeout(setupObserver, 100)
    return () => clearTimeout(timeout)
  }, [setupObserver, topics])

  return (
    <div className="space-y-12">
      {topics.map((topic) => (
        <div key={topic.id} id={topic.id} data-guide-section>
          {/* Topic Title */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 pb-3 border-b-2 border-violet-200 dark:border-violet-800">
            {topic.title}
          </h2>

          {/* Sections */}
          <div className="space-y-8">
            {topic.sections.map((section) => (
              <div key={section.id} id={section.id} data-guide-section>
                <GuideSectionRenderer
                  section={section}
                  onAskAboutSection={() => onAskAboutSection(section.title)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Quick Reference */}
      {quickReference && (
        <div id={quickReference.id} data-guide-section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 pb-3 border-b-2 border-amber-200 dark:border-amber-800">
            {quickReference.title}
          </h2>
          <GuideSectionRenderer
            section={quickReference}
            onAskAboutSection={() => onAskAboutSection(quickReference.title)}
          />
        </div>
      )}
    </div>
  )
}
