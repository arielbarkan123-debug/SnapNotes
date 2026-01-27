/**
 * Chemistry Visualization Types
 * Step-synced diagrams for atoms, molecules, and chemical bonds
 */

// ============================================================================
// Element & Atom Types
// ============================================================================

/**
 * Electron shell configuration
 * Each shell has a maximum capacity: 1st=2, 2nd=8, 3rd=8 (simplified), etc.
 */
export interface ElectronShell {
  /** Shell number (1 = innermost) */
  n: number
  /** Number of electrons in this shell */
  electrons: number
  /** Maximum capacity for this shell */
  maxElectrons: number
  /** Subshell breakdown (e.g., ['1s²'] for first shell) */
  subshells?: string[]
}

/**
 * Generate electron configuration notation string
 * e.g., "1s² 2s² 2p²" for Carbon
 */
export function generateElectronConfigNotation(shells: ElectronShell[]): string {
  const notation: string[] = []

  for (const shell of shells) {
    const n = shell.n
    const electrons = shell.electrons

    if (n === 1) {
      // 1s can hold 2
      notation.push(`1s${superscript(Math.min(electrons, 2))}`)
    } else if (n === 2) {
      // 2s (2), 2p (6)
      if (electrons > 0) {
        notation.push(`2s${superscript(Math.min(electrons, 2))}`)
      }
      if (electrons > 2) {
        notation.push(`2p${superscript(electrons - 2)}`)
      }
    } else if (n === 3) {
      // 3s (2), 3p (6), 3d (10)
      if (electrons > 0) {
        notation.push(`3s${superscript(Math.min(electrons, 2))}`)
      }
      if (electrons > 2) {
        notation.push(`3p${superscript(Math.min(electrons - 2, 6))}`)
      }
      if (electrons > 8) {
        notation.push(`3d${superscript(electrons - 8)}`)
      }
    } else if (n === 4) {
      // 4s (2), 4p (6), 4d (10), 4f (14)
      if (electrons > 0) {
        notation.push(`4s${superscript(Math.min(electrons, 2))}`)
      }
      if (electrons > 2) {
        notation.push(`4p${superscript(Math.min(electrons - 2, 6))}`)
      }
      if (electrons > 8) {
        notation.push(`4d${superscript(Math.min(electrons - 8, 10))}`)
      }
      if (electrons > 18) {
        notation.push(`4f${superscript(electrons - 18)}`)
      }
    }
  }

  return notation.join(' ')
}

/**
 * Convert number to superscript for electron notation
 */
function superscript(n: number): string {
  const superscripts: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  }
  return String(n).split('').map(d => superscripts[d] || d).join('')
}

/**
 * Get valence electron count from shells
 */
export function getValenceElectrons(shells: ElectronShell[]): number {
  if (shells.length === 0) return 0
  return shells[shells.length - 1].electrons
}

/**
 * Get shell capacity explanation for teaching
 */
export function getShellCapacityExplanation(shellNumber: number, language: 'en' | 'he' = 'en'): string {
  const capacities = [2, 8, 18, 32]
  const capacity = capacities[shellNumber - 1] || 32

  const explanations: Record<string, Record<number, string>> = {
    en: {
      1: `First shell (n=1): Maximum ${capacity} electrons. Formula: 2n² = 2×1² = 2`,
      2: `Second shell (n=2): Maximum ${capacity} electrons. Formula: 2n² = 2×2² = 8`,
      3: `Third shell (n=3): Maximum ${capacity} electrons. Formula: 2n² = 2×3² = 18`,
      4: `Fourth shell (n=4): Maximum ${capacity} electrons. Formula: 2n² = 2×4² = 32`,
    },
    he: {
      1: `קליפה ראשונה (n=1): מקסימום ${capacity} אלקטרונים. נוסחה: 2n² = 2×1² = 2`,
      2: `קליפה שנייה (n=2): מקסימום ${capacity} אלקטרונים. נוסחה: 2n² = 2×2² = 8`,
      3: `קליפה שלישית (n=3): מקסימום ${capacity} אלקטרונים. נוסחה: 2n² = 2×3² = 18`,
      4: `קליפה רביעית (n=4): מקסימום ${capacity} אלקטרונים. נוסחה: 2n² = 2×4² = 32`,
    },
  }

  return explanations[language][shellNumber] || explanations[language][4]
}

