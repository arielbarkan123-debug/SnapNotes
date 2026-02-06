'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { ReactElement } from 'react'

interface SVGCurveProps {
  fn: (x: number) => number
  xMin: number
  xMax: number
  yMin: number
  yMax: number
  padding: number
  width: number
  height: number
  color?: string
  strokeWidth?: number
  samples?: number
  animate?: boolean
  visible?: boolean
}

export function SVGCurve({
  fn,
  xMin,
  xMax,
  yMin,
  yMax,
  padding,
  width,
  height,
  color,
  strokeWidth = 2,
  samples = 200,
  animate = true,
  visible = true,
}: SVGCurveProps): ReactElement | null {
  const plotW = width - padding * 2
  const plotH = height - padding * 2
  const xRange = xMax - xMin || 1
  const yRange = yMax - yMin || 1

  const pathD = useMemo(() => {
    const step = (xMax - xMin) / samples
    const parts: string[] = []
    let drawing = false

    for (let i = 0; i <= samples; i++) {
      const x = xMin + i * step
      const y = fn(x)
      if (y == null || !isFinite(y) || y < yMin - yRange * 0.5 || y > yMax + yRange * 0.5) {
        drawing = false
        continue
      }
      const sx = padding + ((x - xMin) / xRange) * plotW
      const sy = padding + plotH - ((y - yMin) / yRange) * plotH
      parts.push(`${drawing ? "L" : "M"} ${sx.toFixed(2)} ${sy.toFixed(2)}`)
      drawing = true
    }
    return parts.join(' ')
  }, [fn, xMin, xMax, yMin, yMax, padding, plotW, plotH, xRange, yRange, samples])

  if (!visible) return null

  return (
    <motion.path
      d={pathD}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={color ? undefined : 'stroke-indigo-500 dark:stroke-indigo-400'}
      initial={animate ? { pathLength: 0, opacity: 0 } : undefined}
      animate={animate ? { pathLength: 1, opacity: 1 } : undefined}
      transition={animate ? { pathLength: { duration: 0.8, ease: [0.65, 0, 0.35, 1] }, opacity: { duration: 0.1 } } : undefined}
    />
  )
}
