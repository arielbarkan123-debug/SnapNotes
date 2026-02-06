'use client'

import { motion } from 'framer-motion'
import type { ReactElement } from 'react'

interface SVGGridProps {
  width: number
  height: number
  xMin: number
  xMax: number
  yMin: number
  yMax: number
  padding: number
  showMinorGrid?: boolean
  majorInterval?: number
  minorInterval?: number
  animate?: boolean
  className?: string
}

export function SVGGrid({
  width,
  height,
  xMin,
  xMax,
  yMin,
  yMax,
  padding,
  showMinorGrid = true,
  majorInterval,
  minorInterval,
  animate = true,
  className,
}: SVGGridProps): ReactElement {
  const plotW = width - padding * 2
  const plotH = height - padding * 2
  const xRange = xMax - xMin || 1
  const yRange = yMax - yMin || 1

  const major = majorInterval ?? Math.max(1, Math.ceil(xRange / 10))
  const minor = minorInterval ?? major / 2

  const toSvgX = (x: number) => padding + ((x - xMin) / xRange) * plotW
  const toSvgY = (y: number) => padding + plotH - ((y - yMin) / yRange) * plotH

  const majorLines: ReactElement[] = []
  const minorLines: ReactElement[] = []

  for (let x = Math.ceil(xMin / minor) * minor; x <= xMax; x += minor) {
    const sx = toSvgX(x)
    const isMajor = Math.abs(x % major) < 0.001
    const arr = isMajor ? majorLines : minorLines
    arr.push(
      <line key={`v-${x}`} x1={sx} y1={padding} x2={sx} y2={height - padding} />
    )
  }

  for (let y = Math.ceil(yMin / minor) * minor; y <= yMax; y += minor) {
    const sy = toSvgY(y)
    const isMajor = Math.abs(y % major) < 0.001
    const arr = isMajor ? majorLines : minorLines
    arr.push(
      <line key={`h-${y}`} x1={padding} y1={sy} x2={width - padding} y2={sy} />
    )
  }

  const Wrapper = animate ? motion.g : 'g'
  const wrapperProps = animate
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4 } }
    : {}

  return (
    <Wrapper {...(wrapperProps as Record<string, unknown>)} className={className}>
      {showMinorGrid && (
        <g className="stroke-gray-100 dark:stroke-gray-800" strokeWidth={0.5}>
          {minorLines}
        </g>
      )}
      <g className="stroke-gray-200 dark:stroke-gray-700" strokeWidth={0.75}>
        {majorLines}
      </g>
    </Wrapper>
  )
}
