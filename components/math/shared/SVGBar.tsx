'use client'

import { motion } from 'framer-motion'
import type { ReactElement } from 'react'

interface SVGBarProps {
  x: number
  y: number
  width: number
  height: number
  color?: string
  fillOpacity?: number
  strokeColor?: string
  animate?: boolean
  delay?: number
  visible?: boolean
}

export function SVGBar({
  x,
  y,
  width: barW,
  height: barH,
  color = '#6366f1',
  fillOpacity = 1,
  strokeColor,
  animate = true,
  delay = 0,
  visible = true,
}: SVGBarProps): ReactElement | null {
  if (!visible) return null

  const baseY = y + barH

  return (
    <motion.rect
      x={x}
      y={y}
      width={barW}
      height={barH}
      rx={2}
      fill={color}
      fillOpacity={fillOpacity}
      stroke={strokeColor}
      strokeWidth={strokeColor ? 1 : 0}
      initial={animate ? { height: 0, y: baseY } : undefined}
      animate={animate ? { height: barH, y } : undefined}
      transition={
        animate
          ? { delay, duration: 0.5, type: 'spring', stiffness: 120, damping: 14 }
          : undefined
      }
    />
  )
}