/**
 * Element data from periodic table
 */
export interface ElementData {
  /** Atomic number (number of protons) */
  atomicNumber: number
  /** Element symbol (e.g., "H", "He", "C") */
  symbol: string
  /** Element name */
  name: string
  /** Atomic mass */
  atomicMass: number
  /** Number of neutrons (most common isotope) */
  neutrons: number
  /** Electron configuration as array of shells */
  electronConfig: ElectronShell[]
  /** Category for coloring (e.g., "metal", "nonmetal", "noble_gas") */
  category: ElementCategory
  /** Electronegativity (Pauling scale) */
  electronegativity?: number
  /** Group number in periodic table */
  group?: number
  /** Period number in periodic table */
  period?: number
}

export type ElementCategory =
  | 'alkali_metal'
  | 'alkaline_earth'
  | 'transition_metal'
  | 'post_transition_metal'
  | 'metalloid'
  | 'nonmetal'
  | 'halogen'
  | 'noble_gas'
  | 'lanthanide'
  | 'actinide'

// ============================================================================
// Atom Diagram Types
// ============================================================================

export interface AtomDiagramStep {
  step: number
  type: 'nucleus' | 'shell' | 'electrons' | 'label' | 'complete'
  /** Which shell is being revealed (for 'shell' and 'electrons' types) */
  shellNumber?: number
  /** Description of what's happening */
  description?: string
  descriptionHe?: string
  /** Calculation or fact shown */
  calculation?: string
  highlighted?: boolean
  /** Educational "why" explanation specific to this step */
  whyExplanation?: string
  whyExplanationHe?: string
  /** Common mistake warning specific to this step */
  commonMistake?: string
  commonMistakeHe?: string
}

export interface AtomDiagramData {
  /** Element to display */
  element: ElementData
  /** Animation steps */
  steps?: AtomDiagramStep[]
  /** Show proton count in nucleus */
  showProtonCount?: boolean
  /** Show neutron count in nucleus */
  showNeutronCount?: boolean
  /** Show electron count per shell */
  showElectronCount?: boolean
  /** Show element symbol */
  showSymbol?: boolean
  /** Show full element name */
  showName?: boolean
  /** Show atomic number */
  showAtomicNumber?: boolean
  /** Title */
  title?: string
  /** Show electron configuration notation (1s², 2s², etc.) - default true */
  showElectronConfig?: boolean
  /** Show shell capacity labels (max 2, max 8, etc.) - default true */
  showShellCapacity?: boolean
  /** Highlight valence (outermost) electrons - default true */
  highlightValence?: boolean
  /** Show educational "Why" explanations - default true */
  showExplanations?: boolean
}

// ============================================================================
// Molecule & Bond Types
// ============================================================================

export type BondType = 'single' | 'double' | 'triple' | 'ionic' | 'hydrogen' | 'metallic'

export interface ChemicalBond {
  /** First atom index */
  atom1: number
  /** Second atom index */
  atom2: number
  /** Type of bond */
  type: BondType
  /** Polarity indicator (for polar covalent bonds) */
  polarity?: {
    /** Index of more electronegative atom */
    negativeAtom: number
    /** Partial charge symbols to show */
    showCharges: boolean
  }
}

export interface MoleculeAtom {
  /** Element symbol */
  symbol: string
  /** Position in 2D space (for rendering) */
  position: { x: number; y: number }
  /** Formal charge (if any) */
  formalCharge?: number
  /** Lone pairs to show */
  lonePairs?: number
  /** Label override */
  label?: string
  /** Color override */
  color?: string
}

