'use client'

import {
  type DiagramData,
  type Subject,
} from '@/types/solution'
import type { MathDiagramState } from '@/types/math'
import type { DiagramState as PhysicsDiagramState } from '@/types/physics'
import type { ChemistryDiagramState } from '@/types/chemistry'
import type { BiologyDiagramState } from '@/types/biology'

// Import renderers
import { MathDiagramRenderer } from '@/components/math/MathDiagramRenderer'
import { ChemistryDiagramRenderer } from '@/components/chemistry/ChemistryDiagramRenderer'
import { BiologyDiagramRenderer } from '@/components/biology/BiologyDiagramRenderer'

// Physics renderer
import { PhysicsDiagramRenderer } from '@/components/physics/PhysicsDiagramRenderer'

interface SolutionDiagramProps {
  diagram: DiagramData
  subject: Subject
  language: 'en' | 'he'
  animate?: boolean
  animationDuration?: number
  /** Override current step */
  currentStep?: number
  /** Show step controls */
  showControls?: boolean
  /** Width override */
  width?: number
  /** Height override */
  height?: number
}

/**
 * SolutionDiagram - Renders the appropriate diagram component based on subject
 *
 * This component acts as a router, selecting the correct diagram renderer
 * based on the subject and diagram type.
 */
export function SolutionDiagram({
  diagram,
  subject,
  language,
  animate = true,
  animationDuration = 400,
  currentStep,
  showControls = false,
  width,
  height,
}: SolutionDiagramProps) {
  const commonProps = {
    animate,
    animationDuration,
    showControls,
    language,
    className: 'solution-diagram-content',
  }

  // Determine diagram type and render appropriate component
  switch (subject) {
    case 'math':
      return (
        <MathDiagramRenderer
          diagram={diagram as MathDiagramState}
          currentStep={currentStep}
          width={width}
          height={height}
          {...commonProps}
        />
      )

    case 'chemistry':
      return (
        <ChemistryDiagramRenderer
          diagram={diagram as ChemistryDiagramState}
          currentStep={currentStep}
          width={width}
          height={height}
          {...commonProps}
        />
      )

    case 'biology':
      return (
        <BiologyDiagramRenderer
          diagram={diagram as BiologyDiagramState}
          currentStep={currentStep}
          width={width}
          height={height}
          {...commonProps}
        />
      )

    case 'physics':
      return (
        <PhysicsDiagramRenderer
          diagram={diagram as PhysicsDiagramState}
          currentStep={currentStep}
          width={width}
          height={height}
          {...commonProps}
        />
      )

    case 'geography':
      // Geography diagrams would be added here
      return (
        <div className="flex items-center justify-center h-64 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <div className="text-center">
            <div className="text-4xl mb-2">🌍</div>
            <p className="text-gray-500 dark:text-gray-400">
              {language === 'he' ? 'תרשים גאוגרפיה' : 'Geography Diagram'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {language === 'he' ? 'בקרוב' : 'Coming soon'}
            </p>
          </div>
        </div>
      )

    default:
      return (
        <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500">
            {language === 'he' ? 'סוג תרשים לא נתמך' : 'Unsupported diagram type'}
          </p>
        </div>
      )
  }
}

export default SolutionDiagram
