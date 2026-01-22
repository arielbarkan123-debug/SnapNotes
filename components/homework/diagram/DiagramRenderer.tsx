'use client'

import { PhysicsDiagramRenderer } from '@/components/physics'
import { MathDiagramRenderer } from '@/components/math'
import { type DiagramState, isPhysicsDiagram, isMathDiagram, getDiagramTypeName } from './types'

interface DiagramRendererProps {
  diagram: DiagramState
  currentStep: number
  onStepAdvance?: () => void
  showControls?: boolean
  animate?: boolean
  width?: number
  height?: number
  language?: 'en' | 'he'
}

/**
 * Unified diagram renderer that handles physics, math, and other diagram types
 */
export default function DiagramRenderer({
  diagram,
  currentStep,
  onStepAdvance,
  showControls = true,
  animate = true,
  width,
  height,
  language = 'en',
}: DiagramRendererProps) {
  if (isPhysicsDiagram(diagram)) {
    return (
      <PhysicsDiagramRenderer
        diagram={diagram}
        currentStep={currentStep}
        animate={animate}
        showControls={showControls}
        onStepAdvance={onStepAdvance}
        language={language}
        width={width}
        height={height}
      />
    )
  }

  if (isMathDiagram(diagram)) {
    return (
      <MathDiagramRenderer
        diagram={diagram}
        currentStep={currentStep}
        animate={animate}
        showControls={showControls}
        onStepAdvance={onStepAdvance}
        language={language}
        width={width}
        height={height}
      />
    )
  }

  // Placeholder for chemistry/biology diagrams (coming soon)
  // Use type assertion since TypeScript narrows this to never after physics/math checks
  const diagramType = (diagram as { type: string }).type
  return (
    <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400 text-xs">
      <div className="text-center px-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {getDiagramTypeName(diagramType)}
        </p>
        <p>Diagram visualization coming soon</p>
      </div>
    </div>
  )
}
