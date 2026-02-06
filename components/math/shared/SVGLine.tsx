'use client'

import { motion } from 'framer-motion'
import type { ReactElement } from 'react'
import { lineDrawVariants } from '@/lib/diagram-animations'

interface SVGLineProps {
  x1: number
  y1: number
  x2: number
  y2: number
  color?: string
  strokeWidth?: number
  dashed?: boolean
  dashPattern?: string
  animate?: boolean
  visible?: boolean
  cap?: boolean
}

const DASH_PATTERNS: Record<string, string> = {
  dashed: '8 4',
  dotted: '2 4',
}

export function SVGLine({
  x1,
  y1,
  x2,
  y2,
  color,
  strokeWidth = 2,
  dashed = false,
  dashPattern,
  animate = true,
  visible = true,
  cap = false,
}: SVGLineProps): ReactElement | null {
  if (!visible) return null

  const dash = dashPattern ?? (dashed ? DASH_PATTERNS.dashed : undefined)
  const capLen = 6

  // Perpendicular direction for end caps
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const px = (-dy / len) * capLen
  const py = (dx / len) * capLen

  return (
    <g>
      <motion.line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={dash} strokeLinecap="round"
        className={color ? undefined : 'stroke-gray-800 dark:stroke-gray-300'}
        initial={animate ? 'hidden' : undefined}
        animate={animate ? 'visible' : undefined}
        variants={animate ? lineDrawVariants : undefined}
      />
      {cap && (
        <>
          <motion.line x1={x1 - px} y1={y1 - py} x2={x1 + px} y2={y1 + py}
            stroke={color} strokeWidth={strokeWidth}
            className={color ? undefined : 'stroke-gray-800 dark:stroke-gray-300'}
            initial={animate ? { opacity: 0 } : undefined}
            animate={animate ? { opacity: 1 } : undefined}
            transition={{ delay: 0.5 }} />
          <motion.line x1={x2 - px} y1={y2 - py} x2={x2 + px} y2={y2 + py}
            stroke={color} strokeWidth={strokeWidth}
            className={color ? undefined : 'stroke-gray-800 dark:stroke-gray-300'}
            initial={animate ? { opacity: 0 } : undefined}
            animate={animate ? { opacity: 1 } : undefined}
            transition={{ delay: 0.5 }} />
        </>
      )}
    </g>
  )
}
