'use client'

import { Force, FORCE_COLORS, FORCE_SYMBOLS } from '@/types/physics'

interface ForceVectorProps {
  force: Force
  /** Origin point in SVG coordinates */
  origin: { x: number; y: number }
  /** Scale factor for force magnitude to arrow length */
  scale?: number
  /** Whether this force is highlighted */
  highlighted?: boolean
  /** Whether to show the label */
  showLabel?: boolean
  /** Whether to show magnitude value */
  showMagnitude?: boolean
  /** Whether to show angle arc */
  showAngle?: boolean
  /** Reference angle for angle arc (degrees) */
  referenceAngle?: number
  /** Animation state */
  animation?: 'none' | 'fade' | 'draw' | 'pulse'
  /** Animation duration in ms */
  animationDuration?: number
  /** Opacity (for fade animations) */
  opacity?: number
  /** Arrow head size */
  arrowSize?: number
  /** Stroke width */
  strokeWidth?: number
  /** Custom className for additional styling */
  className?: string
}

/**
 * ForceVector - SVG component for rendering a single force arrow
 *
 * Features:
 * - Force arrow with arrowhead
 * - Color-coded by force type
 * - Optional label with symbol and subscript
 * - Optional magnitude display
 * - Optional angle arc from reference
 * - Animation support for step-synced reveals
 */
