'use client'

import { motion } from 'framer-motion'
import type { ReactElement } from 'react'
import { labelAppearVariants } from '@/lib/diagram-animations'

interface SVGLabelProps {
  x: number
  y: number
  text: string
  fontSize?: number
  fontWeight?: number | string
  color?: string
  textAnchor?: 'start' | 'middle' | 'end'
  background?: string
  padding?: number
  rotate?: number
  animate?: boolean
  visible?: boolean
  className?: string
}

export function SVGLabel({
  x,
  y,
  text,
  fontSize = 12,
  fontWeight = 400,
  color,
  textAnchor = 'middle',
  background,
  padding: pad = 4,
  rotate,
  animate = true,
  visible = true,
  className,
}: SVGLabelProps): ReactElement | null {
  if (!visible) return null

  const transform = rotate ? `rotate(${rotate}, ${x}, ${y})` : undefined

  if (background) {
    const estW = text.length * fontSize * 0.6 + pad * 2
    const estH = fontSize + pad * 2
    const rx = textAnchor === 'start' ? x - pad : textAnchor === 'end' ? x - estW + pad : x - estW / 2
    const ry = y - estH + pad

    return (
      <motion.g
        transform={transform}
        initial={animate ? 'hidden' : undefined}
        animate={animate ? 'visible' : undefined}
        variants={animate ? labelAppearVariants : undefined}
      >
        <rect x={rx} y={ry} width={estW} height={estH} rx={3} fill={background} />
        <text x={x} y={y} textAnchor={textAnchor}
          style={{ fontSize, fontWeight, fill: color }}
          className={color ? className : (className ?? 'fill-gray-700 dark:fill-gray-300')}>
          {text}
        </text>
      </motion.g>
    )
  }

  return (
    <motion.text
      x={x} y={y}
      textAnchor={textAnchor}
      transform={transform}
      style={{ fontSize, fontWeight, fill: color }}
      className={color ? className : (className ?? 'fill-gray-700 dark:fill-gray-300')}
      initial={animate ? 'hidden' : undefined}
      animate={animate ? 'visible' : undefined}
      variants={animate ? labelAppearVariants : undefined}
    >
      {text}
    </motion.text>
  )
}
