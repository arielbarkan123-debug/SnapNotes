'use client'

import { useMemo, Component, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  type MoleculeDiagramData,
  type MoleculeAtom,
  type ChemicalBond,
  type BondAngle,
  ATOM_COLORS,
  BOND_COLORS,
  CHARGE_COLORS,
  getVSEPRInfo,
  getGeometryDisplayName,
} from '@/types/chemistry'

// Error Boundary for graceful fallback
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class MoleculeDiagramErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg p-4">
          <p className="text-gray-500 text-center">
            Unable to render molecule diagram. Please try again.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
import {
  COLORS,
  SHADOWS,
  hexToRgba,
} from '@/lib/diagram-theme'
import { prefersReducedMotion } from '@/lib/diagram-animations'

interface MoleculeDiagramProps {
  data: MoleculeDiagramData
  /** Current step to display */
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

/**
 * MoleculeDiagram - Visualizes 2D molecular structure
 *
 * Features:
 * - Animated atom and bond reveal
 * - Single, double, and triple bond visualization
 * - Partial charge indicators for polar molecules
 * - Lone pair visualization
 * - Step-synced for educational progression
 */
function MoleculeDiagram({
  data,
  currentStep = 0,
  onStepComplete: _onStepComplete,
  animationDuration: _animationDuration = 500,
  width = 400,
  height = 350,
  className = '',
  language = 'en',
}: MoleculeDiagramProps) {
  // Data validation - ensure we have required fields
  const safeData = useMemo(() => {
    return {
      name: data?.name || 'Unknown',
      formula: data?.formula || '?',
      atoms: Array.isArray(data?.atoms) && data.atoms.length > 0
        ? data.atoms
        : [{ symbol: '?', position: { x: 0, y: 0 } }],
      bonds: Array.isArray(data?.bonds) ? data.bonds : [],
      steps: data?.steps,
      showAngles: data?.showAngles ?? false,
      bondAngles: Array.isArray(data?.bondAngles) ? data.bondAngles : [],
      showPartialCharges: data?.showPartialCharges ?? false,
      showLonePairs: data?.showLonePairs ?? false,
      geometry: data?.geometry,
      showGeometryLabel: data?.showGeometryLabel ?? true,
      showExplanations: data?.showExplanations ?? true,
      title: data?.title,
    }
  }, [data])

  const {
    name,
    formula,
    atoms,
    bonds,
    steps,
    showAngles,
    bondAngles,
    showPartialCharges,
    showLonePairs,
    geometry,
    showGeometryLabel,
    showExplanations,
    title,
  } = safeData

  // Get VSEPR info for geometry explanations (with try/catch)
  const vsEPRInfo = useMemo(() => {
    try {
      return geometry ? getVSEPRInfo(geometry, language) : null
    } catch {
      return null
    }
  }, [geometry, language])

  const geometryDisplayName = useMemo(() => {
    try {
      return geometry ? getGeometryDisplayName(geometry, language) : null
    } catch {
      return null
    }
  }, [geometry, language])

  const reducedMotion = prefersReducedMotion()

  // Calculate center and scale
  const centerX = width / 2
  const centerY = height / 2

  // Calculate bounds of molecule for proper scaling
  const bounds = useMemo(() => {
    if (atoms.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 }

    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity

    atoms.forEach(atom => {
      minX = Math.min(minX, atom.position.x)
      maxX = Math.max(maxX, atom.position.x)
      minY = Math.min(minY, atom.position.y)
      maxY = Math.max(maxY, atom.position.y)
    })

    return { minX, maxX, minY, maxY }
  }, [atoms])

  // Scale factor to fit molecule in view
  const scale = useMemo(() => {
    const xRange = bounds.maxX - bounds.minX
    const yRange = bounds.maxY - bounds.minY
    const maxRange = Math.max(xRange, yRange, 0.1)
    const availableSpace = Math.min(width, height) - 120
    return availableSpace / (maxRange * 2)
  }, [bounds, width, height])

  // Transform atom position to SVG coordinates
  const transformPosition = (pos: { x: number; y: number }) => ({
    x: centerX + pos.x * scale,
    y: centerY + pos.y * scale,
  })

  // Determine which atoms and bonds are visible based on step
  const visibleAtoms = useMemo(() => {
    if (steps && steps.length > 0) {
      const currentStepConfig = steps[Math.min(currentStep, steps.length - 1)]
      if (currentStepConfig.type === 'setup') return []
      if (currentStepConfig.type === 'add_atom' && currentStepConfig.atomIndex !== undefined) {
        // Show atoms up to and including this one
        return atoms.slice(0, currentStepConfig.atomIndex + 1)
      }
      if (['add_bond', 'show_charges', 'show_lone_pairs', 'label', 'complete'].includes(currentStepConfig.type)) {
        return atoms
      }
      return atoms.slice(0, currentStep + 1)
    }
    // Default: show all atoms after step 0
    return currentStep > 0 ? atoms : []
  }, [currentStep, steps, atoms])

  const visibleBonds = useMemo(() => {
    if (steps && steps.length > 0) {
      const currentStepConfig = steps[Math.min(currentStep, steps.length - 1)]
      if (['setup', 'add_atom'].includes(currentStepConfig.type)) return []
      if (currentStepConfig.type === 'add_bond' && currentStepConfig.bondIndex !== undefined) {
        return bonds.slice(0, currentStepConfig.bondIndex + 1)
      }
      if (['show_charges', 'show_lone_pairs', 'label', 'complete'].includes(currentStepConfig.type)) {
        return bonds
      }
      return bonds.slice(0, Math.max(0, currentStep - atoms.length))
    }
    // Default: show bonds after all atoms are shown
    return currentStep > atoms.length ? bonds : []
  }, [currentStep, steps, atoms.length, bonds])

  // Determine if we should show charges and lone pairs
  const shouldShowCharges = useMemo(() => {
    if (!showPartialCharges) return false
    if (steps) {
      const currentStepConfig = steps[Math.min(currentStep, steps.length - 1)]
      return ['show_charges', 'label', 'complete'].includes(currentStepConfig.type)
    }
    return currentStep >= atoms.length + bonds.length + 1
  }, [showPartialCharges, steps, currentStep, atoms.length, bonds.length])

  const shouldShowLonePairs = useMemo(() => {
    if (!showLonePairs) return false
    if (steps) {
      const currentStepConfig = steps[Math.min(currentStep, steps.length - 1)]
      return ['show_lone_pairs', 'label', 'complete'].includes(currentStepConfig.type)
    }
    return currentStep >= atoms.length + bonds.length + 2
  }, [showLonePairs, steps, currentStep, atoms.length, bonds.length])

  // Get atom color
  const getAtomColor = (symbol: string): string => {
    return ATOM_COLORS[symbol] || ATOM_COLORS.default
  }

  // Get atom radius based on element
  const getAtomRadius = (symbol: string): number => {
    const radiusMap: Record<string, number> = {
      H: 14,
      C: 18,
      N: 17,
      O: 16,
      S: 20,
      P: 19,
      Cl: 18,
      default: 18,
    }
    return radiusMap[symbol] || radiusMap.default
  }

  // Render a single atom
  const renderAtom = (atom: MoleculeAtom, index: number) => {
    const pos = transformPosition(atom.position)
    const color = atom.color || getAtomColor(atom.symbol)
    const radius = getAtomRadius(atom.symbol)
    const baseDelay = index * 0.15

    // Check if this is a light-colored atom (needs dark text)
    const isDark = ['C', 'N', 'O', 'S', 'P', 'Cl', 'Br', 'I', 'Fe'].includes(atom.symbol)

    return (
      <motion.g
        key={`atom-${index}`}
        className="molecule-atom"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 20,
          delay: reducedMotion ? 0 : baseDelay,
        }}
      >
        {/* Atom glow */}
        <circle
          cx={pos.x}
          cy={pos.y}
          r={radius + 4}
          fill={hexToRgba(color, 0.2)}
        />

        {/* Main atom circle */}
        <circle
          cx={pos.x}
          cy={pos.y}
          r={radius}
          fill={color}
          stroke={hexToRgba(color, 0.8)}
          strokeWidth={1.5}
        />

        {/* Atom symbol */}
        <text
          x={pos.x}
          y={pos.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={12}
          fontWeight="700"
          fontFamily="'Inter', system-ui, sans-serif"
          fill={isDark ? 'white' : COLORS.gray[800]}
        >
          {atom.label || atom.symbol}
        </text>

        {/* Formal charge indicator */}
        {atom.formalCharge !== undefined && atom.formalCharge !== 0 && (
          <motion.g
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: reducedMotion ? 0 : baseDelay + 0.2 }}
          >
            <circle
              cx={pos.x + radius - 2}
              cy={pos.y - radius + 2}
              r={8}
              fill="white"
              stroke={atom.formalCharge > 0 ? CHARGE_COLORS.positive : CHARGE_COLORS.negative}
              strokeWidth={1.5}
            />
            <text
              x={pos.x + radius - 2}
              y={pos.y - radius + 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={10}
              fontWeight="700"
              fill={atom.formalCharge > 0 ? CHARGE_COLORS.positive : CHARGE_COLORS.negative}
            >
              {atom.formalCharge > 0 ? `${atom.formalCharge}+` : `${Math.abs(atom.formalCharge)}-`}
            </text>
          </motion.g>
        )}

        {/* Lone pairs */}
        {shouldShowLonePairs && atom.lonePairs && atom.lonePairs > 0 && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reducedMotion ? 0 : 0.3 }}
          >
            {Array.from({ length: atom.lonePairs }).map((_, lpIndex) => {
              // Position lone pairs around the atom
              const lpAngle = (Math.PI / 2) + (lpIndex * Math.PI / atom.lonePairs!) - (Math.PI / 4)
              const lpDistance = radius + 10
              const lpX = pos.x + Math.cos(lpAngle) * lpDistance
              const lpY = pos.y - Math.sin(lpAngle) * lpDistance

              return (
                <g key={`lp-${lpIndex}`}>
                  <circle cx={lpX - 3} cy={lpY} r={2} fill={COLORS.gray[500]} />
                  <circle cx={lpX + 3} cy={lpY} r={2} fill={COLORS.gray[500]} />
                </g>
              )
            })}
          </motion.g>
        )}
      </motion.g>
    )
  }

  // Render a bond between two atoms
  const renderBond = (bond: ChemicalBond, index: number) => {
    const atom1 = atoms[bond.atom1]
    const atom2 = atoms[bond.atom2]
    if (!atom1 || !atom2) return null

    const pos1 = transformPosition(atom1.position)
    const pos2 = transformPosition(atom2.position)
    const bondColor = BOND_COLORS[bond.type]
    const baseDelay = (atoms.length + index) * 0.1

    // Calculate angle and offsets for multiple bonds
    const dx = pos2.x - pos1.x
    const dy = pos2.y - pos1.y
    const angle = Math.atan2(dy, dx)
    const perpX = Math.cos(angle + Math.PI / 2)
    const perpY = Math.sin(angle + Math.PI / 2)

    // Shorten bonds to not overlap with atoms
    const r1 = getAtomRadius(atom1.symbol)
    const r2 = getAtomRadius(atom2.symbol)
    const length = Math.sqrt(dx * dx + dy * dy)
    const startOffset = r1 / length
    const endOffset = r2 / length

    const startX = pos1.x + dx * startOffset
    const startY = pos1.y + dy * startOffset
    const endX = pos2.x - dx * endOffset
    const endY = pos2.y - dy * endOffset

    // Get number of lines for bond type
    const bondLines = bond.type === 'triple' ? 3 : bond.type === 'double' ? 2 : 1
    const bondSpacing = 4

    return (
      <motion.g
        key={`bond-${index}`}
        className="molecule-bond"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reducedMotion ? 0 : baseDelay }}
      >
        {Array.from({ length: bondLines }).map((_, lineIndex) => {
          const offset = (lineIndex - (bondLines - 1) / 2) * bondSpacing
          const x1 = startX + perpX * offset
          const y1 = startY + perpY * offset
          const x2 = endX + perpX * offset
          const y2 = endY + perpY * offset

          return (
            <motion.line
              key={`bond-line-${lineIndex}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={bondColor}
              strokeWidth={bond.type === 'ionic' ? 3 : 2.5}
              strokeLinecap="round"
              strokeDasharray={bond.type === 'ionic' ? '6 4' : bond.type === 'hydrogen' ? '3 3' : 'none'}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: reducedMotion ? 0 : 0.4,
                delay: reducedMotion ? 0 : baseDelay + lineIndex * 0.1,
                ease: 'easeOut',
              }}
            />
          )
        })}

        {/* Partial charge indicators for polar bonds */}
        {shouldShowCharges && bond.polarity && bond.polarity.showCharges && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reducedMotion ? 0 : baseDelay + 0.3 }}
          >
            {/* Delta minus on more electronegative atom */}
            <text
              x={bond.polarity.negativeAtom === bond.atom1 ? startX - 15 : endX + 15}
              y={bond.polarity.negativeAtom === bond.atom1 ? startY : endY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={11}
              fontFamily="'Inter', system-ui, sans-serif"
              fill={CHARGE_COLORS.partialNegative}
              fontWeight="600"
            >
              δ−
            </text>
            {/* Delta plus on less electronegative atom */}
            <text
              x={bond.polarity.negativeAtom === bond.atom1 ? endX + 15 : startX - 15}
              y={bond.polarity.negativeAtom === bond.atom1 ? endY : startY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={11}
              fontFamily="'Inter', system-ui, sans-serif"
              fill={CHARGE_COLORS.partialPositive}
              fontWeight="600"
            >
              δ+
            </text>
          </motion.g>
        )}
      </motion.g>
    )
  }

  // Render molecule info card
  const renderMoleculeInfo = () => (
    <motion.g
      className="molecule-info"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reducedMotion ? 0 : 0.2, duration: 0.3 }}
    >
      <rect
        x={10}
        y={height - 60}
        width={120}
        height={50}
        fill="white"
        stroke={COLORS.gray[200]}
        strokeWidth={1}
        rx={8}
        style={{ filter: SHADOWS.soft }}
      />

      <text
        x={70}
        y={height - 40}
        textAnchor="middle"
        fontSize={14}
        fontWeight="600"
        fontFamily="'Inter', system-ui, sans-serif"
        fill={COLORS.gray[800]}
      >
        {name}
      </text>

      <text
        x={70}
        y={height - 22}
        textAnchor="middle"
        fontSize={12}
        fontFamily="'JetBrains Mono', monospace"
        fill={COLORS.primary[600]}
      >
        {formula}
      </text>
    </motion.g>
  )

  // Render bond angle arc with label
  const renderBondAngle = (angle: BondAngle, index: number) => {
    const centerAtom = atoms[angle.centerAtom]
    const atom1 = atoms[angle.atom1]
    const atom2 = atoms[angle.atom2]
    if (!centerAtom || !atom1 || !atom2) return null

    const centerPos = transformPosition(centerAtom.position)
    const pos1 = transformPosition(atom1.position)
    const pos2 = transformPosition(atom2.position)

    // Calculate vectors from center to outer atoms
    const dx1 = pos1.x - centerPos.x
    const dy1 = pos1.y - centerPos.y
    const dx2 = pos2.x - centerPos.x
    const dy2 = pos2.y - centerPos.y

    // Normalize vectors
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
    const nx1 = dx1 / len1, ny1 = dy1 / len1
    const nx2 = dx2 / len2, ny2 = dy2 / len2

    // Arc parameters
    const arcRadius = 25
    const startAngle = Math.atan2(ny1, nx1)
    const endAngle = Math.atan2(ny2, nx2)

    // Calculate arc path
    const startX = centerPos.x + arcRadius * Math.cos(startAngle)
    const startY = centerPos.y + arcRadius * Math.sin(startAngle)
    const endX = centerPos.x + arcRadius * Math.cos(endAngle)
    const endY = centerPos.y + arcRadius * Math.sin(endAngle)

    // Determine if we should use the large arc flag
    let angleDiff = endAngle - startAngle
    if (angleDiff < 0) angleDiff += 2 * Math.PI
    const largeArcFlag = angleDiff > Math.PI ? 1 : 0

    // Label position (midpoint of arc)
    const midAngle = startAngle + angleDiff / 2
    const labelRadius = arcRadius + 15
    const labelX = centerPos.x + labelRadius * Math.cos(midAngle)
    const labelY = centerPos.y + labelRadius * Math.sin(midAngle)

    const baseDelay = (atoms.length + bonds.length + index) * 0.1

    return (
      <motion.g
        key={`angle-${index}`}
        className="bond-angle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reducedMotion ? 0 : baseDelay }}
      >
        {/* Arc path */}
        <motion.path
          d={`M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 ${largeArcFlag} 1 ${endX} ${endY}`}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="4 2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : baseDelay }}
        />

        {/* Angle label */}
        <motion.g
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: reducedMotion ? 0 : baseDelay + 0.3 }}
        >
          <rect
            x={labelX - 18}
            y={labelY - 9}
            width={36}
            height={18}
            rx={4}
            fill="#fef3c7"
            stroke="#f59e0b"
            strokeWidth={1}
          />
          <text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={10}
            fontWeight="600"
            fontFamily="'JetBrains Mono', monospace"
            fill="#92400e"
          >
            {angle.label || `${angle.angle}°`}
          </text>
        </motion.g>
      </motion.g>
    )
  }

  // Render all bond angles
  const renderBondAngles = () => {
    if (!showAngles || visibleBonds.length < bonds.length) return null
    return bondAngles.map((angle, index) => renderBondAngle(angle, index))
  }

  // Render VSEPR geometry info card
  const renderGeometryInfo = () => {
    if (!geometry || !showGeometryLabel || visibleBonds.length < bonds.length) return null

    return (
      <motion.g
        className="geometry-info"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reducedMotion ? 0 : 0.5, duration: 0.3 }}
      >
        {/* Geometry card */}
        <rect
          x={width - 150}
          y={10}
          width={140}
          height={showExplanations ? 65 : 40}
          fill="white"
          stroke={COLORS.gray[200]}
          strokeWidth={1}
          rx={8}
          style={{ filter: SHADOWS.soft }}
        />

        {/* Geometry name */}
        <text
          x={width - 80}
          y={26}
          textAnchor="middle"
          fontSize={12}
          fontWeight="600"
          fontFamily="'Inter', system-ui, sans-serif"
          fill={COLORS.primary[700]}
        >
          {geometryDisplayName}
        </text>

        {/* VSEPR notation */}
        {vsEPRInfo && (
          <text
            x={width - 80}
            y={42}
            textAnchor="middle"
            fontSize={10}
            fontFamily="'JetBrains Mono', monospace"
            fill={COLORS.gray[500]}
          >
            VSEPR: {vsEPRInfo.notation} • {vsEPRInfo.bondAngle}°
          </text>
        )}

        {/* Why explanation (shortened) */}
        {showExplanations && vsEPRInfo && (
          <text
            x={width - 80}
            y={58}
            textAnchor="middle"
            fontSize={8}
            fontFamily="'Inter', system-ui, sans-serif"
            fill={COLORS.gray[400]}
          >
            {vsEPRInfo.explanation.length > 35
              ? vsEPRInfo.explanation.substring(0, 32) + '...'
              : vsEPRInfo.explanation}
          </text>
        )}
      </motion.g>
    )
  }

  // Educational explanation panel (Why this shape?) - STEP-SPECIFIC
  const renderEducationalExplanation = () => {
    if (!showExplanations) return null

    // Get current step info for step-specific explanations
    const currentStepInfo = steps?.[Math.min(currentStep, (steps?.length || 1) - 1)]

    // PRIORITY 1: Step-specific explanation
    const stepWhyExplanation = currentStepInfo
      ? (language === 'he' ? currentStepInfo.whyExplanationHe : currentStepInfo.whyExplanation)
      : null

    // PRIORITY 2: Generated explanation (fallback)
    const lonePairCount = atoms.find((a) => a.lonePairs)?.lonePairs || 0
    let generatedExplanation = ''
    if (geometry && visibleBonds.length >= bonds.length) {
      if (language === 'he') {
        if (lonePairCount > 0) {
          generatedExplanation = `${lonePairCount} זוגות בודדים דוחפים את הקשרים, יוצרים צורת ${geometryDisplayName}.`
        } else {
          generatedExplanation = `הקשרים מתפרשים בשווה ליצירת צורת ${geometryDisplayName}.`
        }
      } else {
        if (lonePairCount > 0) {
          generatedExplanation = `${lonePairCount} lone pair${lonePairCount > 1 ? 's' : ''} push the bonds, creating ${geometryDisplayName} shape.`
        } else {
          generatedExplanation = `Bonds spread equally to form ${geometryDisplayName} shape.`
        }
      }
    }

    // Use step-specific if available, otherwise generated
    const message = stepWhyExplanation || generatedExplanation

    // Get step-specific common mistake warning
    const commonMistake = currentStepInfo
      ? (language === 'he' ? currentStepInfo.commonMistakeHe : currentStepInfo.commonMistake)
      : null

    // Don't render if no explanation to show
    if (!message && !commonMistake) return null

    const explanation = vsEPRInfo?.explanation || ''
    // Calculate box height based on whether we have common mistake
    const boxHeight = commonMistake ? 70 : 50

    return (
      <motion.g
        className="educational-explanation"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reducedMotion ? 0 : 0.6, duration: 0.3 }}
      >
        {/* Explanation box at bottom left */}
        <rect
          x={135}
          y={height - boxHeight - 10}
          width={width - 330}
          height={boxHeight}
          fill="#eff6ff"
          stroke="#3b82f6"
          strokeWidth={1}
          rx={6}
        />

        {/* Light bulb icon */}
        <text
          x={147}
          y={height - boxHeight + 20}
          fontSize={14}
          dominantBaseline="middle"
        >
          💡
        </text>

        {/* Why label - shows step-specific or default */}
        <text
          x={165}
          y={height - boxHeight + 10}
          fontSize={9}
          fontWeight="600"
          fontFamily="'Inter', system-ui, sans-serif"
          fill="#1e40af"
        >
          {stepWhyExplanation
            ? (language === 'he' ? 'הסבר לשלב זה:' : 'Step Explanation:')
            : (language === 'he' ? 'למה הצורה הזו?' : 'Why this shape?')}
        </text>

        {/* Explanation text */}
        {message && (
          <text
            x={165}
            y={height - boxHeight + 27}
            fontSize={9}
            fontFamily="'Inter', system-ui, sans-serif"
            fill="#3b82f6"
          >
            {message.length > 50 ? message.substring(0, 47) + '...' : message}
          </text>
        )}

        {/* Additional VSEPR detail if not using step-specific explanation */}
        {!stepWhyExplanation && explanation && (
          <text
            x={165}
            y={height - boxHeight + 42}
            fontSize={7}
            fontFamily="'Inter', system-ui, sans-serif"
            fill={COLORS.gray[400]}
          >
            {explanation.length > 60 ? explanation.substring(0, 57) + '...' : explanation}
          </text>
        )}

        {/* Common mistake warning - step-specific */}
        {commonMistake && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reducedMotion ? 0 : 0.8 }}
          >
            <text
              x={147}
              y={height - 25}
              fontSize={12}
              dominantBaseline="middle"
            >
              ⚠️
            </text>
            <text
              x={165}
              y={height - 25}
              fontSize={8}
              fontWeight="500"
              fontFamily="'Inter', system-ui, sans-serif"
              fill="#dc2626"
            >
              {language === 'he' ? 'טעות נפוצה: ' : 'Common Mistake: '}
              {commonMistake.length > 40 ? commonMistake.substring(0, 37) + '...' : commonMistake}
            </text>
          </motion.g>
        )}
      </motion.g>
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
          x={width - 180}
          y={height - 45}
          width={170}
          height={35}
          fill="white"
          stroke={COLORS.gray[200]}
          strokeWidth={1}
          rx={6}
          style={{ filter: SHADOWS.soft }}
        />
        <text
          x={width - 95}
          y={height - 24}
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

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`molecule-diagram ${className}`}
      style={{ borderRadius: '12px', overflow: 'hidden' }}
      role="img"
      aria-label={`${name} molecule (${formula})`}
    >
      {/* Definitions */}
      <defs>
        <linearGradient id="mol-bg-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor={COLORS.gray[50]} />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width={width} height={height} fill="url(#mol-bg-gradient)" rx={12} />

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

      {/* Bonds (render first so they're behind atoms) */}
      <AnimatePresence>
        {visibleBonds.map((bond, index) => renderBond(bond, index))}
      </AnimatePresence>

      {/* Bond angles (after bonds, before atoms) */}
      {renderBondAngles()}

      {/* Atoms */}
      <AnimatePresence>
        {visibleAtoms.map((atom, index) => renderAtom(atom, index))}
      </AnimatePresence>

      {/* Geometry info card (top right) */}
      {renderGeometryInfo()}

      {/* Educational explanation */}
      {renderEducationalExplanation()}

      {/* Molecule info */}
      {renderMoleculeInfo()}

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

// Wrapped export with error boundary
function MoleculeDiagramWithErrorBoundary(props: MoleculeDiagramProps) {
  return (
    <MoleculeDiagramErrorBoundary>
      <MoleculeDiagram {...props} />
    </MoleculeDiagramErrorBoundary>
  )
}

export { MoleculeDiagram, MoleculeDiagramWithErrorBoundary }
export default MoleculeDiagramWithErrorBoundary
