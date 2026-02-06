'use client'

import { motion } from 'framer-motion'
import type { ReactElement } from 'react'

interface SVGPointProps {
  cx: number
  cy: number
  r?: number
  color?: string
  label?: string
  labelOffset?: { dx: number; dy: number }
  showGlow?: boolean
  visible?: boolean
  animate?: boolean
}

export function SVGPoint({
  cx,
  cy,
  r = 6,
  color = '#6366f1',
  label,
  labelOffset = { dx: 12, dy: -10 },
  showGlow = false,
  visible = true,
  animate = true,
}: SVGPointProps): ReactElement | null {
  if (!visible) return null

  const animProps = animate
    ? { initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } }
    : {}

  return (
    <motion.g {...animProps}>
      {showGlow && (
        <circle cx={cx} cy={cy} r={r * 2} fill={color} opacity={0.15} />
      )}
      <circle cx={cx} cy={cy} r={r} fill={color} />
      <circle cx={cx - r * 0.25} cy={cy - r * 0.25} r={r * 0.3} fill="rgba(255,255,255,0.5)" />
      {label && (
        <motion.text
          x={cx + labelOffset.dx}
          y={cy + labelOffset.dy}
          style={{ fontSize: 12, fill: color, fontWeight: 500 }}
          initial={animate ? { opacity: 0, y: 8 } : undefined}
          animate={animate ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {label}
        </motion.text>
      )}
    </motion.g>
  )
}
