'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import type { AnnotatedFeedbackPoint, AnnotationData } from '@/lib/homework/types'

interface AnnotatedImageViewerProps {
  /** URL of the answer image to display */
  imageUrl: string
  /** Annotation data with correct and error points */
  annotations: AnnotationData
  /** Callback when an annotation is clicked */
  onAnnotationClick?: (annotation: AnnotatedFeedbackPoint) => void
  /** ID of the currently selected annotation */
  selectedAnnotationId?: string | null
  /** Whether to show annotations (default: true) */
  showAnnotations?: boolean
}

/**
 * AnnotatedImageViewer - Displays an image with SVG overlay annotations
 * showing green checkmarks for correct points and red X marks for errors.
 */
export default function AnnotatedImageViewer({
  imageUrl,
  annotations,
  onAnnotationClick,
  selectedAnnotationId,
  showAnnotations = true,
}: AnnotatedImageViewerProps) {
  const [imageError, setImageError] = useState(false)

  const handleAnnotationClick = useCallback(
    (annotation: AnnotatedFeedbackPoint) => {
      onAnnotationClick?.(annotation)
    },
    [onAnnotationClick]
  )

  if (imageError) {
    return (
      <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Failed to load image</p>
      </div>
    )
  }

  return (
    <div className="relative w-full">
      <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
        {/* Base Image */}
        <Image
          src={imageUrl}
          alt="Student answer"
          fill
          className="object-contain"
          onError={() => setImageError(true)}
          unoptimized
        />

        {/* SVG Overlay for Annotations */}
        {showAnnotations && annotations.hasAnnotations && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {/* Correct Points - Green Checkmarks */}
            {annotations.correctAnnotations.map((point) =>
              point.region ? (
                <CorrectAnnotation
                  key={point.annotationId}
                  point={point}
                  isSelected={selectedAnnotationId === point.annotationId}
                  onClick={() => handleAnnotationClick(point)}
                />
              ) : null
            )}

            {/* Error Points - Red X Marks */}
            {annotations.errorAnnotations.map((point) =>
              point.region ? (
                <ErrorAnnotation
                  key={point.annotationId}
                  point={point}
                  isSelected={selectedAnnotationId === point.annotationId}
                  onClick={() => handleAnnotationClick(point)}
                />
              ) : null
            )}
          </svg>
        )}
      </div>

      {/* Legend */}
      {showAnnotations && annotations.hasAnnotations && (
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-600 dark:text-gray-400">
          {annotations.correctAnnotations.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-green-500 rounded-full" />
              <span>Correct ({annotations.correctAnnotations.length})</span>
            </div>
          )}
          {annotations.errorAnnotations.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-red-500 rounded-full" />
              <span>Needs work ({annotations.errorAnnotations.length})</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Sub-components for annotations
// ============================================================================

interface AnnotationProps {
  point: AnnotatedFeedbackPoint
  isSelected: boolean
  onClick: () => void
}

/**
 * Green checkmark annotation for correct points
 */
function CorrectAnnotation({ point, isSelected, onClick }: AnnotationProps) {
  const { x, y, width = 8, height = 8 } = point.region!
  const centerX = x + (width / 2)
  const centerY = y + (height / 2)
  const radius = 3

  return (
    <g
      className="pointer-events-auto cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Correct: ${point.title}`}
    >
      {/* Highlight region */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="#22C55E"
        opacity={isSelected ? 0.35 : 0.15}
        rx={0.5}
        className="transition-opacity duration-200"
      />

      {/* Green circle background */}
      <circle
        cx={centerX}
        cy={centerY}
        r={radius + 1}
        fill="#22C55E"
        opacity={0.2}
      />

      {/* Green circle */}
      <circle
        cx={centerX}
        cy={centerY}
        r={radius}
        fill="#22C55E"
        className={isSelected ? 'opacity-100' : 'opacity-90'}
      />

      {/* White checkmark */}
      <path
        d={`M ${centerX - radius * 0.5} ${centerY} L ${centerX - radius * 0.15} ${centerY + radius * 0.4} L ${centerX + radius * 0.55} ${centerY - radius * 0.4}`}
        stroke="white"
        strokeWidth={radius * 0.35}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Selection ring */}
      {isSelected && (
        <circle
          cx={centerX}
          cy={centerY}
          r={radius + 2}
          fill="none"
          stroke="#22C55E"
          strokeWidth={0.3}
        />
      )}
    </g>
  )
}

/**
 * Red X mark annotation for error/improvement points
 */
function ErrorAnnotation({ point, isSelected, onClick }: AnnotationProps) {
  const { x, y, width = 8, height = 8 } = point.region!
  const centerX = x + (width / 2)
  const centerY = y + (height / 2)
  const radius = 3

  return (
    <g
      className="pointer-events-auto cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Needs improvement: ${point.title}`}
    >
      {/* Highlight region */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="#EF4444"
        opacity={isSelected ? 0.35 : 0.15}
        rx={0.5}
        className="transition-opacity duration-200"
      />

      {/* Red circle background */}
      <circle
        cx={centerX}
        cy={centerY}
        r={radius + 1}
        fill="#EF4444"
        opacity={0.2}
      />

      {/* Red circle */}
      <circle
        cx={centerX}
        cy={centerY}
        r={radius}
        fill="#EF4444"
        className={isSelected ? 'opacity-100' : 'opacity-90'}
      />

      {/* White X mark */}
      <line
        x1={centerX - radius * 0.45}
        y1={centerY - radius * 0.45}
        x2={centerX + radius * 0.45}
        y2={centerY + radius * 0.45}
        stroke="white"
        strokeWidth={radius * 0.35}
        strokeLinecap="round"
      />
      <line
        x1={centerX + radius * 0.45}
        y1={centerY - radius * 0.45}
        x2={centerX - radius * 0.45}
        y2={centerY + radius * 0.45}
        stroke="white"
        strokeWidth={radius * 0.35}
        strokeLinecap="round"
      />

      {/* Selection ring */}
      {isSelected && (
        <circle
          cx={centerX}
          cy={centerY}
          r={radius + 2}
          fill="none"
          stroke="#EF4444"
          strokeWidth={0.3}
        />
      )}
    </g>
  )
}
