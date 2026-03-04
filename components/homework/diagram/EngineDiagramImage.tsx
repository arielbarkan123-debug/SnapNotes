'use client'

/**
 * Renders an engine-generated diagram image (E2B LaTeX, Matplotlib, TikZ, or Recraft).
 *
 * Note on Recraft pipeline: Labels are now composited directly into the image via TikZ
 * before being returned. Recraft NEVER generates text - all text comes from TikZ.
 * The overlay prop is kept for backwards compatibility but Recraft no longer uses it.
 */

import StepByStepButton from './StepByStepButton'

interface OverlayLabel {
  text: string
  x: number
  y: number
  targetX: number
  targetY: number
}

interface EngineDiagramImageProps {
  imageUrl: string
  pipeline?: string
  overlay?: OverlayLabel[]
  qaVerdict?: string
  /** If present, shows "Step by Step" button */
  hasStepByStep?: boolean
  /** Called when user clicks Step by Step */
  onStepByStepClick?: () => void
  /** Whether step-by-step is currently loading */
  stepByStepLoading?: boolean
}

/** Get badge style based on pipeline type */
function getPipelineBadgeStyle(pipeline: string): { bg: string; icon: string; label: string } {
  switch (pipeline.toLowerCase()) {
    case 'recraft':
      return {
        bg: 'bg-purple-500/90',
        icon: '🎨',
        label: 'Recraft AI',
      }
    case 'tikz':
      return {
        bg: 'bg-blue-500/90',
        icon: '📐',
        label: 'TikZ',
      }
    case 'e2b-latex':
      return {
        bg: 'bg-green-500/90',
        icon: '📊',
        label: 'LaTeX',
      }
    case 'e2b-matplotlib':
      return {
        bg: 'bg-orange-500/90',
        icon: '📈',
        label: 'Matplotlib',
      }
    default:
      return {
        bg: 'bg-gray-500/90',
        icon: '🖼️',
        label: pipeline,
      }
  }
}

export default function EngineDiagramImage({
  imageUrl,
  pipeline,
  overlay,
  hasStepByStep,
  onStepByStepClick,
  stepByStepLoading,
}: EngineDiagramImageProps) {
  const badgeStyle = pipeline ? getPipelineBadgeStyle(pipeline) : null

  return (
    <div className="relative w-full">
      {/* Pipeline badge */}
      {badgeStyle && (
        <div
          className={`absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md ${badgeStyle.bg} text-white shadow-sm backdrop-blur-sm`}
        >
          <span>{badgeStyle.icon}</span>
          <span>{badgeStyle.label}</span>
        </div>
      )}

      {/* Main image */}
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Diagram"
          className="w-full h-auto rounded-lg"
          loading="lazy"
        />

        {/* Overlay labels with leader lines (Recraft pipeline) */}
        {overlay && overlay.length > 0 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {overlay.map((label, idx) => (
              <g key={idx}>
                {/* Leader line from label to target */}
                <line
                  x1={label.x}
                  y1={label.y}
                  x2={label.targetX}
                  y2={label.targetY}
                  stroke="currentColor"
                  strokeWidth="0.3"
                  className="text-gray-700 dark:text-gray-300"
                />
                {/* Small dot at target point */}
                <circle
                  cx={label.targetX}
                  cy={label.targetY}
                  r="0.5"
                  className="fill-gray-700 dark:fill-gray-300"
                />
                {/* Label background */}
                <rect
                  x={label.x - 0.5}
                  y={label.y - 1.8}
                  width={label.text.length * 1.2 + 1}
                  height="3.5"
                  rx="0.5"
                  className="fill-white dark:fill-gray-900"
                  fillOpacity="0.85"
                />
                {/* Label text */}
                <text
                  x={label.x}
                  y={label.y}
                  fontSize="2.2"
                  fontWeight="500"
                  className="fill-gray-800 dark:fill-gray-200"
                  dominantBaseline="middle"
                >
                  {label.text}
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>

      {/* Step by Step button */}
      {hasStepByStep && onStepByStepClick && (
        <div className="absolute bottom-2 right-2 z-10">
          <StepByStepButton
            onClick={onStepByStepClick}
            loading={stepByStepLoading}
          />
        </div>
      )}
    </div>
  )
}
