'use client'

import { type DiagramState, getDiagramTypeName } from './types'
import DiagramRenderer from './DiagramRenderer'

interface InlineDiagramProps {
  diagram: DiagramState
  currentStep: number
  onStepAdvance?: () => void
  onStepBack?: () => void
}

/**
 * Inline diagram for rendering within message bubbles
 */
export default function InlineDiagram({
  diagram,
  currentStep,
  onStepAdvance,
  onStepBack,
}: InlineDiagramProps) {
  return (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
          📊 {getDiagramTypeName(diagram.type)}
        </span>
      </div>
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 overflow-x-auto">
        <DiagramRenderer
          diagram={diagram}
          currentStep={currentStep}
          animate={true}
          showControls={true}
          onStepAdvance={onStepAdvance}
          onStepBack={onStepBack}
          width={350}
          height={280}
          language="en"
        />
      </div>
    </div>
  )
}
