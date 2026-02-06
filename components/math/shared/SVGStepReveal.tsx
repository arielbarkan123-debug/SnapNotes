'use client'

import { motion } from 'framer-motion'
import type { ReactElement, ReactNode } from 'react'

interface SVGStepRevealProps {
  visible: boolean
  children: ReactNode
  delay?: number
  duration?: number
  mode?: 'fade' | 'draw' | 'scale'
}

const MODES = {
  fade: {
    hidden: { opacity: 0 },
    show: { opacity: 1 },
  },
  draw: {
    hidden: { opacity: 0, pathLength: 0 },
    show: { opacity: 1, pathLength: 1 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.8 },
    show: { opacity: 1, scale: 1 },
  },
} as const

export function SVGStepReveal({
  visible,
  children,
  delay = 0,
  duration = 0.4,
  mode = 'fade',
}: SVGStepRevealProps): ReactElement {
  const variants = MODES[mode]

  return (
    <motion.g
      initial="hidden"
      animate={visible ? 'show' : 'hidden'}
      variants={{
        hidden: variants.hidden,
        show: {
          ...variants.show,
          transition: { duration, delay, ease: 'easeOut' },
        },
      }}
    >
      {children}
    </motion.g>
  )
}
