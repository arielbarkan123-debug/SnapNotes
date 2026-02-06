'use client'

import { motion } from 'framer-motion'
import type { ReactElement } from 'react'

interface SVGArrowProps {
  x: number
  y: number
  direction: 'up' | 'down' | 'left' | 'right'
  size?: number
  color?: string
  animate?: boolean
  visible?: boolean
}

const DIRECTION_POINTS: Record<string, (x: number, y: number, s: number) => string> = {
  up: (x, y, s) => `${x},${y - s} ${x - s * 0.6},${y + s * 0.4} ${x + s * 0.6},${y + s * 0.4}`,
  down: (x, y, s) => `${x},${y + s} ${x - s * 0.6},${y - s * 0.4} ${x + s * 0.6},${y - s * 0.4}`,
  left: (x, y, s) => `${x - s},${y} ${x + s * 0.4},${y - s * 0.6} ${x + s * 0.4},${y + s * 0.6}`,
  right: (x, y, s) => `${x + s},${y} ${x - s * 0.4},${y - s * 0.6} ${x - s * 0.4},${y + s * 0.6}`,
}

export function SVGArrow({
  x,
  y,
  direction,
  size = 8,
  color,
  animate = true,
  visible = true,
}: SVGArrowProps): ReactElement | null {
  if (!visible) return null

  const points = DIRECTION_POINTS[direction](x, y, size)

  return (
    <motion.polygon
      points={points}
      fill={color}
      className={color ? undefined : 'fill-gray-800 dark:fill-gray-300'}
      initial={animate ? { scale: 0, opacity: 0 } : undefined}
      animate={animate ? { scale: 1, opacity: 1 } : undefined}
      transition={animate ? { type: 'spring', stiffness: 300, damping: 20 } : undefined}
      style={{ transformOrigin: `${x}px ${y}px` }}
    />
  )
}
