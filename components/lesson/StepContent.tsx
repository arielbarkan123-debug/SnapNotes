'use client'

import { type Step } from '@/types'
import Image from 'next/image'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import type { DiagramState } from '@/components/homework/diagram/types'
import type { Annotation } from '@/hooks/useAnnotations'

// Dynamic import of DiagramRenderer to avoid SSR issues with SVG
const DiagramRenderer = dynamic(
  () => import('@/components/homework/diagram/DiagramRenderer'),
  { ssr: false, loading: () => <div className="h-48 flex items-center justify-center"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div> }
)

const AnnotationButton = dynamic(() => import('@/components/course/AnnotationButton'))

interface StepContentProps {
  step: Step
  lessonTitle: string
  /** Callback to open contextual help for this step */
  onRequestHelp?: () => void
  /** Annotation data for this step */
  annotation?: Annotation
  /** Callback to save annotation */
  onSaveAnnotation?: (params: { noteText?: string; flagType?: 'confusing' | 'important' | null }) => Promise<Annotation | null>
  /** Callback to delete annotation */
  onDeleteAnnotation?: (id: string) => Promise<boolean>
  /** Whether to show annotation input (controlled by F4) */
  showAnnotationInput?: boolean
  /** Callback to toggle annotation input */
  onAnnotationInputToggle?: () => void
}

export default function StepContent({
  step,
  lessonTitle,
  onRequestHelp,
  annotation,
  onSaveAnnotation,
  onDeleteAnnotation,
  showAnnotationInput: _showAnnotationInput,
  onAnnotationInputToggle: _onAnnotationInputToggle,
}: StepContentProps) {
  const t = useTranslations('lesson')
  const imageProps = {
    imageUrl: step.imageUrl,
    imageAlt: step.imageAlt,
    imageCaption: step.imageCaption,
    imageCredit: step.imageCredit,
    imageCreditUrl: step.imageCreditUrl,
  }

  // Help button for non-question content steps
  const helpButton = onRequestHelp ? (
    <HelpButton onClick={onRequestHelp} t={t} />
  ) : null

  // Annotation button for step-level annotations
  const annotationButton = onSaveAnnotation && onDeleteAnnotation ? (
    <div className="mt-3 flex justify-end">
      <AnnotationButton
        annotation={annotation}
        onSave={onSaveAnnotation}
        onDelete={onDeleteAnnotation}
      />
    </div>
  ) : null

  switch (step.type) {
    case 'explanation':
      return (
        <>
          <ExplanationStep content={step.content} t={t} {...imageProps} helpButton={helpButton} />
          {annotationButton}
        </>
      )
    case 'key_point':
      return (
        <>
          <KeyPointStep content={step.content} t={t} helpButton={helpButton} />
          {annotationButton}
        </>
      )
    case 'formula':
      return (
        <>
          <FormulaStep content={step.content} explanation={step.explanation} t={t} helpButton={helpButton} />
          {annotationButton}
        </>
      )
    case 'diagram':
      return (
        <>
          <DiagramStep content={step.content} t={t} diagramData={step.diagramData} {...imageProps} />
          {annotationButton}
        </>
      )
    case 'example':
      return (
        <>
          <ExampleStep content={step.content} t={t} {...imageProps} helpButton={helpButton} />
          {annotationButton}
        </>
      )
    case 'summary':
      return (
        <>
          <SummaryStep content={step.content} lessonTitle={lessonTitle} t={t} />
          {annotationButton}
        </>
      )
    case 'question':
      // Questions are handled separately in the parent component
      return null
    default:
      return (
        <>
          <ExplanationStep content={step.content} t={t} {...imageProps} helpButton={helpButton} />
          {annotationButton}
        </>
      )
  }
}

function HelpButton({ onClick, t }: { onClick: () => void; t: ReturnType<typeof useTranslations<'lesson'>> }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
      aria-label={t('getHelp')}
      type="button"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </button>
  )
}

interface StepImageProps {
  url: string
  alt?: string
  caption?: string
  credit?: string
  creditUrl?: string
  t: ReturnType<typeof useTranslations<'lesson'>>
}

/**
 * Reusable image component for steps with caption and credit
 */
