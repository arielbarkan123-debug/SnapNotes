'use client'

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
  type MouseEvent,
  type TouchEvent,
} from 'react'
import { motion } from 'framer-motion'
import { COLORS, getSubjectColor, getAdaptiveLineWeight } from '@/lib/diagram-theme'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'

// ============================================================================
// Types
// ============================================================================

export type GeometryToolType = 'select' | 'point' | 'line' | 'segment' | 'circle' | 'angle' | 'measure'

export interface GeometryPoint {
  id: string
  x: number
  y: number
  label?: string
  color?: string
}

export interface GeometryLine {
  id: string
  type: 'line' | 'segment' | 'ray'
  start: GeometryPoint
  end: GeometryPoint
  color?: string
  dashed?: boolean
}

export interface GeometryCircle {
  id: string
  center: GeometryPoint
  radius: number
  color?: string
}

export interface GeometryAngle {
  id: string
  vertex: GeometryPoint
  ray1End: GeometryPoint
  ray2End: GeometryPoint
  angle: number // in degrees
  color?: string
}

export interface GeometryMeasurement {
  id: string
  type: 'distance' | 'angle'
  value: number
  unit: string
  position: { x: number; y: number }
}

export interface GeometryState {
  points: GeometryPoint[]
  lines: GeometryLine[]
  circles: GeometryCircle[]
  angles: GeometryAngle[]
  measurements: GeometryMeasurement[]
}

export type GeometryMode = 'view' | 'construct'

export interface GeometryCanvasProps {
  /** Display mode: view (read-only) or construct (interactive) */
  mode?: GeometryMode
  /** Initial geometry state */
  initialState?: Partial<GeometryState>
  /** Currently selected tool */
  tool?: GeometryToolType
  /** Width of the canvas */
  width?: number
  /** Height of the canvas */
  height?: number
  /** Grid size in pixels */
  gridSize?: number
  /** Whether to show the grid */
  showGrid?: boolean
  /** Whether to snap to grid */
  snapToGrid?: boolean
  /** Whether to snap to points */
  snapToPoints?: boolean
  /** Whether to show measurements */
  showMeasurements?: boolean
  /** Subject for color coding */
  subject?: SubjectKey
  /** Complexity level for adaptive styling */
  complexity?: VisualComplexityLevel
  /** Callback when geometry changes */
  onChange?: (state: GeometryState) => void
  /** Callback when a shape is selected */
  onSelect?: (id: string | null) => void
  /** Additional className */
  className?: string
}

export interface GeometryCanvasRef {
  /** Get current geometry state */
  getState: () => GeometryState
  /** Set geometry state */
  setState: (state: Partial<GeometryState>) => void
  /** Clear all geometry */
  clear: () => void
  /** Undo last action */
  undo: () => void
  /** Redo last undone action */
  redo: () => void
  /** Export as SVG */
  exportSVG: () => string
}

// ============================================================================
// Constants
// ============================================================================

const POINT_RADIUS = 6
const SNAP_DISTANCE = 15
const COLORS_PALETTE = [
  COLORS.primary[500],
  '#22c55e',
  '#ef4444',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
]

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
  return `geo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
}

// Helper function for angle measurement (used by AngleTool - future feature)
function _angleBetweenPoints(
  vertex: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y }
  const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y }
  const dot = v1.x * v2.x + v1.y * v2.y
  const cross = v1.x * v2.y - v1.y * v2.x
  const angle = Math.atan2(cross, dot)
  return Math.abs(angle * (180 / Math.PI))
}

function snapToGridValue(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize
}

function findNearestPoint(
  pos: { x: number; y: number },
  points: GeometryPoint[],
  threshold: number
): GeometryPoint | null {
  let nearest: GeometryPoint | null = null
  let minDist = threshold

  for (const point of points) {
    const d = distance(pos, point)
    if (d < minDist) {
      minDist = d
      nearest = point
    }
  }

  return nearest
}

// ============================================================================
// Sub-components
// ============================================================================

function ToolButton({
  tool,
  currentTool,
  onClick,
  icon,
  label,
  disabled,
}: {
  tool: GeometryToolType
  currentTool: GeometryToolType
  onClick: () => void
  icon: React.ReactNode
  label: string
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex h-10 w-10 items-center justify-center rounded-lg transition-all
        ${currentTool === tool
          ? 'bg-primary-500 text-white shadow-md'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
        }
        ${disabled ? 'cursor-not-allowed opacity-50' : ''}
      `}
      title={label}
    >
      {icon}
    </button>
  )
}

// ============================================================================
// Component
// ============================================================================