export interface MoleculeDiagramStep {
  step: number
  type: 'setup' | 'add_atom' | 'add_bond' | 'show_charges' | 'show_lone_pairs' | 'label' | 'complete'
  /** Which atom index is being added */
  atomIndex?: number
  /** Which bond index is being added */
  bondIndex?: number
  description?: string
  descriptionHe?: string
  calculation?: string
  highlighted?: boolean
  /** Educational "why" explanation specific to this step */
  whyExplanation?: string
  whyExplanationHe?: string
  /** Common mistake warning specific to this step */
  commonMistake?: string
  commonMistakeHe?: string
}

export interface MoleculeDiagramData {
  /** Molecule name */
  name: string
  /** Chemical formula (e.g., "H2O", "CO2") */
  formula: string
  /** Atoms in the molecule */
  atoms: MoleculeAtom[]
  /** Bonds between atoms */
  bonds: ChemicalBond[]
  /** Animation steps */
  steps?: MoleculeDiagramStep[]
  /** Show bond angles */
  showAngles?: boolean
  /** Bond angles to display */
  bondAngles?: BondAngle[]
  /** Show partial charges (for polar molecules) */
  showPartialCharges?: boolean
  /** Show lone pairs */
  showLonePairs?: boolean
  /** Molecular geometry type (for reference) */
  geometry?: MolecularGeometry
  /** Show VSEPR geometry label and info */
  showGeometryLabel?: boolean
  /** Show educational "Why" explanations */
  showExplanations?: boolean
  /** Title */
  title?: string
}

export type MolecularGeometry =
  | 'linear'
  | 'bent'
  | 'trigonal_planar'
  | 'tetrahedral'
  | 'trigonal_pyramidal'
  | 'trigonal_bipyramidal'
  | 'octahedral'

/**
 * Bond angle data for molecule visualization
 */
export interface BondAngle {
  /** Index of central atom */
  centerAtom: number
  /** Index of first outer atom */
  atom1: number
  /** Index of second outer atom */
  atom2: number
  /** Angle in degrees */
  angle: number
  /** Label to show (e.g., "104.5°") */
  label?: string
}

/**
 * VSEPR geometry information with educational details
 */
export interface VSEPRInfo {
  /** Geometry type */
  geometry: MolecularGeometry
  /** Electron domain geometry (if different from molecular) */
  electronGeometry?: MolecularGeometry
  /** VSEPR notation (e.g., "AX₂E₂" for water) */
  notation: string
  /** Predicted bond angle */
  bondAngle: number
  /** Explanation for this geometry */
  explanation: string
  explanationHe?: string
}

/**
 * Get VSEPR info for common geometries
 */
