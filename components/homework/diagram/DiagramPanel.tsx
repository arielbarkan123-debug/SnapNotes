'use client'

import { type DiagramState, getDiagramTypeName } from './types'
import DiagramRenderer from './DiagramRenderer'

interface DiagramPanelProps {
  diagram: DiagramState
  diagramStep: number
  onStepAdvance: () => void
  title?: string
  autoAdvanceText?: string
  manualControlsText?: string
}

/**
 * Desktop diagram panel for side-by-side display with chat
 */
export default function DiagramPanel({
  diagram,
  diagramStep,
  onStepAdvance,
  title = 'Diagram',
  autoAdvanceText = 'The diagram reveals more as the tutor explains each concept.',
  manualControlsText = 'Use the controls above to step through the diagram as you follow along with the explanation.',
}: DiagramPanelProps) {
  const isAutoAdvance = diagram.evolutionMode === 'auto-advance'

  return (
    <div className="hidden lg:flex lg:w-1/2 flex-col border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {/* Diagram Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
            <svg
              className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {getDiagramTypeName(diagram.type)}
        </span>
      </div>

      {/* Diagram Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="sticky top-0">
          <DiagramRenderer
            diagram={diagram}
            currentStep={diagramStep}
            animate={true}
            showControls={!isAutoAdvance}
            onStepAdvance={onStepAdvance}
            language="en"
          />
        </div>
      </div>

      {/* Diagram Instructions */}
      <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-indigo-700 dark:text-indigo-300">
          {isAutoAdvance ? autoAdvanceText : manualControlsText}
        </p>
      </div>
    </div>
  )
}