function StepImage({ url, alt, caption, credit, creditUrl, t }: StepImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return null // Don't show broken images
  }

  return (
    <figure className="mt-4">
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
        <Image
          src={url}
          alt={alt || t('courseImage')}
          fill
          className={`object-contain transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false)
            setHasError(true)
          }}
          sizes="(max-width: 768px) 100vw, 600px"
        />
      </div>
      {/* Caption and credit */}
      {(caption || credit) && (
        <figcaption className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
          {caption && <span>{caption}</span>}
          {caption && credit && <span> · </span>}
          {credit && (
            <span>
              {t('photoBy')}{' '}
              {creditUrl ? (
                <a
                  href={creditUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {credit}
                </a>
              ) : (
                credit
              )}{' '}
              {t('onUnsplash')}
            </span>
          )}
        </figcaption>
      )}
    </figure>
  )
}

interface ImageStepProps {
  content: string
  imageUrl?: string
  imageAlt?: string
  imageCaption?: string
  imageCredit?: string
  imageCreditUrl?: string
  t: ReturnType<typeof useTranslations<'lesson'>>
  helpButton?: React.ReactNode
}

function ExplanationStep({ content, imageUrl, imageAlt, imageCaption, imageCredit, imageCreditUrl, t, helpButton }: ImageStepProps) {
  return (
    <div className="animate-fadeIn relative">
      {helpButton}
      <p className="text-lg sm:text-xl text-gray-800 dark:text-gray-200 leading-relaxed">
        {content}
      </p>
      {imageUrl && <StepImage url={imageUrl} alt={imageAlt} caption={imageCaption} credit={imageCredit} creditUrl={imageCreditUrl} t={t} />}
    </div>
  )
}

interface KeyPointStepProps {
  content: string
  t: ReturnType<typeof useTranslations<'lesson'>>
  helpButton?: React.ReactNode
}

function KeyPointStep({ content, t, helpButton }: KeyPointStepProps) {
  return (
    <div className="animate-fadeIn relative">
      {helpButton}
      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          {/* Lightbulb icon */}
          <div className="flex-shrink-0 w-12 h-12 bg-amber-400 dark:bg-amber-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm2 15H10v-1h4v1zm0-2H10v-1h4v1zm-1.5-3.59V13h-1v-1.59c-1.12-.44-1.96-1.49-1.96-2.73 0-1.62 1.34-2.93 2.99-2.93s2.99 1.31 2.99 2.93c0 1.24-.84 2.29-1.96 2.73h-.06z"/>
            </svg>
          </div>
          <div className="flex-1">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              {t('keyPointType')}
            </span>
            <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white leading-relaxed">
              {content}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

interface FormulaStepProps {
  content: string
  explanation?: string
  t: ReturnType<typeof useTranslations<'lesson'>>
  helpButton?: React.ReactNode
}

function FormulaStep({ content, explanation, t, helpButton }: FormulaStepProps) {
  return (
    <div className="animate-fadeIn space-y-4 relative">
      {helpButton}
      {/* Formula box */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            {t('formulaType')}
          </span>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 font-mono text-lg sm:text-xl text-center text-gray-900 dark:text-white border border-blue-100 dark:border-blue-900">
          {content}
        </div>
      </div>

      {/* Explanation */}
      {explanation && (
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed ps-2 border-s-2 border-blue-300 dark:border-blue-700">
          {explanation}
        </p>
      )}
    </div>
  )
}

interface DiagramStepProps extends ImageStepProps {
  diagramData?: Step['diagramData']
}

function DiagramStep({ content, imageUrl, imageAlt, imageCaption, imageCredit, imageCreditUrl, diagramData, t }: DiagramStepProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [diagramError, setDiagramError] = useState<string | null>(null)

  // Validate diagramData
  const isValidDiagramData = diagramData &&
    typeof diagramData.type === 'string' &&
    diagramData.type.length > 0 &&
    diagramData.data &&
    typeof diagramData.data === 'object'

  // Log validation errors in development
  if (diagramData && !isValidDiagramData) {
    console.error('[StepContent] Invalid diagramData:', {
      hasType: !!diagramData.type,
      typeIsString: typeof diagramData.type === 'string',
      hasData: !!diagramData.data,
      dataIsObject: typeof diagramData.data === 'object',
      diagramData,
    })
  }

  // Error handler for diagram rendering
  const handleDiagramError = (error: Error) => {
    console.error('[StepContent] Diagram render error:', error.message)
    setDiagramError(error.message)
  }

  return (
    <div className="animate-fadeIn">
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            {isValidDiagramData ? t('interactiveDiagram') : imageUrl ? t('diagramType') : t('diagramReferenceType')}
          </span>
        </div>
        <p className="text-gray-800 dark:text-gray-200 leading-relaxed mb-4">
          {content}
        </p>

        {/* Interactive Diagram */}
        {isValidDiagramData && !diagramError && (
          <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl p-4 border border-purple-100 dark:border-purple-900">
            <DiagramRenderer
              diagram={{
                type: diagramData.type,
                data: diagramData.data,
                visibleStep: diagramData.visibleStep || 0,
                totalSteps: diagramData.totalSteps,
                stepConfig: diagramData.stepConfig,
              } as DiagramState}
              currentStep={currentStep}
              onStepAdvance={() => setCurrentStep(prev => Math.min(prev + 1, (diagramData.totalSteps || 1) - 1))}
              showControls={true}
              animate={true}
              onRenderError={handleDiagramError}
            />
            {/* Step controls */}
            {diagramData.totalSteps && diagramData.totalSteps > 1 && (
              <div className="mt-4 flex items-center justify-center gap-4">
                <button
                  onClick={() => setCurrentStep(prev => Math.max(prev - 1, 0))}
                  disabled={currentStep === 0}
                  className="px-3 py-1.5 text-sm rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-200 dark:hover:bg-purple-800/60 transition"
                >
                  ← {t('previousStep')}
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('stepOf', { current: currentStep + 1, total: diagramData.totalSteps })}
                </span>
                <button
                  onClick={() => setCurrentStep(prev => Math.min(prev + 1, (diagramData.totalSteps || 1) - 1))}
                  disabled={currentStep === (diagramData.totalSteps || 1) - 1}
                  className="px-3 py-1.5 text-sm rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-200 dark:hover:bg-purple-800/60 transition"
                >
                  {t('nextStep')} →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Diagram error fallback */}
        {diagramError && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Unable to display interactive diagram. {imageUrl ? 'Showing static image instead.' : 'Please refer to the lesson content.'}
            </p>
          </div>
        )}

        {/* Image-based diagram (fallback) */}
        {!diagramData && imageUrl && (
          <StepImage url={imageUrl} alt={imageAlt || t('diagramType')} caption={imageCaption} credit={imageCredit} creditUrl={imageCreditUrl} t={t} />
        )}

        {/* Reference text when no diagram or image */}
        {!diagramData && !imageUrl && (
          <p className="mt-4 text-sm text-purple-600 dark:text-purple-400 italic">
            {t('referToOriginalImage')}
          </p>
        )}
      </div>
    </div>
  )
}

function ExampleStep({ content, imageUrl, imageAlt, imageCaption, imageCredit, imageCreditUrl, t, helpButton }: ImageStepProps) {
  return (
    <div className="animate-fadeIn relative">
      {helpButton}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">
            {t('exampleLabel')}
          </span>
        </div>
        <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
          {content}
        </p>
        {imageUrl && <StepImage url={imageUrl} alt={imageAlt || t('exampleLabel')} caption={imageCaption} credit={imageCredit} creditUrl={imageCreditUrl} t={t} />}
      </div>
    </div>
  )
}

interface SummaryStepProps {
  content: string
  lessonTitle: string
  t: ReturnType<typeof useTranslations<'lesson'>>
}

function SummaryStep({ content, lessonTitle, t }: SummaryStepProps) {
  // Split content by newlines or periods for bullet points
  // Safely handle null/undefined content
  const points = (content || '')
    .split(/[.\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  return (
    <div className="animate-fadeIn">
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              {t('lessonSummary')}
            </span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {lessonTitle}
            </h3>
          </div>
        </div>

        {points.length > 1 ? (
          <ul className="space-y-3">
            {points.map((point, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {index + 1}
                </span>
                <span className="text-gray-800 dark:text-gray-200">{point}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
            {content}
          </p>
        )}
      </div>
    </div>
  )
}