export function getVSEPRInfo(geometry: MolecularGeometry, language: 'en' | 'he' = 'en'): VSEPRInfo {
  const info: Record<MolecularGeometry, VSEPRInfo> = {
    linear: {
      geometry: 'linear',
      notation: 'AX₂',
      bondAngle: 180,
      explanation: 'Two bonding pairs repel equally, creating a straight line (180°).',
      explanationHe: 'שני זוגות קושרים דוחים באופן שווה, יוצרים קו ישר (180°).',
    },
    bent: {
      geometry: 'bent',
      electronGeometry: 'tetrahedral',
      notation: 'AX₂E₂',
      bondAngle: 104.5,
      explanation: 'Two lone pairs push bonding pairs closer together, creating a bent shape (~104.5°).',
      explanationHe: 'שני זוגות בודדים דוחפים את זוגות הקשר קרוב יותר, יוצרים צורה מכופפת (~104.5°).',
    },
    trigonal_planar: {
      geometry: 'trigonal_planar',
      notation: 'AX₃',
      bondAngle: 120,
      explanation: 'Three bonding pairs spread equally in a plane (120° angles).',
      explanationHe: 'שלושה זוגות קושרים מתפרשים בשווה במישור (זוויות 120°).',
    },
    tetrahedral: {
      geometry: 'tetrahedral',
      notation: 'AX₄',
      bondAngle: 109.5,
      explanation: 'Four bonding pairs arrange in 3D to minimize repulsion (109.5°).',
      explanationHe: 'ארבעה זוגות קושרים מסתדרים בתלת-ממד למזעור דחייה (109.5°).',
    },
    trigonal_pyramidal: {
      geometry: 'trigonal_pyramidal',
      electronGeometry: 'tetrahedral',
      notation: 'AX₃E',
      bondAngle: 107,
      explanation: 'One lone pair pushes three bonding pairs down, creating a pyramid (~107°).',
      explanationHe: 'זוג בודד אחד דוחף שלושה זוגות קושרים למטה, יוצר פירמידה (~107°).',
    },
    trigonal_bipyramidal: {
      geometry: 'trigonal_bipyramidal',
      notation: 'AX₅',
      bondAngle: 90,
      explanation: 'Five bonding pairs create axial (180°) and equatorial (120°) positions.',
      explanationHe: 'חמישה זוגות קושרים יוצרים מיקומים צירים (180°) ומשווניים (120°).',
    },
    octahedral: {
      geometry: 'octahedral',
      notation: 'AX₆',
      bondAngle: 90,
      explanation: 'Six bonding pairs arrange at 90° angles in an octahedral shape.',
      explanationHe: 'שישה זוגות קושרים מסתדרים בזוויות 90° בצורת אוקטהדרון.',
    },
  }

  const result = info[geometry]
  if (language === 'he') {
    return {
      ...result,
      explanation: result.explanationHe || result.explanation,
    }
  }
  return result
}

/**
 * Get geometry display name
 */
export function getGeometryDisplayName(geometry: MolecularGeometry, language: 'en' | 'he' = 'en'): string {
  const names: Record<string, Record<MolecularGeometry, string>> = {
    en: {
      linear: 'Linear',
      bent: 'Bent',
      trigonal_planar: 'Trigonal Planar',
      tetrahedral: 'Tetrahedral',
      trigonal_pyramidal: 'Trigonal Pyramidal',
      trigonal_bipyramidal: 'Trigonal Bipyramidal',
      octahedral: 'Octahedral',
    },
    he: {
      linear: 'לינארי',
      bent: 'מכופף',
      trigonal_planar: 'משולש מישורי',
      tetrahedral: 'טטרהדרי',
      trigonal_pyramidal: 'פירמידה משולשת',
      trigonal_bipyramidal: 'דו-פירמידה משולשת',
      octahedral: 'אוקטהדרי',
    },
  }
  return names[language][geometry]
}

// ============================================================================
// Periodic Element Types
// ============================================================================

export interface PeriodicElementData {
  /** Element to display */
  element: ElementData
  /** Highlight state */
  highlighted?: boolean
  /** Show detailed info */
  showDetails?: boolean
  /** Title */
  title?: string
}

// ============================================================================
// Bonding Diagram Types (showing bond formation)
// ============================================================================

export interface BondingDiagramStep {
  step: number
  type: 'initial' | 'approach' | 'electron_transfer' | 'electron_share' | 'bond_form' | 'complete'
  description?: string
  descriptionHe?: string
  calculation?: string
  highlighted?: boolean
}

export interface BondingDiagramData {
  /** Type of bonding being demonstrated */
  bondType: 'ionic' | 'covalent'
  /** First element */
  element1: ElementData
  /** Second element */
  element2: ElementData
  /** For ionic: which element loses electrons */
  electronDonor?: number
  /** Animation steps */
  steps?: BondingDiagramStep[]
  /** Show electron dot diagrams */
  showElectronDots?: boolean
  /** Show resulting compound */
  showResult?: boolean
  /** Title */
  title?: string
}

// ============================================================================
// Combined Chemistry Diagram Types
// ============================================================================

