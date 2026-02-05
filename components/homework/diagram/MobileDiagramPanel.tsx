'use client'

import { useState } from 'react'
import { type DiagramState, getDiagramTypeName } from './types'
import DiagramRenderer from './DiagramRenderer'

interface MobileDiagramPanelProps {
  diagram: DiagramState
  diagramStep: number
  onStepAdvance: () => void
  title?: string
}

/**
 * Mobile diagram panel - collapsible floating button with popup
 */
export default function MobileDiagramPanel({
  diagram,
  diagramStep,
  onStepAdvance,
  title,
}: MobileDiagramPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const isAutoAdvance = 'evolutionMode' in diagram && diagram.evolutionMode === 'auto-advance'

  return (
    <div className="lg:hidden fixed bottom-20 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-violet-600 text-white shadow-lg flex items-center justify-center hover:bg-violet-700 transition-colors"
        aria-label={isOpen ? 'Close diagram' : 'Open diagram'}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          )}
        </svg>
      </button>

      {/* Popup Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[calc(100vw-2rem)] max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {title || getDiagramTypeName(diagram.type)}
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              aria-label="Close diagram"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-3 max-h-[60vh] overflow-y-auto">
            <DiagramRenderer
              diagram={diagram}
              currentStep={diagramStep}
              animate={true}
              showControls={!isAutoAdvance}
              onStepAdvance={onStepAdvance}
              width={350}
              height={280}
              language="en"
            />
          </div>
        </div>
      )}
    </div>
  )
}