export function ForceVector({
  force,
  origin,
  scale = 1,
  highlighted = false,
  showLabel = true,
  showMagnitude = false,
  showAngle = false,
  referenceAngle = 0,
  animation = 'none',
  animationDuration = 300,
  opacity = 1,
  arrowSize = 10,
  strokeWidth = 2.5,
  className = '',
}: ForceVectorProps) {
  // Get color based on force type
  const color = force.color || FORCE_COLORS[force.type] || '#6366f1'

  // Calculate end point based on magnitude and angle
  const angleRad = (force.angle * Math.PI) / 180
  const length = force.magnitude * scale

  const endX = origin.x + length * Math.cos(angleRad)
  const endY = origin.y - length * Math.sin(angleRad) // SVG Y is inverted

  // Calculate arrowhead points
  const arrowAngle = Math.atan2(origin.y - endY, endX - origin.x)
  const arrowPoint1 = {
    x: endX - arrowSize * Math.cos(arrowAngle - Math.PI / 6),
    y: endY + arrowSize * Math.sin(arrowAngle - Math.PI / 6),
  }
  const arrowPoint2 = {
    x: endX - arrowSize * Math.cos(arrowAngle + Math.PI / 6),
    y: endY + arrowSize * Math.sin(arrowAngle + Math.PI / 6),
  }

  // Label position (slightly offset from arrow end)
  const labelOffset = 15
  const labelX = endX + labelOffset * Math.cos(angleRad)
  const labelY = endY - labelOffset * Math.sin(angleRad)

  // Build label text
  const symbol = force.symbol || FORCE_SYMBOLS[force.type] || force.name
  const subscript = force.subscript || ''

  // Animation styles
  const getAnimationStyle = () => {
    switch (animation) {
      case 'fade':
        return {
          transition: `opacity ${animationDuration}ms ease-in-out`,
          opacity,
        }
      case 'draw':
        return {
          strokeDasharray: length + arrowSize * 2,
          strokeDashoffset: 0,
          animation: `drawForce ${animationDuration}ms ease-out forwards`,
        }
      case 'pulse':
        return {
          animation: `pulseForce 1s ease-in-out infinite`,
        }
      default:
        return { opacity }
    }
  }

  const animStyle = getAnimationStyle()

  // Angle arc for showing force direction
  const renderAngleArc = () => {
    if (!showAngle) return null

    const arcRadius = 25
    const startAngle = (referenceAngle * Math.PI) / 180
    const endAngle = angleRad

    // Calculate arc path
    const startArcX = origin.x + arcRadius * Math.cos(startAngle)
    const startArcY = origin.y - arcRadius * Math.sin(startAngle)
    const endArcX = origin.x + arcRadius * Math.cos(endAngle)
    const endArcY = origin.y - arcRadius * Math.sin(endAngle)

    // Determine if we need large arc flag
    let angleDiff = force.angle - referenceAngle
    while (angleDiff < 0) angleDiff += 360
    while (angleDiff > 360) angleDiff -= 360
    const largeArc = angleDiff > 180 ? 1 : 0

    const arcPath = `M ${startArcX} ${startArcY} A ${arcRadius} ${arcRadius} 0 ${largeArc} 0 ${endArcX} ${endArcY}`

    // Angle label position
    const midAngle = (startAngle + endAngle) / 2
    const labelRadius = arcRadius + 12
    const angleLabelX = origin.x + labelRadius * Math.cos(midAngle)
    const angleLabelY = origin.y - labelRadius * Math.sin(midAngle)

    return (
      <g className="force-angle-arc">
        <path
          d={arcPath}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeDasharray="3 2"
          style={animStyle}
        />
        <text
          x={angleLabelX}
          y={angleLabelY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={11}
          fill={color}
          style={animStyle}
        >
          {Math.abs(Math.round(force.angle - referenceAngle))}°
        </text>
      </g>
    )
  }

  return (
    <g
      className={`force-vector ${highlighted ? 'highlighted' : ''} ${className}`}
      style={animStyle}
    >
      {/* Angle arc */}
      {renderAngleArc()}

      {/* Main arrow line */}
      <line
        x1={origin.x}
        y1={origin.y}
        x2={endX}
        y2={endY}
        stroke={color}
        strokeWidth={highlighted ? strokeWidth + 1 : strokeWidth}
        strokeLinecap="round"
        style={animStyle}
      />

      {/* Arrowhead */}
      <polygon
        points={`${endX},${endY} ${arrowPoint1.x},${arrowPoint1.y} ${arrowPoint2.x},${arrowPoint2.y}`}
        fill={color}
        style={animStyle}
      />

      {/* Highlight glow effect */}
      {highlighted && (
        <>
          <line
            x1={origin.x}
            y1={origin.y}
            x2={endX}
            y2={endY}
            stroke={color}
            strokeWidth={strokeWidth + 4}
            strokeLinecap="round"
            opacity={0.3}
            style={animStyle}
          />
          <polygon
            points={`${endX},${endY} ${arrowPoint1.x},${arrowPoint1.y} ${arrowPoint2.x},${arrowPoint2.y}`}
            fill={color}
            opacity={0.3}
            style={{ transform: 'scale(1.2)', transformOrigin: `${endX}px ${endY}px`, ...animStyle }}
          />
        </>
      )}

      {/* Label */}
      {showLabel && (
        <g className="force-label">
          {/* Label background for readability */}
          <rect
            x={labelX - 15}
            y={labelY - 10}
            width={30}
            height={20}
            fill="white"
            opacity={0.8}
            rx={3}
            style={animStyle}
          />
          <text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={14}
            fontWeight={highlighted ? 'bold' : 'normal'}
            fill={color}
            style={animStyle}
          >
            {symbol}
            {subscript && (
              <tspan fontSize={10} dy={3}>
                {subscript}
              </tspan>
            )}
          </text>
        </g>
      )}

      {/* Magnitude value */}
      {showMagnitude && (
        <text
          x={(origin.x + endX) / 2 + 10 * Math.sin(angleRad)}
          y={(origin.y + endY) / 2 + 10 * Math.cos(angleRad)}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={11}
          fill="#666"
          style={animStyle}
        >
          {force.magnitude.toFixed(1)} N
        </text>
      )}

      {/* CSS Keyframes for animations (inline for component isolation) */}
      <style>
        {`
          @keyframes drawForce {
            from {
              stroke-dashoffset: ${length + arrowSize * 2};
            }
            to {
              stroke-dashoffset: 0;
            }
          }

          @keyframes pulseForce {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.7;
              transform: scale(1.05);
            }
          }

          .force-vector.highlighted line,
          .force-vector.highlighted polygon {
            filter: drop-shadow(0 0 3px ${color});
          }
        `}
      </style>
    </g>
  )
}

export default ForceVector