export type ChemistryDiagramType =
  | 'atom'
  | 'molecule'
  | 'periodic_element'
  | 'bonding'

export type ChemistryDiagramData =
  | AtomDiagramData
  | MoleculeDiagramData
  | PeriodicElementData
  | BondingDiagramData

export interface ChemistryDiagramState {
  /** Type of diagram */
  type: ChemistryDiagramType
  /** Diagram-specific data */
  data: ChemistryDiagramData
  /** Current step to display */
  visibleStep: number
  /** Total number of steps */
  totalSteps?: number
  /** Step configuration for progressive reveal */
  stepConfig?: ChemistryDiagramStepConfig[]
  /** Evolution mode */
  evolutionMode?: 'manual' | 'auto-advance'
  /** Conversation turn */
  conversationTurn?: number
  /** Elements that were updated in this step */
  updatedElements?: string[]
}

export interface ChemistryDiagramStepConfig {
  step: number
  stepLabel?: string
  stepLabelHe?: string
  showCalculation?: string
  animation?: 'none' | 'fade' | 'draw' | 'highlight' | 'orbit'
}

// ============================================================================
// Styling Constants
// ============================================================================

/**
 * Element category colors (following standard periodic table coloring)
 */
export const ELEMENT_CATEGORY_COLORS: Record<ElementCategory, string> = {
  alkali_metal: '#ff6b6b',
  alkaline_earth: '#ffa94d',
  transition_metal: '#ffd43b',
  post_transition_metal: '#69db7c',
  metalloid: '#38d9a9',
  nonmetal: '#4dabf7',
  halogen: '#748ffc',
  noble_gas: '#da77f2',
  lanthanide: '#ff8787',
  actinide: '#f783ac',
}

/**
 * Atom colors by common elements
 */
export const ATOM_COLORS: Record<string, string> = {
  H: '#FFFFFF',
  C: '#909090',
  N: '#3050F8',
  O: '#FF0D0D',
  F: '#90E050',
  Cl: '#1FF01F',
  Br: '#A62929',
  I: '#940094',
  S: '#FFFF30',
  P: '#FF8000',
  Na: '#AB5CF2',
  K: '#8F40D4',
  Ca: '#3DFF00',
  Fe: '#E06633',
  default: '#808080',
}

/**
 * Bond colors
 */
export const BOND_COLORS: Record<BondType, string> = {
  single: '#374151',
  double: '#374151',
  triple: '#374151',
  ionic: '#8b5cf6',
  hydrogen: '#60a5fa',
  metallic: '#fbbf24',
}

/**
 * Shell colors (for electron orbits)
 */
export const SHELL_COLORS = [
  '#3b82f6', // Shell 1 - blue
  '#22c55e', // Shell 2 - green
  '#f59e0b', // Shell 3 - amber
  '#ef4444', // Shell 4 - red
  '#8b5cf6', // Shell 5 - purple
  '#06b6d4', // Shell 6 - cyan
  '#ec4899', // Shell 7 - pink
]

/**
 * Charge colors
 */
export const CHARGE_COLORS = {
  positive: '#ef4444', // red for positive
  negative: '#3b82f6', // blue for negative
  neutral: '#6b7280',  // gray for neutral
  partialPositive: '#fca5a5', // light red for δ+
  partialNegative: '#93c5fd', // light blue for δ-
}

// ============================================================================
// Common Elements Data (for quick reference)
// ============================================================================

