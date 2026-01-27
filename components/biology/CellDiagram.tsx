'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  type CellDiagramData,
  type Organelle,
  type OrganelleType,
  type CellType,
  ORGANELLE_COLORS,
  CELL_COLORS,
} from '@/types/biology'
import {
  COLORS,
  SHADOWS,
  hexToRgba,
} from '@/lib/diagram-theme'
import { prefersReducedMotion } from '@/lib/diagram-animations'

interface CellDiagramProps {
  data: CellDiagramData
  /** Current step to display (0 = outline, 1+ = progressive organelle reveal) */
  currentStep?: number
  /** Callback when step animation completes */
  onStepComplete?: () => void
  /** Animation duration in ms */
  animationDuration?: number
  /** Width of the SVG */
  width?: number
  /** Height of the SVG */
  height?: number
  /** Additional className */
  className?: string
  /** Language for labels */
  language?: 'en' | 'he'
}

// Props destructured but some intentionally unused for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars

/**
 * CellDiagram - Visualizes cell structure with organelles
 *
 * Features:
 * - Plant vs Animal cell support
 * - Step-by-step organelle reveal
 * - Interactive labels with function descriptions
 * - Educational color coding
 * - Accessibility: respects prefers-reduced-motion
 */
export function CellDiagram({
  data,
  currentStep = 0,
  onStepComplete: _onStepComplete,
  animationDuration: _animationDuration = 500,
  width = 450,
  height = 400,
  className = '',
  language = 'en',
}: CellDiagramProps) {
  const {
    cellType,
    organelles,
    steps,
    showLabels = true,
    showFunctions = false,
    title,
  } = data

  const reducedMotion = prefersReducedMotion()
  const [hoveredOrganelle, setHoveredOrganelle] = useState<OrganelleType | null>(null)

  // Calculate center and dimensions
  const centerX = width / 2
  const centerY = height / 2
  const cellRadius = Math.min(width, height) / 2 - 50

  // Get cell colors based on type
  const cellColors = CELL_COLORS[cellType]

  // Determine which organelles are visible based on step
  const visibleOrganelles = useMemo(() => {
    if (steps && steps.length > 0) {
      const currentStepConfig = steps[Math.min(currentStep, steps.length - 1)]
      if (currentStepConfig.type === 'outline') return []
      if (currentStepConfig.type === 'organelle' && currentStepConfig.organelleType) {
        // Show organelles up to and including this one
        const targetIndex = organelles.findIndex(o => o.type === currentStepConfig.organelleType)
        return organelles.slice(0, targetIndex + 1)
      }
      if (['label', 'function', 'complete'].includes(currentStepConfig.type)) {
        return organelles
      }
      return organelles.slice(0, currentStep)
    }
    // Default: show organelles progressively (step 0 = outline only)
    return organelles.slice(0, Math.max(0, currentStep))
  }, [currentStep, steps, organelles])

  // Get organelle display name
  const getOrganelleName = (type: OrganelleType): string => {
    const names: Record<string, Record<OrganelleType, string>> = {
      en: {
        nucleus: 'Nucleus',
        cell_membrane: 'Cell Membrane',
        cell_wall: 'Cell Wall',
        cytoplasm: 'Cytoplasm',
        mitochondria: 'Mitochondria',
        ribosome: 'Ribosome',
        endoplasmic_reticulum_rough: 'Rough ER',
        endoplasmic_reticulum_smooth: 'Smooth ER',
        golgi_apparatus: 'Golgi Apparatus',
        lysosome: 'Lysosome',
        vacuole: 'Vacuole',
        chloroplast: 'Chloroplast',
        centriole: 'Centriole',
        nuclear_membrane: 'Nuclear Membrane',
        nucleolus: 'Nucleolus',
        chromatin: 'Chromatin',
        cytoskeleton: 'Cytoskeleton',
        peroxisome: 'Peroxisome',
        flagellum: 'Flagellum',
        cilia: 'Cilia',
      },
      he: {
        nucleus: 'גרעין',
        cell_membrane: 'קרום התא',
        cell_wall: 'דופן התא',
        cytoplasm: 'ציטופלזמה',
        mitochondria: 'מיטוכונדריה',
        ribosome: 'ריבוזום',
        endoplasmic_reticulum_rough: 'רשתית אנדופלזמית מחוספסת',
        endoplasmic_reticulum_smooth: 'רשתית אנדופלזמית חלקה',
        golgi_apparatus: 'גולג\'י',
        lysosome: 'ליזוזום',
        vacuole: 'ווקואולה',
        chloroplast: 'כלורופלסט',
        centriole: 'צנטריול',
        nuclear_membrane: 'קרום הגרעין',
        nucleolus: 'גרעינון',
        chromatin: 'כרומטין',
        cytoskeleton: 'שלד התא',
        peroxisome: 'פרוקסיזום',
        flagellum: 'שוטון',
        cilia: 'ריסים',
      },
    }
    return names[language]?.[type] || type
  }

  // Transform position (0-1 normalized) to SVG coordinates
  const transformPosition = (pos: { x: number; y: number }) => ({
    x: centerX + (pos.x - 0.5) * cellRadius * 1.8,
    y: centerY + (pos.y - 0.5) * cellRadius * 1.8,
  })

  // Render cell outline (membrane and optionally wall)
  const renderCellOutline = () => {
    const isPlant = cellType === 'plant'
    const wallThickness = 8

    return (
      <motion.g
        className="cell-outline"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 20,
          duration: reducedMotion ? 0 : 0.6,
        }}
      >
        {/* Cell wall (plant cells only) */}
        {isPlant && (
          <rect
            x={centerX - cellRadius - wallThickness}
            y={centerY - cellRadius - wallThickness}
            width={(cellRadius + wallThickness) * 2}
            height={(cellRadius + wallThickness) * 2}
            rx={20}
            fill="none"
            stroke={ORGANELLE_COLORS.cell_wall}
            strokeWidth={wallThickness}
            opacity={0.8}
          />
        )}

        {/* Cell membrane */}
        {isPlant ? (
          <rect
            x={centerX - cellRadius}
            y={centerY - cellRadius}
            width={cellRadius * 2}
            height={cellRadius * 2}
            rx={15}
            fill={hexToRgba(cellColors.cytoplasm, 0.5)}
            stroke={cellColors.membrane}
            strokeWidth={3}
          />
        ) : (
          <ellipse
            cx={centerX}
            cy={centerY}
            rx={cellRadius}
            ry={cellRadius * 0.85}
            fill={hexToRgba(cellColors.cytoplasm, 0.5)}
            stroke={cellColors.membrane}
            strokeWidth={3}
          />
        )}
      </motion.g>
    )
  }

  // Render a single organelle
  const renderOrganelle = (organelle: Organelle, index: number) => {
    const pos = transformPosition(organelle.position)
    const color = organelle.color || ORGANELLE_COLORS[organelle.type]
    const size = (organelle.size || 0.1) * cellRadius * 2
    const baseDelay = index * 0.15
    const isHovered = hoveredOrganelle === organelle.type
    const isVisible = visibleOrganelles.includes(organelle)

    // Different shapes for different organelles
    const renderOrganelleShape = () => {
      switch (organelle.type) {
        case 'nucleus':
          return (
            <g>
              {/* Nuclear membrane */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={size}
                fill={hexToRgba(color, 0.3)}
                stroke={color}
                strokeWidth={2}
                strokeDasharray="5 3"
              />
              {/* Inner nucleus */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={size * 0.85}
                fill={hexToRgba(color, 0.5)}
              />
            </g>
          )

        case 'nucleolus':
          return (
            <circle
              cx={pos.x}
              cy={pos.y}
              r={size}
              fill={color}
            />
          )

        case 'mitochondria':
          return (
            <g>
              <ellipse
                cx={pos.x}
                cy={pos.y}
                rx={size}
                ry={size * 0.5}
                fill={hexToRgba(color, 0.6)}
                stroke={color}
                strokeWidth={2}
              />
              {/* Inner membrane folds (cristae) */}
              {[0.3, 0.5, 0.7].map((offset, i) => (
                <path
                  key={i}
                  d={`M ${pos.x - size * 0.7} ${pos.y} Q ${pos.x - size * offset} ${pos.y - size * 0.3} ${pos.x - size * (offset - 0.2)} ${pos.y}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                />
              ))}
            </g>
          )

        case 'chloroplast':
          return (
            <g>
              <ellipse
                cx={pos.x}
                cy={pos.y}
                rx={size}
                ry={size * 0.5}
                fill={hexToRgba(color, 0.6)}
                stroke={color}
                strokeWidth={2}
              />
              {/* Thylakoid stacks (grana) */}
              {[-0.4, 0, 0.4].map((offset, i) => (
                <ellipse
                  key={i}
                  cx={pos.x + size * offset}
                  cy={pos.y}
                  rx={size * 0.15}
                  ry={size * 0.3}
                  fill={hexToRgba('#166534', 0.7)}
                />
              ))}
            </g>
          )

        case 'vacuole':
          return (
            <ellipse
              cx={pos.x}
              cy={pos.y}
              rx={size}
              ry={size * 0.9}
              fill={hexToRgba(color, 0.4)}
              stroke={color}
              strokeWidth={2}
            />
          )

        case 'golgi_apparatus':
          return (
            <g>
              {[0, 1, 2, 3].map((i) => (
                <ellipse
                  key={i}
                  cx={pos.x}
                  cy={pos.y + (i - 1.5) * (size * 0.25)}
                  rx={size * (1 - i * 0.1)}
                  ry={size * 0.12}
                  fill={hexToRgba(color, 0.7 - i * 0.1)}
                  stroke={color}
                  strokeWidth={1}
                />
              ))}
            </g>
          )

        case 'endoplasmic_reticulum_rough':
        case 'endoplasmic_reticulum_smooth':
          const isRough = organelle.type === 'endoplasmic_reticulum_rough'
          return (
            <g>
              {/* Wavy membrane structure */}
              <path
                d={`M ${pos.x - size} ${pos.y}
                   Q ${pos.x - size * 0.5} ${pos.y - size * 0.3} ${pos.x} ${pos.y}
                   Q ${pos.x + size * 0.5} ${pos.y + size * 0.3} ${pos.x + size} ${pos.y}`}
                fill="none"
                stroke={color}
                strokeWidth={isRough ? 6 : 4}
                strokeLinecap="round"
              />
              {/* Ribosomes on rough ER */}
              {isRough && (
                <>
                  {[-0.6, -0.2, 0.2, 0.6].map((offset, i) => (
                    <circle
                      key={i}
                      cx={pos.x + size * offset}
                      cy={pos.y - (i % 2 === 0 ? 1 : -1) * size * 0.2}
                      r={2}
                      fill={ORGANELLE_COLORS.ribosome}
                    />
                  ))}
                </>
              )}
            </g>
          )

        case 'ribosome':
          return (
            <circle
              cx={pos.x}
              cy={pos.y}
              r={size}
              fill={color}
            />
          )

        case 'lysosome':
        case 'peroxisome':
          return (
            <circle
              cx={pos.x}
              cy={pos.y}
              r={size}
              fill={hexToRgba(color, 0.7)}
              stroke={color}
              strokeWidth={2}
            />
          )

        case 'centriole':
          return (
            <g>
              {/* Two perpendicular cylinders */}
              <rect
                x={pos.x - size * 0.6}
                y={pos.y - size * 0.15}
                width={size * 1.2}
                height={size * 0.3}
                rx={2}
                fill={color}
              />
              <rect
                x={pos.x - size * 0.15}
                y={pos.y - size * 0.6}
                width={size * 0.3}
                height={size * 1.2}
                rx={2}
                fill={hexToRgba(color, 0.8)}
              />
            </g>
          )

        default:
          // Generic circular organelle
          return (
            <circle
              cx={pos.x}
              cy={pos.y}
              r={size}
              fill={hexToRgba(color, 0.6)}
              stroke={color}
              strokeWidth={2}
            />
          )
      }
    }

    return (
      <AnimatePresence key={organelle.type}>
        {isVisible && (
          <motion.g
            className={`organelle ${organelle.type}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: isHovered ? 1.1 : 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
              delay: reducedMotion ? 0 : baseDelay,
            }}
            onMouseEnter={() => setHoveredOrganelle(organelle.type)}
            onMouseLeave={() => setHoveredOrganelle(null)}
            style={{ cursor: 'pointer' }}
          >
            {/* Organelle shape */}
            {renderOrganelleShape()}

            {/* Label */}
            {showLabels && (
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reducedMotion ? 0 : baseDelay + 0.2 }}
              >
                {/* Label background */}
                <rect
                  x={pos.x + size + 5}
                  y={pos.y - 8}
                  width={getOrganelleName(organelle.type).length * 6 + 10}
                  height={16}
                  rx={3}
                  fill="white"
                  stroke={COLORS.gray[200]}
                  strokeWidth={1}
                  opacity={0.9}
                />
                {/* Label text */}
                <text
                  x={pos.x + size + 10}
                  y={pos.y + 3}
                  fontSize={10}
                  fontFamily="'Inter', system-ui, sans-serif"
                  fontWeight={500}
                  fill={COLORS.gray[700]}
                >
                  {getOrganelleName(organelle.type)}
                </text>
              </motion.g>
            )}

            {/* Function tooltip on hover */}
            {showFunctions && isHovered && organelle.function && (
              <motion.g
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <rect
                  x={pos.x - 80}
                  y={pos.y + size + 10}
                  width={160}
                  height={40}
                  rx={6}
                  fill="white"
                  stroke={color}
                  strokeWidth={1}
                  style={{ filter: SHADOWS.card }}
                />
                <text
                  x={pos.x}
                  y={pos.y + size + 35}
                  textAnchor="middle"
                  fontSize={10}
                  fontFamily="'Inter', system-ui, sans-serif"
                  fill={COLORS.gray[600]}
                >
                  {language === 'he' ? organelle.functionHe || organelle.function : organelle.function}
                </text>
              </motion.g>
            )}
          </motion.g>
        )}
      </AnimatePresence>
    )
  }

  // Render step info
  const renderStepInfo = () => {
    const currentStepConfig = steps?.[Math.min(currentStep, (steps?.length || 1) - 1)]
    const label = currentStepConfig
      ? (language === 'he' ? currentStepConfig.descriptionHe : currentStepConfig.description)
      : null

    if (!label) return null

    return (
      <motion.g
        className="step-info"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reducedMotion ? 0 : 0.3, duration: 0.3 }}
      >
        <rect
          x={width - 200}
          y={height - 50}
          width={190}
          height={40}
          fill="white"
          stroke={COLORS.gray[200]}
          strokeWidth={1}
          rx={6}
          style={{ filter: SHADOWS.soft }}
        />
        <text
          x={width - 105}
          y={height - 26}
          textAnchor="middle"
          fontSize={11}
          fill={COLORS.gray[600]}
          fontFamily="'Inter', system-ui, sans-serif"
        >
          {label}
        </text>
      </motion.g>
    )
  }

  // Cell type label
  const getCellTypeName = (): string => {
    const names: Record<string, Record<CellType, string>> = {
      en: {
        animal: 'Animal Cell',
        plant: 'Plant Cell',
        bacteria: 'Bacteria',
        virus: 'Virus',
      },
      he: {
        animal: 'תא בעלי חיים',
        plant: 'תא צמחי',
        bacteria: 'חיידק',
        virus: 'וירוס',
      },
    }
    return names[language]?.[cellType] || cellType
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`cell-diagram ${className}`}
      style={{ borderRadius: '12px', overflow: 'hidden' }}
      role="img"
      aria-label={`${getCellTypeName()} diagram showing ${organelles.length} organelles`}
    >
      {/* Definitions */}
      <defs>
        <linearGradient id="cell-bg-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor={COLORS.gray[50]} />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width={width} height={height} fill="url(#cell-bg-gradient)" rx={12} />

      {/* Title */}
      {title && (
        <motion.text
          x={width / 2}
          y={25}
          textAnchor="middle"
          fontSize={16}
          fontWeight="600"
          fontFamily="'Inter', system-ui, sans-serif"
          fill={COLORS.gray[800]}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {title}
        </motion.text>
      )}

      {/* Cell outline (always visible) */}
      {renderCellOutline()}

      {/* Organelles */}
      {organelles.map((organelle, index) => renderOrganelle(organelle, index))}

      {/* Cell type label */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <rect
          x={10}
          y={height - 40}
          width={100}
          height={30}
          fill="white"
          stroke={cellColors.membrane}
          strokeWidth={1.5}
          rx={6}
        />
        <text
          x={60}
          y={height - 20}
          textAnchor="middle"
          fontSize={12}
          fontWeight="600"
          fontFamily="'Inter', system-ui, sans-serif"
          fill={COLORS.gray[700]}
        >
          {getCellTypeName()}
        </text>
      </motion.g>

      {/* Step info */}
      {renderStepInfo()}

      {/* Step counter */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <rect
          x={width - 75}
          y={8}
          width={65}
          height={22}
          fill="white"
          stroke={COLORS.gray[200]}
          strokeWidth={1}
          rx={4}
        />
        <text
          x={width - 42}
          y={21}
          textAnchor="middle"
          fontSize={11}
          fontFamily="'Inter', system-ui, sans-serif"
          fontWeight={500}
          fill={COLORS.gray[500]}
        >
          {language === 'he' ? `שלב ${currentStep + 1}` : `Step ${currentStep + 1}`}
        </text>
      </motion.g>
    </svg>
  )
}

export default CellDiagram