/**
 * GeometryCanvas - Interactive geometry construction canvas
 *
 * Features:
 * - View mode: Display pre-defined geometry
 * - Construct mode: Draw points, lines, circles, angles
 * - Snap to grid and points
 * - Automatic measurements
 * - Touch support
 *
 * @example
 * // View mode
 * <GeometryCanvas
 *   mode="view"
 *   initialState={{
 *     points: [{ id: '1', x: 100, y: 100, label: 'A' }],
 *     lines: [{ id: '2', type: 'segment', start: pointA, end: pointB }]
 *   }}
 * />
 *
 * @example
 * // Construct mode
 * <GeometryCanvas
 *   mode="construct"
 *   tool="point"
 *   showGrid={true}
 *   snapToGrid={true}
 *   onChange={(state) => console.log(state)}
 * />
 */
export const GeometryCanvas = forwardRef<GeometryCanvasRef, GeometryCanvasProps>(
  function GeometryCanvas(
    {
      mode = 'view',
      initialState = {},
      tool: controlledTool,
      width = 600,
      height = 400,
      gridSize = 20,
      showGrid = true,
      snapToGrid = true,
      snapToPoints = true,
      showMeasurements = true,
      onChange,
      onSelect,
      className = '',
      subject = 'geometry',
      complexity = 'middle_school',
    },
    ref
  ) {
    const subjectColors = useMemo(() => getSubjectColor(subject), [subject])
    const _adaptiveLineWeight = useMemo(() => getAdaptiveLineWeight(complexity), [complexity])
    const svgRef = useRef<SVGSVGElement>(null)
    const [tool, setTool] = useState<GeometryToolType>(controlledTool || 'select')
    const [state, setState] = useState<GeometryState>({
      points: initialState.points || [],
      lines: initialState.lines || [],
      circles: initialState.circles || [],
      angles: initialState.angles || [],
      measurements: initialState.measurements || [],
    })
    const [history, setHistory] = useState<GeometryState[]>([])
    const [historyIndex, setHistoryIndex] = useState(-1)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [tempPoint, setTempPoint] = useState<{ x: number; y: number } | null>(null)
    const [drawingStart, setDrawingStart] = useState<GeometryPoint | null>(null)
    const [colorIndex, setColorIndex] = useState(0)

    // Sync controlled tool
    useEffect(() => {
      if (controlledTool) {
        setTool(controlledTool)
      }
    }, [controlledTool])

    // Get next color
    const getNextColor = useCallback(() => {
      const color = COLORS_PALETTE[colorIndex % COLORS_PALETTE.length]
      setColorIndex((i) => i + 1)
      return color
    }, [colorIndex])

    // Snap position
    const snapPosition = useCallback(
      (pos: { x: number; y: number }) => {
        let snapped = { ...pos }

        // Snap to points first
        if (snapToPoints) {
          const nearest = findNearestPoint(pos, state.points, SNAP_DISTANCE)
          if (nearest) {
            return { x: nearest.x, y: nearest.y }
          }
        }

        // Snap to grid
        if (snapToGrid) {
          snapped = {
            x: snapToGridValue(pos.x, gridSize),
            y: snapToGridValue(pos.y, gridSize),
          }
        }

        return snapped
      },
      [snapToGrid, snapToPoints, gridSize, state.points]
    )

    // Get mouse position from event
    const getMousePosition = useCallback(
      (e: MouseEvent | TouchEvent): { x: number; y: number } => {
        if (!svgRef.current) return { x: 0, y: 0 }

        const svg = svgRef.current
        const rect = svg.getBoundingClientRect()

        let clientX: number, clientY: number
        if ('touches' in e) {
          clientX = e.touches[0].clientX
          clientY = e.touches[0].clientY
        } else {
          clientX = e.clientX
          clientY = e.clientY
        }

        return {
          x: clientX - rect.left,
          y: clientY - rect.top,
        }
      },
      []
    )

    // Add to history
    const addToHistory = useCallback((newState: GeometryState) => {
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), newState])
      setHistoryIndex((i) => i + 1)
    }, [historyIndex])

    // Update state with history
    const updateState = useCallback(
      (updater: (prev: GeometryState) => GeometryState) => {
        setState((prev) => {
          const newState = updater(prev)
          addToHistory(newState)
          onChange?.(newState)
          return newState
        })
      },
      [addToHistory, onChange]
    )

    // Handle canvas click
    const handleCanvasClick = useCallback(
      (e: MouseEvent<SVGSVGElement>) => {
        if (mode === 'view') return

        const pos = snapPosition(getMousePosition(e))

        switch (tool) {
          case 'point': {
            const newPoint: GeometryPoint = {
              id: generateId(),
              x: pos.x,
              y: pos.y,
              label: String.fromCharCode(65 + state.points.length), // A, B, C, ...
              color: getNextColor(),
            }
            updateState((prev) => ({
              ...prev,
              points: [...prev.points, newPoint],
            }))
            break
          }

          case 'line':
          case 'segment': {
            if (!drawingStart) {
              // First click - find or create start point
              const existingPoint = findNearestPoint(pos, state.points, SNAP_DISTANCE)
              if (existingPoint) {
                setDrawingStart(existingPoint)
              } else {
                const newPoint: GeometryPoint = {
                  id: generateId(),
                  x: pos.x,
                  y: pos.y,
                  color: getNextColor(),
                }
                updateState((prev) => ({
                  ...prev,
                  points: [...prev.points, newPoint],
                }))
                setDrawingStart(newPoint)
              }
            } else {
              // Second click - create line
              const existingEnd = findNearestPoint(pos, state.points, SNAP_DISTANCE)
              const endPoint: GeometryPoint = existingEnd || {
                id: generateId(),
                x: pos.x,
                y: pos.y,
                color: drawingStart.color,
              }

              const newLine: GeometryLine = {
                id: generateId(),
                type: tool === 'line' ? 'line' : 'segment',
                start: drawingStart,
                end: endPoint,
                color: drawingStart.color,
              }

              updateState((prev) => ({
                ...prev,
                points: existingEnd ? prev.points : [...prev.points, endPoint],
                lines: [...prev.lines, newLine],
              }))

              setDrawingStart(null)
            }
            break
          }

          case 'circle': {
            if (!drawingStart) {
              // First click - center
              const existingPoint = findNearestPoint(pos, state.points, SNAP_DISTANCE)
              if (existingPoint) {
                setDrawingStart(existingPoint)
              } else {
                const newPoint: GeometryPoint = {
                  id: generateId(),
                  x: pos.x,
                  y: pos.y,
                  color: getNextColor(),
                }
                updateState((prev) => ({
                  ...prev,
                  points: [...prev.points, newPoint],
                }))
                setDrawingStart(newPoint)
              }
            } else {
              // Second click - radius point
              const radius = distance(drawingStart, pos)
              const newCircle: GeometryCircle = {
                id: generateId(),
                center: drawingStart,
                radius,
                color: drawingStart.color,
              }

              updateState((prev) => ({
                ...prev,
                circles: [...prev.circles, newCircle],
              }))

              setDrawingStart(null)
            }
            break
          }

          case 'select': {
            // Find clicked element
            const clickedPoint = findNearestPoint(pos, state.points, POINT_RADIUS + 5)
            if (clickedPoint) {
              setSelectedId(clickedPoint.id)
              onSelect?.(clickedPoint.id)
            } else {
              setSelectedId(null)
              onSelect?.(null)
            }
            break
          }
        }
      },
      [mode, tool, snapPosition, getMousePosition, state.points, drawingStart, getNextColor, updateState, onSelect]
    )

    // Handle mouse move (for preview)
    const handleMouseMove = useCallback(
      (e: MouseEvent<SVGSVGElement>) => {
        if (mode === 'view') return
        const pos = snapPosition(getMousePosition(e))
        setTempPoint(pos)
      },
      [mode, snapPosition, getMousePosition]
    )

    // Handle mouse leave
    const handleMouseLeave = useCallback(() => {
      setTempPoint(null)
    }, [])

    // Undo
    const undo = useCallback(() => {
      if (historyIndex > 0) {
        setHistoryIndex((i) => i - 1)
        setState(history[historyIndex - 1])
      }
    }, [history, historyIndex])

    // Redo
    const redo = useCallback(() => {
      if (historyIndex < history.length - 1) {
        setHistoryIndex((i) => i + 1)
        setState(history[historyIndex + 1])
      }
    }, [history, historyIndex])

    // Clear
    const clear = useCallback(() => {
      const emptyState: GeometryState = {
        points: [],
        lines: [],
        circles: [],
        angles: [],
        measurements: [],
      }
      updateState(() => emptyState)
      setDrawingStart(null)
      setSelectedId(null)
      setColorIndex(0)
    }, [updateState])

    // Export SVG
    const exportSVG = useCallback(() => {
      if (!svgRef.current) return ''
      return svgRef.current.outerHTML
    }, [])

    // Imperative handle
    useImperativeHandle(
      ref,
      () => ({
        getState: () => state,
        setState: (newState) =>
          setState((prev) => ({
            ...prev,
            ...newState,
          })),
        clear,
        undo,
        redo,
        exportSVG,
      }),
      [state, clear, undo, redo, exportSVG]
    )

    return (
      <div className={`relative ${className}`}>
        {/* Toolbar (construct mode only) */}
        {mode === 'construct' && (
          <div className="mb-3 flex items-center gap-2">
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
              <ToolButton
                tool="select"
                currentTool={tool}
                onClick={() => setTool('select')}
                label="Select"
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                }
              />
              <ToolButton
                tool="point"
                currentTool={tool}
                onClick={() => setTool('point')}
                label="Point"
                icon={
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                }
              />
              <ToolButton
                tool="segment"
                currentTool={tool}
                onClick={() => setTool('segment')}
                label="Line Segment"
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <line x1="4" y1="20" x2="20" y2="4" strokeWidth={2} strokeLinecap="round" />
                  </svg>
                }
              />
              <ToolButton
                tool="circle"
                currentTool={tool}
                onClick={() => setTool('circle')}
                label="Circle"
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="8" strokeWidth={2} />
                  </svg>
                }
              />
            </div>

            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

            {/* Undo/Redo */}
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700"
              title="Undo"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700"
              title="Redo"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>
            <button
              onClick={clear}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              title="Clear"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}

        {/* Canvas */}
        <svg
          ref={svgRef}
          width={width}
          height={height}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={`rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 ${
            mode === 'construct' ? 'cursor-crosshair' : ''
          }`}
        >
          {/* Grid */}
          {showGrid && (
            <g className="pointer-events-none">
              <defs>
                <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                  <path
                    d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth={0.5}
                    className="dark:stroke-gray-700"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </g>
          )}

          {/* Circles */}
          {state.circles.map((circle) => (
            <g key={circle.id}>
              <circle
                cx={circle.center.x}
                cy={circle.center.y}
                r={circle.radius}
                fill="none"
                stroke={circle.color || subjectColors.primary}
                strokeWidth={2}
                className={selectedId === circle.id ? 'stroke-primary-600' : ''}
              />
            </g>
          ))}

          {/* Lines */}
          {state.lines.map((line) => (
            <g key={line.id}>
              <line
                x1={line.start.x}
                y1={line.start.y}
                x2={line.end.x}
                y2={line.end.y}
                stroke={line.color || subjectColors.primary}
                strokeWidth={2}
                strokeDasharray={line.dashed ? '5,5' : undefined}
                className={selectedId === line.id ? 'stroke-primary-600' : ''}
              />
              {/* Distance label */}
              {showMeasurements && (
                <text
                  x={(line.start.x + line.end.x) / 2}
                  y={(line.start.y + line.end.y) / 2 - 10}
                  textAnchor="middle"
                  className="fill-gray-500 text-xs dark:fill-gray-400"
                >
                  {distance(line.start, line.end).toFixed(1)}
                </text>
              )}
            </g>
          ))}

          {/* Preview line while drawing */}
          {drawingStart && tempPoint && (tool === 'line' || tool === 'segment') && (
            <line
              x1={drawingStart.x}
              y1={drawingStart.y}
              x2={tempPoint.x}
              y2={tempPoint.y}
              stroke={drawingStart.color}
              strokeWidth={2}
              strokeDasharray="5,5"
              opacity={0.5}
            />
          )}

          {/* Preview circle while drawing */}
          {drawingStart && tempPoint && tool === 'circle' && (
            <circle
              cx={drawingStart.x}
              cy={drawingStart.y}
              r={distance(drawingStart, tempPoint)}
              fill="none"
              stroke={drawingStart.color}
              strokeWidth={2}
              strokeDasharray="5,5"
              opacity={0.5}
            />
          )}

          {/* Points */}
          {state.points.map((point) => (
            <g key={point.id}>
              <circle
                cx={point.x}
                cy={point.y}
                r={POINT_RADIUS}
                fill={point.color || subjectColors.primary}
                stroke="white"
                strokeWidth={2}
                className={`${selectedId === point.id ? 'stroke-primary-600 stroke-[3]' : ''} ${
                  mode === 'construct' ? 'cursor-pointer hover:stroke-primary-400' : ''
                }`}
              />
              {point.label && (
                <text
                  x={point.x + 12}
                  y={point.y - 8}
                  className="fill-gray-700 text-sm font-medium dark:fill-gray-300"
                >
                  {point.label}
                </text>
              )}
            </g>
          ))}

          {/* Preview point while moving */}
          {mode === 'construct' && tempPoint && tool === 'point' && (
            <circle
              cx={tempPoint.x}
              cy={tempPoint.y}
              r={POINT_RADIUS}
              fill={COLORS_PALETTE[colorIndex % COLORS_PALETTE.length]}
              opacity={0.5}
            />
          )}
        </svg>

        {/* Instructions */}
        {mode === 'construct' && drawingStart && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400"
          >
            {tool === 'circle'
              ? 'Click to set the radius'
              : 'Click to set the end point'}
          </motion.div>
        )}
      </div>
    )
  }
)

export default GeometryCanvas
