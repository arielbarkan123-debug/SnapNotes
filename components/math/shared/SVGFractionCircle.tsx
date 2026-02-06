'use client'

import { motion } from 'framer-motion'
import type { ReactElement } from 'react'

interface SVGFractionCircleProps {
  cx: number
  cy: number
  r: number
  numerator: number
  denominator: number
  color?: string
  emptyColor?: string
  animate?: boolean
  visible?: boolean
  startAngle?: number
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  const s = ((start - 90) * Math.PI) / 180
  const e = ((end - 90) * Math.PI) / 180
  const x1 = cx + r * Math.cos(s)
  const y1 = cy + r * Math.sin(s)
  const x2 = cx + r * Math.cos(e)
  const y2 = cy + r * Math.sin(e)
  const large = end - start > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
}

export function SVGFractionCircle({
  cx,
  cy,
  r,
  numerator,
  denominator,
  color = '#6366f1',
  emptyColor,
  animate = true,
  visible = true,
  startAngle = 0,
}: SVGFractionCircleProps): ReactElement | null {
  if (!visible) return null

  const denom = Math.max(denominator, 1)
  const sliceAngle = 360 / denom

  return (
    <g>
      {/* Empty circle */}
      <circle cx={cx} cy={cy} r={r} fill={emptyColor} strokeWidth={1.5}
        className={emptyColor ? undefined : 'fill-gray-100 dark:fill-gray-800 stroke-gray-300 dark:stroke-gray-600'} />

      {/* Filled sectors */}
      {Array.from({ length: Math.min(numerator, denom) }, (_, i) => {
        const sa = startAngle + i * sliceAngle
        const ea = sa + sliceAngle
        return (
          <motion.path
            key={`sec-${i}`}
            d={arcPath(cx, cy, r, sa, ea)}
            fill={color}
            fillOpacity={0.55}
            stroke={color}
            strokeWidth={1}
            initial={animate ? { opacity: 0, scale: 0.8 } : undefined}
            animate={animate ? { opacity: 1, scale: 1 } : undefined}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
        )
      })}

      {/* Division lines */}
      {Array.from({ length: denom }, (_, i) => {
        const angle = ((startAngle + i * sliceAngle - 90) * Math.PI) / 180
        return (
          <line key={`dv-${i}`}
            x1={cx} y1={cy}
            x2={cx + r * Math.cos(angle)} y2={cy + r * Math.sin(angle)}
            strokeWidth={1}
            className="stroke-gray-400 dark:stroke-gray-500" />
        )
      })}
    </g>
  )
}
