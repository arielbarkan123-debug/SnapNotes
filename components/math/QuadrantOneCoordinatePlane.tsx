'use client'

import { CoordinatePlane } from '@/components/math/CoordinatePlane'
import type { CoordinatePlaneData } from '@/types'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuadrantOneCoordinatePlaneProps {
  data: Omit<CoordinatePlaneData, 'xMin' | 'yMin'> & {
    xMin?: number
    yMin?: number
  }
  className?: string
  width?: number
  height?: number
  complexity?: VisualComplexityLevel
  subject?: SubjectKey
  language?: 'en' | 'he'
  initialStep?: number
  currentStep?: number
  totalSteps?: number
  onStepComplete?: () => void
  animationDuration?: number
  stepConfig?: unknown
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * QuadrantOneCoordinatePlane
 *
 * A wrapper around CoordinatePlane that forces xMin=0, yMin=0 for
 * elementary-level (Quadrant I only) coordinate work. Subject is forced
 * to 'math' and complexity defaults to 'elementary'.
 */
export function QuadrantOneCoordinatePlane({
  data,
  className,
  width = 400,
  height = 400,
  complexity = 'elementary',
  subject = 'math',
  language = 'en',
  initialStep,
}: QuadrantOneCoordinatePlaneProps) {
  // Force quadrant one: xMin=0, yMin=0
  const quadrantOneData: CoordinatePlaneData = {
    ...data,
    xMin: 0,
    yMin: 0,
    xMax: data.xMax ?? 10,
    yMax: data.yMax ?? 10,
  }

  return (
    <div data-testid="quadrant-one-coordinate-plane">
      <CoordinatePlane
        data={quadrantOneData}
        className={className}
        width={width}
        height={height}
        complexity={complexity}
        subject={subject}
        language={language}
        initialStep={initialStep}
      />
    </div>
  )
}

export default QuadrantOneCoordinatePlane
