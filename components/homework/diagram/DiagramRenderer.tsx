'use client'

import { Component, type ReactNode } from 'react'
import { PhysicsDiagramRenderer } from '@/components/physics'
import { MathDiagramRenderer } from '@/components/math'
import { ChemistryDiagramRenderer } from '@/components/chemistry'
import { BiologyDiagramRenderer } from '@/components/biology'
import { type DiagramState, isPhysicsDiagram, isMathDiagram, isChemistryDiagram, isBiologyDiagram, getDiagramTypeName } from './types'

// ============================================================================
// Error Boundary for Diagram Rendering
// ============================================================================

interface DiagramErrorBoundaryProps {
  children: ReactNode
  diagramType: string
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
    console.error(`[DiagramRenderer] Error rendering ${this.props.diagramType} diagram:`, {
      error: error.message,
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
              <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900/40 rounded text-left overflow-x-auto max-h-32">
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
  currentStep: number
  onStepAdvance?: () => void
  showControls?: boolean
  animate?: boolean
  width?: number
  height?: number
  language?: 'en' | 'he'
  /** Optional error handler for diagram rendering errors */
  onRenderError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

/**
 * Unified diagram renderer that handles physics, math, chemistry, and biology diagram types
 * Wrapped in an error boundary for graceful error handling
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
  onRenderError,
}: DiagramRendererProps) {
  // Validate diagram prop
  if (!diagram) {
    console.error('[DiagramRenderer] Missing diagram prop')
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
    console.error('[DiagramRenderer] Diagram missing type field:', diagram)
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
  // Wrap each renderer in an error boundary for graceful error handling
  if (isPhysicsDiagram(diagram)) {
    return (
      <DiagramErrorBoundary diagramType={diagramType} onError={onRenderError}>
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
      </DiagramErrorBoundary>
    )
  }

  if (isMathDiagram(diagram)) {
    return (
      <DiagramErrorBoundary diagramType={diagramType} onError={onRenderError}>
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
      </DiagramErrorBoundary>
    )
  }

  if (isChemistryDiagram(diagram)) {
    return (
      <DiagramErrorBoundary diagramType={diagramType} onError={onRenderError}>
        <ChemistryDiagramRenderer
          diagram={diagram}
          currentStep={currentStep}
          animate={animate}
          showControls={showControls}
          onStepAdvance={onStepAdvance}
          language={language}
          width={width}
          height={height}
        />
      </DiagramErrorBoundary>
    )
  }

  if (isBiologyDiagram(diagram)) {
    return (
      <DiagramErrorBoundary diagramType={diagramType} onError={onRenderError}>
        <BiologyDiagramRenderer
          diagram={diagram}
          currentStep={currentStep}
          animate={animate}
          showControls={showControls}
          onStepAdvance={onStepAdvance}
          language={language}
          width={width}
          height={height}
        />
      </DiagramErrorBoundary>
    )
  }

  // Fallback for unknown/unsupported diagram types
  console.warn(`[DiagramRenderer] Unknown diagram type: ${diagramType}`, { diagram })
  return (
    <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400 text-xs">
      <div className="text-center px-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {getDiagramTypeName(diagramType)}
        </p>
        <p>Diagram visualization not available for this type.</p>
        {process.env.NODE_ENV === 'development' && (
          <p className="mt-1 text-xs text-gray-400">Type: {diagramType}</p>
        )}
      </div>
    </div>
  )
}
