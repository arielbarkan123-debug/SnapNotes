'use client'

import { Component, type ReactNode, lazy, Suspense, useState, useCallback } from 'react'
import { type DiagramState, getDiagramTypeName } from './types'
import type { StepByStepSource, StepLayerMeta } from './types'
import EngineDiagramImage from './EngineDiagramImage'

const StepSequencePlayer = lazy(() => import('./StepSequencePlayer'))
const StepByStepWalkthrough = lazy(() => import('./StepByStepWalkthrough'))
const StepByStepFallback = lazy(() => import('./StepByStepFallback'))

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
    console.warn('[DiagramRenderer] Failed to render diagram:', {
      type: this.props.diagramType,
      error: error.message,
      data: this.props.diagramData,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    })

    this.setState({ errorInfo: errorInfo.componentStack || null })
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
  onRenderError?: (error: Error, errorInfo: React.ErrorInfo) => void
  subject?: string
  complexity?: string
}

/**
 * Diagram renderer — handles engine-generated image diagrams.
 * The diagram engine (lib/diagram-engine/) generates all diagrams as PNG images
 * via E2B LaTeX, Matplotlib, TikZ, or Recraft pipelines.
 *
 * Step-by-step flow:
 * 1. Diagram renders normally with "Step by Step" button (if stepByStepSource available)
 * 2. User clicks button → calls /api/diagrams/render-steps
 * 3. Walkthrough component replaces static image
 * 4. User can close to return to static image
 */
export default function DiagramRenderer({
  diagram,
  language,
  onRenderError,
}: DiagramRendererProps) {
  // Step-by-step state
  const [walkthroughMode, setWalkthroughMode] = useState<'idle' | 'loading' | 'active' | 'fallback'>('idle')
  const [stepImageUrls, setStepImageUrls] = useState<string[]>([])
  const [stepsMeta, setStepsMeta] = useState<StepLayerMeta[]>([])
  const [isPartial, setIsPartial] = useState(false)

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
      data: diagram.data,
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

  // Step sequence diagram (multi-step animated breakdown)
  if (diagramType === 'step_sequence') {
    const seqData = diagram.data as {
      steps?: Array<{
        stepNumber: number
        title: string
        titleHe: string
        explanation: string
        explanationHe: string
        diagramImageUrl: string | null
        pipeline: string | null
        highlightWhat: string
      }>
      summary?: string
      summaryHe?: string
      partial?: boolean
    } | undefined

    if (seqData?.steps && seqData.steps.length > 0) {
      return (
        <DiagramErrorBoundary diagramType={diagramType} diagramData={seqData} onError={onRenderError}>
          <Suspense fallback={
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
            </div>
          }>
            <StepSequencePlayer
              steps={seqData.steps}
              language={language}
              summary={seqData.summary}
              summaryHe={seqData.summaryHe}
              partial={seqData.partial}
            />
          </Suspense>
        </DiagramErrorBoundary>
      )
    }
  }

  // Engine-generated image diagram (E2B LaTeX, Matplotlib, TikZ, Recraft)
  if (diagramType === 'engine_image') {
    const engineData = diagram.data as {
      imageUrl?: string
      pipeline?: string
      overlay?: Array<{ text: string; x: number; y: number; targetX: number; targetY: number }>
      qaVerdict?: string
    } | undefined

    // Check for step-by-step source availability
    const stepByStepSource = diagram.stepByStepSource
    const hasStepByStep = !!stepByStepSource && stepByStepSource.steps.length > 0

    // Handle "Step by Step" button click
    const handleStepByStepClick = useCallback(async () => {
      if (!stepByStepSource) return

      setWalkthroughMode('loading')

      try {
        const response = await fetch('/api/diagrams/render-steps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stepByStepSource }),
        })

        if (!response.ok) {
          console.error('[DiagramRenderer] Step render API failed:', response.status)
          // Fallback to text-only steps
          setStepsMeta(stepByStepSource.steps)
          setWalkthroughMode('fallback')
          return
        }

        const data = await response.json()
        const urls = data.stepImageUrls as string[]
        const successCount = urls.filter(Boolean).length

        if (successCount === 0) {
          // All renders failed — use text-only fallback
          setStepsMeta(stepByStepSource.steps)
          setWalkthroughMode('fallback')
          return
        }

        setStepImageUrls(urls)
        setStepsMeta(data.steps || stepByStepSource.steps)
        setIsPartial(data.partial || false)
        setWalkthroughMode('active')
      } catch (err) {
        console.error('[DiagramRenderer] Step render error:', err)
        // Fallback to text-only steps
        setStepsMeta(stepByStepSource.steps)
        setWalkthroughMode('fallback')
      }
    }, [stepByStepSource])

    const handleCloseWalkthrough = useCallback(() => {
      setWalkthroughMode('idle')
      setStepImageUrls([])
      setStepsMeta([])
      setIsPartial(false)
    }, [])

    if (engineData?.imageUrl) {
      // Show walkthrough when active
      if (walkthroughMode === 'active' && stepImageUrls.length > 0) {
        return (
          <DiagramErrorBoundary diagramType={diagramType} diagramData={engineData} onError={onRenderError}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
              </div>
            }>
              <StepByStepWalkthrough
                stepImageUrls={stepImageUrls}
                steps={stepsMeta}
                finalImageUrl={engineData.imageUrl}
                language={language}
                partial={isPartial}
                onClose={handleCloseWalkthrough}
              />
            </Suspense>
          </DiagramErrorBoundary>
        )
      }

      // Show text-only fallback when renders failed
      if (walkthroughMode === 'fallback' && stepsMeta.length > 0) {
        return (
          <DiagramErrorBoundary diagramType={diagramType} diagramData={engineData} onError={onRenderError}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
              </div>
            }>
              <StepByStepFallback
                steps={stepsMeta}
                finalImageUrl={engineData.imageUrl}
                pipeline={engineData.pipeline}
                language={language}
                onClose={handleCloseWalkthrough}
              />
            </Suspense>
          </DiagramErrorBoundary>
        )
      }

      // Default: show static diagram with optional Step by Step button
      return (
        <DiagramErrorBoundary diagramType={diagramType} diagramData={engineData} onError={onRenderError}>
          <EngineDiagramImage
            imageUrl={engineData.imageUrl}
            pipeline={engineData.pipeline}
            overlay={engineData.overlay}
            qaVerdict={engineData.qaVerdict}
            hasStepByStep={hasStepByStep}
            onStepByStepClick={hasStepByStep ? handleStepByStepClick : undefined}
            stepByStepLoading={walkthroughMode === 'loading'}
          />
        </DiagramErrorBoundary>
      )
    }
  }

  // Fallback for unknown/unsupported diagram types
  console.warn('[DiagramRenderer] Failed to render diagram:', {
    type: diagramType,
    error: `Unknown diagram type '${diagramType}'`,
    data: diagram.data,
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
      <p className="text-xs text-amber-600 dark:text-amber-400 text-center max-w-sm">
        Only engine-generated diagrams are supported. This diagram may have been created with an older version.
      </p>
    </div>
  )
}
