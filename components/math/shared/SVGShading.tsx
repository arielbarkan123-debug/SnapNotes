'use client'

import { motion } from 'framer-motion'
import type { ReactElement } from 'react'

interface SVGShadingProps {
  path: string
  color?: string
  opacity?: number
  animate?: boolean
  visible?: boolean
}

export function SVGShading({
  path,
  color = '#6366f1',
  opacity = 0.2,
  animate = true,
  visible = true,
}: SVGShadingProps): ReactElement | null {
  if (!visible) return null

  return (
    <motion.path
      d={path}
      fill={color}
      fillOpacity={opacity}
      stroke="none"
      initial={animate ? { opacity: 0 } : undefined}
      animate={animate ? { opacity: 1 } : undefined}
      transition={animate ? { duration: 0.5, ease: 'easeOut' } : undefined}
    />
  )
}
