'use client'

import { motion } from 'framer-motion'
import type { ReactElement } from 'react'

interface SVGFractionBarProps {
  x: number
  y: number
  width: number
  height: number
  numerator: number
  denominator: number
  color?: string
  emptyColor?: string
  animate?: boolean
  visible?: boolean
}

export function SVGFractionBar({
  x,
  y,
  width: barW,
  height: barH,
  numerator,
  denominator,
  color = '#6366f1',
  emptyColor,
  animate = true,
  visible = true,
}: SVGFractionBarProps): ReactElement | null {
  if (!visible) return null

  const denom = Math.max(denominator, 1)
  const partW = barW / denom

  return (
    <g>
      {/* Empty background */}
      <rect x={x} y={y} width={barW} height={barH} rx={3}
        fill={emptyColor} strokeWidth={1.5}
        className={emptyColor ? undefined : 'fill-gray-100 dark:fill-gray-800 stroke-gray-300 dark:stroke-gray-600'} />

      {/* Filled sections */}
      {Array.from({ length: Math.min(numerator, denom) }, (_, i) => (
        <motion.rect
          key={`fill-${i}`}
          x={x + i * partW}
          y={y}
          width={partW}
          height={barH}
          fill={color}
          fillOpacity={0.55}
          rx={i === 0 || i === denom - 1 ? 3 : 0}
          initial={animate ? { opacity: 0, scaleX: 0 } : undefined}
          animate={animate ? { opacity: 1, scaleX: 1 } : undefined}
          transition={{ delay: i * 0.08, duration: 0.3 }}
          style={{ transformOrigin: `${x + i * partW}px ${y + barH / 2}px` }}
        />
      ))}

      {/* Section dividers */}
      {Array.from({ length: denom - 1 }, (_, i) => (
        <line key={`div-${i}`}
          x1={x + (i + 1) * partW} y1={y}
          x2={x + (i + 1) * partW} y2={y + barH}
          strokeWidth={1}
          className="stroke-gray-400 dark:stroke-gray-500" />
      ))}
    </g>
  )
}
