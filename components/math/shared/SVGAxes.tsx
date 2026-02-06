'use client'

import { motion } from 'framer-motion'
import type { ReactElement } from 'react'
import { lineDrawVariants, labelAppearVariants } from '@/lib/diagram-animations'

interface SVGAxesProps {
  width: number
  height: number
  xMin: number
  xMax: number
  yMin: number
  yMax: number
  padding: number
  xLabel?: string
  yLabel?: string
  tickInterval?: number
  showTickLabels?: boolean
  showArrows?: boolean
  className?: string
}

export function SVGAxes({ width, height, xMin, xMax, yMin, yMax, padding,
  xLabel, yLabel, tickInterval, showTickLabels = true, showArrows = true, className,
}: SVGAxesProps): ReactElement {
  const pW = width - padding * 2, pH = height - padding * 2
  const xR = xMax - xMin || 1, yR = yMax - yMin || 1
  const tick = tickInterval ?? Math.max(1, Math.ceil(xR / 10))
  const toX = (x: number) => padding + ((x - xMin) / xR) * pW
  const toY = (y: number) => padding + pH - ((y - yMin) / yR) * pH
  const xO = yMin <= 0 && yMax >= 0, yO = xMin <= 0 && xMax >= 0
  const aY = xO ? toY(0) : height - padding, aX = yO ? toX(0) : padding

  const buildTicks = (min: number, max: number, skipOrigin: boolean) => {
    const arr: number[] = []
    for (let v = Math.ceil(min / tick) * tick; v <= max; v += tick) {
      if (Math.abs(v) > 0.001 || !skipOrigin) arr.push(Math.round(v * 1000) / 1000)
    }
    return arr
  }
  const xTicks = buildTicks(xMin, xMax, yO), yTicks = buildTicks(yMin, yMax, xO)
  const fmtTick = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))
  const sp = { type: 'spring' as const, stiffness: 300, damping: 20 }

  return (
    <g className={className}>
      <motion.line x1={padding} y1={aY} x2={width - padding} y2={aY}
        className="stroke-gray-800 dark:stroke-gray-300" strokeWidth={2}
        initial="hidden" animate="visible" variants={lineDrawVariants} />
      <motion.line x1={aX} y1={height - padding} x2={aX} y2={padding}
        className="stroke-gray-800 dark:stroke-gray-300" strokeWidth={2}
        initial="hidden" animate="visible" variants={lineDrawVariants} />
      {showArrows && (<>
        <motion.polygon points={`${width - padding + 8},${aY} ${width - padding},${aY - 4} ${width - padding},${aY + 4}`}
          className="fill-gray-800 dark:fill-gray-300" initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, ...sp }} />
        <motion.polygon points={`${aX},${padding - 8} ${aX - 4},${padding} ${aX + 4},${padding}`}
          className="fill-gray-800 dark:fill-gray-300" initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6, ...sp }} />
      </>)}
      {xTicks.map((v, i) => (
        <motion.g key={`xt-${v}`} initial="hidden" animate="visible" variants={labelAppearVariants}
          transition={{ delay: i * 0.02 }}>
          <line x1={toX(v)} y1={aY - 4} x2={toX(v)} y2={aY + 4}
            className="stroke-gray-800 dark:stroke-gray-300" strokeWidth={1.5} />
          {showTickLabels && <text x={toX(v)} y={aY + 18} textAnchor="middle"
            className="fill-gray-700 dark:fill-gray-300" style={{ fontSize: 11 }}>{fmtTick(v)}</text>}
        </motion.g>
      ))}
      {yTicks.map((v, i) => (
        <motion.g key={`yt-${v}`} initial="hidden" animate="visible" variants={labelAppearVariants}
          transition={{ delay: i * 0.02 }}>
          <line x1={aX - 4} y1={toY(v)} x2={aX + 4} y2={toY(v)}
            className="stroke-gray-800 dark:stroke-gray-300" strokeWidth={1.5} />
          {showTickLabels && <text x={aX - 10} y={toY(v) + 4} textAnchor="end"
            className="fill-gray-700 dark:fill-gray-300" style={{ fontSize: 11 }}>{fmtTick(v)}</text>}
        </motion.g>
      ))}
      {xLabel && <motion.text x={width - padding + 16} y={aY + 5}
        className="fill-gray-700 dark:fill-gray-300" style={{ fontSize: 14 }}
        initial="hidden" animate="visible" variants={labelAppearVariants}>{xLabel}</motion.text>}
      {yLabel && <motion.text x={aX - 5} y={padding - 14} textAnchor="middle"
        className="fill-gray-700 dark:fill-gray-300" style={{ fontSize: 14 }}
        initial="hidden" animate="visible" variants={labelAppearVariants}>{yLabel}</motion.text>}
    </g>
  )
}
