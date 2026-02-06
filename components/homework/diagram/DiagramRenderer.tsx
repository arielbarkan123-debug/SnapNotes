'use client'

import { Component, type ReactNode } from 'react'
import { PhysicsDiagramRenderer } from '@/components/physics'
import { MathDiagramRenderer } from '@/components/math'
import { ChemistryDiagramRenderer } from '@/components/chemistry'
import { BiologyDiagramRenderer } from '@/components/biology'
import { GeometryDiagramRenderer } from '@/components/geometry'
import { type DiagramState, isPhysicsDiagram, isMathDiagram, isChemistryDiagram, isBiologyDiagram, isGeometryDiagram, getDiagramTypeName, MATH_DIAGRAM_TYPES, PHYSICS_DIAGRAM_TYPES, CHEMISTRY_DIAGRAM_TYPES, BIOLOGY_DIAGRAM_TYPES, GEOMETRY_DIAGRAM_TYPES } from './types'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'

// ============================================================================
// Helpers for unknown diagram type suggestions
// ============================================================================

const ALL_KNOWN_TYPES = [
  ...MATH_DIAGRAM_TYPES,
  ...PHYSICS_DIAGRAM_TYPES,
  ...CHEMISTRY_DIAGRAM_TYPES,
  ...BIOLOGY_DIAGRAM_TYPES,
  ...GEOMETRY_DIAGRAM_TYPES,
]

/**
 * Simple similarity score: counts shared characters in order (longest common subsequence length).
 * Used to find the most similar valid diagram type names for an unknown type.
 */
function similarityScore(a: string, b: string): number {
  // Prioritize prefix matches
  let prefixLen = 0
  const minLen = Math.min(a.length, b.length)
  for (let i = 0; i < minLen; i++) {
    if (a[i] === b[i]) prefixLen++
    else break
  }

  // Also count shared character frequency
  let shared = 0
  const bChars = b.split('')
  for (const ch of a) {
    const idx = bChars.indexOf(ch)
    if (idx !== -1) {
      shared++
      bChars.splice(idx, 1)
    }
  }

  // Weight prefix matches more heavily
  return prefixLen * 3 + shared
}

/**
 * Find the top N most similar valid diagram type names to the given unknown type.
 */
function getSuggestedTypes(unknownType: string, limit: number = 5): string[] {
  const scored = ALL_KNOWN_TYPES
    .map((t) => ({ type: t, score: similarityScore(unknownType, t) }))
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, limit).map((s) => s.type)
}

// ============================================================================
// Error Boundary for Diagram Rendering
// ============================================================================

interface DiagramErrorBoundaryProps {
  children: ReactNode
  diagramType: string
  diagramData?: unknown
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface DiagramErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: string | null
}

/**
 * Error boundary specifically for diagram rendering
 * Catches rendering errors and displays a user-friendly fallback
 */