export const COMMON_ELEMENTS: Record<string, ElementData> = {
  H: {
    atomicNumber: 1,
    symbol: 'H',
    name: 'Hydrogen',
    atomicMass: 1.008,
    neutrons: 0,
    electronConfig: [{ n: 1, electrons: 1, maxElectrons: 2 }],
    category: 'nonmetal',
    electronegativity: 2.20,
    group: 1,
    period: 1,
  },
  He: {
    atomicNumber: 2,
    symbol: 'He',
    name: 'Helium',
    atomicMass: 4.003,
    neutrons: 2,
    electronConfig: [{ n: 1, electrons: 2, maxElectrons: 2 }],
    category: 'noble_gas',
    group: 18,
    period: 1,
  },
  C: {
    atomicNumber: 6,
    symbol: 'C',
    name: 'Carbon',
    atomicMass: 12.011,
    neutrons: 6,
    electronConfig: [
      { n: 1, electrons: 2, maxElectrons: 2 },
      { n: 2, electrons: 4, maxElectrons: 8 },
    ],
    category: 'nonmetal',
    electronegativity: 2.55,
    group: 14,
    period: 2,
  },
  N: {
    atomicNumber: 7,
    symbol: 'N',
    name: 'Nitrogen',
    atomicMass: 14.007,
    neutrons: 7,
    electronConfig: [
      { n: 1, electrons: 2, maxElectrons: 2 },
      { n: 2, electrons: 5, maxElectrons: 8 },
    ],
    category: 'nonmetal',
    electronegativity: 3.04,
    group: 15,
    period: 2,
  },
  O: {
    atomicNumber: 8,
    symbol: 'O',
    name: 'Oxygen',
    atomicMass: 15.999,
    neutrons: 8,
    electronConfig: [
      { n: 1, electrons: 2, maxElectrons: 2 },
      { n: 2, electrons: 6, maxElectrons: 8 },
    ],
    category: 'nonmetal',
    electronegativity: 3.44,
    group: 16,
    period: 2,
  },
  Na: {
    atomicNumber: 11,
    symbol: 'Na',
    name: 'Sodium',
    atomicMass: 22.990,
    neutrons: 12,
    electronConfig: [
      { n: 1, electrons: 2, maxElectrons: 2 },
      { n: 2, electrons: 8, maxElectrons: 8 },
      { n: 3, electrons: 1, maxElectrons: 8 },
    ],
    category: 'alkali_metal',
    electronegativity: 0.93,
    group: 1,
    period: 3,
  },
  Cl: {
    atomicNumber: 17,
    symbol: 'Cl',
    name: 'Chlorine',
    atomicMass: 35.45,
    neutrons: 18,
    electronConfig: [
      { n: 1, electrons: 2, maxElectrons: 2 },
      { n: 2, electrons: 8, maxElectrons: 8 },
      { n: 3, electrons: 7, maxElectrons: 8 },
    ],
    category: 'halogen',
    electronegativity: 3.16,
    group: 17,
    period: 3,
  },
}

// ============================================================================
// Common Molecules Data
// ============================================================================

