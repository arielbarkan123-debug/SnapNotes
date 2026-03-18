'use client'

/**
 * LabeledDiagramOverlay — renders labeled diagrams using SVG+HTML overlay on top
 * of a Recraft image. Three-layer architecture:
 *   Layer 1: <img> base image (Recraft from Supabase storage URL)
 *   Layer 2: <svg> for leader lines + target dots
 *   Layer 3: HTML <div> elements for label text (positioned absolutely with %)
 *
 * Replaces ~770 lines of server-side TikZ compositing with ~200 lines of
 * client-side rendering.
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { OverlayLabel } from '@/types'

export interface LabeledDiagramOverlayProps {
  imageUrl: string              // Supabase storage URL
  labels: OverlayLabel[]        // from API response
  locale: 'en' | 'he'          // determines text field + direction
  step: number | null           // null = show all, 0-N = progressive
  onLabelClick?: (label: OverlayLabel) => void
}

export default function LabeledDiagramOverlay({
  imageUrl,
  labels,
  locale,
  step,
  onLabelClick,
}: LabeledDiagramOverlayProps) {
  const [imageLoaded, setImageLoaded] = useState(false)

  /** Filter labels based on `found` and `step` */
  const visibleLabels = useMemo(() => {
    return labels.filter((label) => {
      // Filter out labels where found === false (default to true when absent)
      if (label.found === false) return false

      // When step is not null, filter by stepGroup
      if (step !== null) {
        // step is 0-based, stepGroup is 1-based
        // Labels without stepGroup default to showing always
        if (label.stepGroup != null && label.stepGroup > step + 1) {
          return false
        }
      }

      return true
    })
  }, [labels, step])

  /** Get the display text for a label based on locale */
  function getLabelText(label: OverlayLabel): string {
    if (locale === 'he' && label.textHe) {
      return label.textHe
    }
    return label.text
  }

  return (
    <div
      role="img"
      aria-label="Labeled diagram"
      className="relative w-full"
      style={{ aspectRatio: '1 / 1' }}
    >
      {/* Skeleton pulse placeholder while image loads */}
      {!imageLoaded && (
        <div className="absolute inset-0 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
      )}

      {/* Layer 1: Base image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt=""
        role="presentation"
        data-testid="diagram-image"
        className="absolute inset-0 w-full h-full rounded-lg object-cover"
        onLoad={() => setImageLoaded(true)}
      />

      {/* Layers 2+3 are hidden until the image fires onLoad */}
      {imageLoaded && (
        <>
          {/* Layer 2: SVG for leader lines + target dots */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {visibleLabels.map((label, idx) => (
              <g key={`line-${idx}`}>
                {/* Leader line from target to label position */}
                <line
                  x1={label.targetX}
                  y1={label.targetY}
                  x2={label.x}
                  y2={label.y}
                  stroke="currentColor"
                  strokeWidth="0.3"
                  opacity="0.5"
                  className="text-gray-500 dark:text-gray-400"
                />
                {/* Small dot at target point */}
                <circle
                  cx={label.targetX}
                  cy={label.targetY}
                  r="0.5"
                  className="fill-gray-500 dark:fill-gray-400"
                />
              </g>
            ))}
          </svg>

          {/* Layer 3: HTML label elements positioned absolutely */}
          <AnimatePresence>
            {visibleLabels.map((label, idx) => {
              const isLeftSide = label.x < 50

              return (
                <motion.div
                  key={`label-${label.text}-${idx}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className={[
                    'absolute pointer-events-auto cursor-default',
                    'px-1.5 py-0.5 text-[10px] leading-tight font-medium',
                    'bg-white dark:bg-gray-800',
                    'text-gray-800 dark:text-gray-200',
                    'border border-gray-200 dark:border-gray-600',
                    'rounded shadow-sm',
                    'select-none whitespace-nowrap',
                  ].join(' ')}
                  style={{
                    left: `${label.x}%`,
                    top: `${label.y}%`,
                    transform: isLeftSide
                      ? 'translateY(-50%)'
                      : 'translate(-100%, -50%)',
                  }}
                  dir={locale === 'he' ? 'rtl' : undefined}
                  onClick={onLabelClick ? () => onLabelClick(label) : undefined}
                >
                  {getLabelText(label)}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}
