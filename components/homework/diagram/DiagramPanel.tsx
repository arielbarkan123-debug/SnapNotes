'use client'

import { useState } from 'react'
import { type DiagramState, getDiagramTypeName, isPhysicsDiagram } from './types'
import DiagramRenderer from './DiagramRenderer'
import {
  InteractiveInclinedPlane,
  InteractiveFreeBodyDiagram,
  InteractiveProjectileMotion,
  InteractivePulleySystem,
  InteractiveCircularMotion,
  InteractiveCollisionDiagram,
} from '@/components/physics'
import type { PhysicsDiagramData } from '@/types/physics'

interface DiagramPanelProps {
  diagram: DiagramState
  diagramStep: number
  onStepAdvance: () => void
  title?: string
  autoAdvanceText?: string
  manualControlsText?: string
  /** Enable interactive "What If?" mode for physics diagrams */
  enableInteractive?: boolean
  /** Language for interactive mode */
  language?: 'en' | 'he'
}

/**
 * Desktop diagram panel for side-by-side display with chat
 *
 * Supports two modes:
 * 1. Standard mode: Step-synced diagram with auto-advance or manual controls
 * 2. Interactive mode: "What If?" exploration with parameter sliders (physics only)
 */
export default function DiagramPanel({
  diagram,
  diagramStep,
  onStepAdvance,
  title = 'Diagram',
  autoAdvanceText = 'The diagram reveals more as the tutor explains each concept.',
  manualControlsText = 'Use the controls above to step through the diagram as you follow along with the explanation.',
  enableInteractive = false,
  language = 'en',
}: DiagramPanelProps) {
  const isAutoAdvance = 'evolutionMode' in diagram && diagram.evolutionMode === 'auto-advance'
  const [whatIfEnabled, setWhatIfEnabled] = useState(false)

  // Check if diagram supports interactive mode
  const supportsInteractive = enableInteractive && isPhysicsDiagram(diagram)

  // Render interactive physics diagram
  const renderInteractiveDiagram = () => {
    if (!isPhysicsDiagram(diagram)) return null

    const physicsDiagram = diagram as PhysicsDiagramData
    const diagramType = physicsDiagram.type

    const commonProps = {
      initialStep: diagramStep,
      language,
      whatIfEnabled,
      onWhatIfToggle: setWhatIfEnabled,
    }

    switch (diagramType) {
      case 'inclined_plane':
        return (
          <InteractiveInclinedPlane
            initialData={physicsDiagram.data}
            {...commonProps}
          />
        )
      case 'fbd':
        return (
          <InteractiveFreeBodyDiagram
            initialData={physicsDiagram.data}
            {...commonProps}
          />
        )
      case 'projectile':
        return (
          <InteractiveProjectileMotion
            initialData={physicsDiagram.data}
            {...commonProps}
          />
        )
      case 'pulley':
        return (
          <InteractivePulleySystem
            initialData={physicsDiagram.data}
            {...commonProps}
          />
        )
      case 'circular':
        return (
          <InteractiveCircularMotion
            initialData={physicsDiagram.data}
            {...commonProps}
          />
        )
      case 'collision':
        return (
          <InteractiveCollisionDiagram
            initialData={physicsDiagram.data}
            {...commonProps}
          />
        )
      default:
        // Fall back to standard renderer for unsupported types
        return null
    }
  }

  return (
    <div className="hidden lg:flex lg:w-1/2 flex-col border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {/* Diagram Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
            <svg
              className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400"
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
        <div className="flex items-center gap-2">
          {/* Interactive mode indicator */}
          {supportsInteractive && whatIfEnabled && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
              {language === 'he' ? 'אינטראקטיבי' : 'Interactive'}
            </span>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {getDiagramTypeName(diagram.type)}
          </span>
        </div>
      </div>

      {/* Diagram Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="sticky top-0">
          {supportsInteractive ? (
            renderInteractiveDiagram() || (
              <DiagramRenderer
                diagram={diagram}
                currentStep={diagramStep}
                animate={true}
                showControls={!isAutoAdvance}
                onStepAdvance={onStepAdvance}
                language={language}
              />
            )
          ) : (
            <DiagramRenderer
              diagram={diagram}
              currentStep={diagramStep}
              animate={true}
              showControls={!isAutoAdvance}
              onStepAdvance={onStepAdvance}
              language={language}
            />
          )}
        </div>
      </div>

      {/* Diagram Instructions */}
      <div className="px-4 py-3 bg-violet-50 dark:bg-violet-900/20 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-violet-700 dark:text-violet-300">
          {whatIfEnabled
            ? (language === 'he'
              ? 'השתמש בבקרי הפרמטרים כדי לחקור שינויים.'
              : 'Use the parameter controls to explore changes.')
            : (isAutoAdvance ? autoAdvanceText : manualControlsText)
          }
        </p>
      </div>
    </div>
  )
}