export const COMMON_MOLECULES: Record<string, Omit<MoleculeDiagramData, 'steps'>> = {
  H2O: {
    name: 'Water',
    formula: 'H₂O',
    atoms: [
      { symbol: 'O', position: { x: 0, y: 0 }, lonePairs: 2 },
      { symbol: 'H', position: { x: -0.8, y: 0.6 } },
      { symbol: 'H', position: { x: 0.8, y: 0.6 } },
    ],
    bonds: [
      { atom1: 0, atom2: 1, type: 'single', polarity: { negativeAtom: 0, showCharges: true } },
      { atom1: 0, atom2: 2, type: 'single', polarity: { negativeAtom: 0, showCharges: true } },
    ],
    bondAngles: [
      { centerAtom: 0, atom1: 1, atom2: 2, angle: 104.5, label: '104.5°' },
    ],
    geometry: 'bent',
    showAngles: true,
    showPartialCharges: true,
    showLonePairs: true,
    showGeometryLabel: true,
    showExplanations: true,
  },
  CO2: {
    name: 'Carbon Dioxide',
    formula: 'CO₂',
    atoms: [
      { symbol: 'C', position: { x: 0, y: 0 } },
      { symbol: 'O', position: { x: -1.2, y: 0 }, lonePairs: 2 },
      { symbol: 'O', position: { x: 1.2, y: 0 }, lonePairs: 2 },
    ],
    bonds: [
      { atom1: 0, atom2: 1, type: 'double' },
      { atom1: 0, atom2: 2, type: 'double' },
    ],
    bondAngles: [
      { centerAtom: 0, atom1: 1, atom2: 2, angle: 180, label: '180°' },
    ],
    geometry: 'linear',
    showAngles: true,
    showGeometryLabel: true,
    showExplanations: true,
  },
  CH4: {
    name: 'Methane',
    formula: 'CH₄',
    atoms: [
      { symbol: 'C', position: { x: 0, y: 0 } },
      { symbol: 'H', position: { x: 0, y: -1 } },
      { symbol: 'H', position: { x: -0.9, y: 0.5 } },
      { symbol: 'H', position: { x: 0.9, y: 0.5 } },
      { symbol: 'H', position: { x: 0, y: 1 } },
    ],
    bonds: [
      { atom1: 0, atom2: 1, type: 'single' },
      { atom1: 0, atom2: 2, type: 'single' },
      { atom1: 0, atom2: 3, type: 'single' },
      { atom1: 0, atom2: 4, type: 'single' },
    ],
    bondAngles: [
      { centerAtom: 0, atom1: 1, atom2: 2, angle: 109.5, label: '109.5°' },
    ],
    geometry: 'tetrahedral',
    showAngles: true,
    showGeometryLabel: true,
    showExplanations: true,
  },
  NH3: {
    name: 'Ammonia',
    formula: 'NH₃',
    atoms: [
      { symbol: 'N', position: { x: 0, y: 0 }, lonePairs: 1 },
      { symbol: 'H', position: { x: -0.8, y: 0.6 } },
      { symbol: 'H', position: { x: 0.8, y: 0.6 } },
      { symbol: 'H', position: { x: 0, y: -0.8 } },
    ],
    bonds: [
      { atom1: 0, atom2: 1, type: 'single', polarity: { negativeAtom: 0, showCharges: true } },
      { atom1: 0, atom2: 2, type: 'single', polarity: { negativeAtom: 0, showCharges: true } },
      { atom1: 0, atom2: 3, type: 'single', polarity: { negativeAtom: 0, showCharges: true } },
    ],
    bondAngles: [
      { centerAtom: 0, atom1: 1, atom2: 2, angle: 107, label: '107°' },
    ],
    geometry: 'trigonal_pyramidal',
    showAngles: true,
    showPartialCharges: true,
    showLonePairs: true,
    showGeometryLabel: true,
    showExplanations: true,
  },
  NaCl: {
    name: 'Sodium Chloride',
    formula: 'NaCl',
    atoms: [
      { symbol: 'Na', position: { x: -0.8, y: 0 }, formalCharge: 1 },
      { symbol: 'Cl', position: { x: 0.8, y: 0 }, formalCharge: -1 },
    ],
    bonds: [
      { atom1: 0, atom2: 1, type: 'ionic' },
    ],
  },
  O2: {
    name: 'Oxygen',
    formula: 'O₂',
    atoms: [
      { symbol: 'O', position: { x: -0.6, y: 0 }, lonePairs: 2 },
      { symbol: 'O', position: { x: 0.6, y: 0 }, lonePairs: 2 },
    ],
    bonds: [
      { atom1: 0, atom2: 1, type: 'double' },
    ],
    geometry: 'linear',
    showGeometryLabel: true,
  },
  N2: {
    name: 'Nitrogen',
    formula: 'N₂',
    atoms: [
      { symbol: 'N', position: { x: -0.5, y: 0 }, lonePairs: 1 },
      { symbol: 'N', position: { x: 0.5, y: 0 }, lonePairs: 1 },
    ],
    bonds: [
      { atom1: 0, atom2: 1, type: 'triple' },
    ],
    geometry: 'linear',
    showGeometryLabel: true,
  },
}