class DiagramErrorBoundary extends Component<DiagramErrorBoundaryProps, DiagramErrorBoundaryState> {
  constructor(props: DiagramErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<DiagramErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error with context for debugging
    console.warn('[DiagramRenderer] Failed to render diagram:', {
      type: this.props.diagramType,
      error: error.message,
      data: this.props.diagramData,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    })

    this.setState({ errorInfo: errorInfo.componentStack || null })

    // Call optional error handler
    this.props.onError?.(error, errorInfo)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
          <div className="text-red-500 dark:text-red-400 mb-3">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">
            Unable to display {getDiagramTypeName(this.props.diagramType)}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 text-center max-w-xs">
            {this.state.error?.message || 'An unexpected error occurred while rendering the diagram.'}
          </p>
          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details className="mt-3 text-xs text-red-500 dark:text-red-400 max-w-full overflow-auto">
              <summary className="cursor-pointer hover:underline">Technical details</summary>
              <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900/40 rounded text-start overflow-x-auto max-h-32">
                {this.state.errorInfo}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

// ============================================================================
// Main Diagram Renderer
// ============================================================================

interface DiagramRendererProps {
  diagram: DiagramState
  currentStep?: number
  onStepAdvance?: () => void
  onStepBack?: () => void
  showControls?: boolean
  animate?: boolean
  width?: number
  height?: number
  language?: 'en' | 'he'
  /** Optional error handler for diagram rendering errors */
  onRenderError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /** Subject for color coding (auto-detected from diagram type if not provided) */
  subject?: SubjectKey
  /** Complexity level for adaptive styling */
  complexity?: VisualComplexityLevel
}

/**
 * Unified diagram renderer that handles physics, math, chemistry, and biology diagram types
 * Wrapped in an error boundary for graceful error handling
 */
export default function DiagramRenderer({
  diagram,
  currentStep,
  onStepAdvance,
  onStepBack,
  showControls = true,
  animate = true,
  width,
  height,
  language = 'en',
  onRenderError,
  subject,
  complexity,
}: DiagramRendererProps) {
  // Validate diagram prop
  if (!diagram) {
    console.warn('[DiagramRenderer] Failed to render diagram:', {
      type: undefined,
      error: 'Missing diagram prop - diagram data is null or undefined',
      data: undefined,
    })
    return (
      <div className="flex items-center justify-center h-32 text-amber-600 dark:text-amber-400 text-xs">
        <div className="text-center px-4">
          <p className="text-sm font-medium mb-1">No diagram data</p>
          <p>Diagram information is missing or invalid.</p>
        </div>
      </div>
    )
  }

  if (!diagram.type) {
    console.warn('[DiagramRenderer] Failed to render diagram:', {
      type: undefined,
      error: 'Diagram missing required type field',
      data: (diagram as Record<string, unknown>).data,
    })
    return (
      <div className="flex items-center justify-center h-32 text-amber-600 dark:text-amber-400 text-xs">
        <div className="text-center px-4">
          <p className="text-sm font-medium mb-1">Invalid diagram</p>
          <p>Diagram type is not specified.</p>
        </div>
      </div>
    )
  }

  const diagramType = diagram.type

  // Auto-detect subject from diagram type if not explicitly provided
  const detectedSubject: SubjectKey = subject
    ?? (isMathDiagram(diagram) ? 'math' : undefined)
    ?? (isPhysicsDiagram(diagram) ? 'physics' : undefined)
    ?? (isChemistryDiagram(diagram) ? 'chemistry' : undefined)
    ?? (isBiologyDiagram(diagram) ? 'biology' : undefined)
    ?? (isGeometryDiagram(diagram) ? 'geometry' : undefined)
    ?? 'math'

  // Wrap each renderer in an error boundary for graceful error handling
  if (isPhysicsDiagram(diagram)) {
    return (
      <DiagramErrorBoundary diagramType={diagramType} diagramData={diagram.data} onError={onRenderError}>
        <PhysicsDiagramRenderer
          diagram={diagram}
          currentStep={currentStep}
          animate={animate}
          showControls={showControls}
          onStepAdvance={onStepAdvance}
          onStepBack={onStepBack}
          language={language}
          width={width}
          height={height}
        />
      </DiagramErrorBoundary>
    )
  }

  if (isMathDiagram(diagram)) {
    return (
      <DiagramErrorBoundary diagramType={diagramType} diagramData={diagram.data} onError={onRenderError}>
        <MathDiagramRenderer
          diagram={diagram}
          currentStep={currentStep}
          animate={animate}
          showControls={showControls}
          onStepAdvance={onStepAdvance}
          onStepBack={onStepBack}
          language={language}
          width={width}
          height={height}
          subject={detectedSubject}
          complexity={complexity}
        />
      </DiagramErrorBoundary>
    )
  }

  if (isChemistryDiagram(diagram)) {
    return (
      <DiagramErrorBoundary diagramType={diagramType} diagramData={diagram.data} onError={onRenderError}>
        <ChemistryDiagramRenderer
          diagram={diagram}
          currentStep={currentStep}
          animate={animate}
          showControls={showControls}
          onStepAdvance={onStepAdvance}
          onStepBack={onStepBack}
          language={language}
          width={width}
          height={height}
        />
      </DiagramErrorBoundary>
    )
  }

  if (isBiologyDiagram(diagram)) {
    return (
      <DiagramErrorBoundary diagramType={diagramType} diagramData={diagram.data} onError={onRenderError}>
        <BiologyDiagramRenderer
          diagram={diagram}
          currentStep={currentStep}
          animate={animate}
          showControls={showControls}
          onStepAdvance={onStepAdvance}
          onStepBack={onStepBack}
          language={language}
          width={width}
          height={height}
        />
      </DiagramErrorBoundary>
    )
  }

  if (isGeometryDiagram(diagram)) {
    return (
      <DiagramErrorBoundary diagramType={diagramType} diagramData={diagram.data} onError={onRenderError}>
        <GeometryDiagramRenderer
          diagram={diagram}
          currentStep={currentStep}
          animate={animate}
          showControls={showControls}
          onStepAdvance={onStepAdvance}
          language={language}
          width={width}
          height={height}
          subject={detectedSubject}
          complexity={complexity}
        />
      </DiagramErrorBoundary>
    )
  }

  // Fallback for unknown/unsupported diagram types
  const suggestedTypes = getSuggestedTypes(diagramType)
  console.warn('[DiagramRenderer] Failed to render diagram:', {
    type: diagramType,
    error: `Unknown diagram type '${diagramType}'`,
    data: (diagram as Record<string, unknown>).data,
    suggestedTypes,
  })
  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
      <div className="text-amber-500 dark:text-amber-400 mb-2">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
        Diagram type &lsquo;{diagramType}&rsquo; is not supported
      </p>
      {suggestedTypes.length > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 text-center max-w-sm">
          Did you mean: {suggestedTypes.map((t, i) => (
            <span key={t}>
              <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/40 rounded text-amber-700 dark:text-amber-300">{t}</code>
              {i < suggestedTypes.length - 1 ? ', ' : ''}
            </span>
          ))}
        </p>
      )}
    </div>
  )
}
