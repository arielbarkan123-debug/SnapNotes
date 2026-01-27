/**
 * Biology Visualization Types
 * Step-synced diagrams for cells, organelles, DNA, and biological processes
 */

// ============================================================================
// Cell Types
// ============================================================================

export type CellType = 'animal' | 'plant' | 'bacteria' | 'virus'

export type OrganelleType =
  | 'nucleus'
  | 'cell_membrane'
  | 'cell_wall'         // Plant only
  | 'cytoplasm'
  | 'mitochondria'
  | 'ribosome'
  | 'endoplasmic_reticulum_rough'
  | 'endoplasmic_reticulum_smooth'
  | 'golgi_apparatus'
  | 'lysosome'
  | 'vacuole'
  | 'chloroplast'       // Plant only
  | 'centriole'         // Animal only
  | 'nuclear_membrane'
  | 'nucleolus'
  | 'chromatin'
  | 'cytoskeleton'
  | 'peroxisome'
  | 'flagellum'         // Some cells
  | 'cilia'             // Some cells

export interface Organelle {
  type: OrganelleType
  /** Position within the cell (0-1 normalized) */
  position: { x: number; y: number }
  /** Size relative to cell (0-1) */
  size?: number
  /** Function description */
  function?: string
  functionHe?: string
  /** Whether this organelle is present in this cell type */
  present?: boolean
  /** Color override */
  color?: string
  /** Label to display */
  label?: string
}

export interface CellDiagramStep {
  step: number
  type: 'outline' | 'organelle' | 'label' | 'function' | 'complete'
  /** Which organelle is being revealed */
  organelleType?: OrganelleType
  /** Description of what's happening */
  description?: string
  descriptionHe?: string
  calculation?: string
  highlighted?: boolean
}

export interface CellDiagramData {
  /** Type of cell to display */
  cellType: CellType
  /** Which organelles to show */
  organelles: Organelle[]
  /** Animation steps */
  steps?: CellDiagramStep[]
  /** Show labels for organelles */
  showLabels?: boolean
  /** Show function descriptions on hover/tap */
  showFunctions?: boolean
  /** Zoom level (1 = full cell, higher = zoomed in) */
  zoomLevel?: number
  /** Focus on specific organelle */
  focusOrganelle?: OrganelleType
  /** Title */
  title?: string
}

// ============================================================================
// DNA Types
// ============================================================================

export type Nucleotide = 'A' | 'T' | 'G' | 'C' | 'U' // U for RNA

export interface BasePair {
  /** Left strand nucleotide */
  left: Nucleotide
  /** Right strand nucleotide (complementary) */
  right: Nucleotide
  /** Position in sequence (0-indexed) */
  position: number
  /** Whether this pair is highlighted */
  highlighted?: boolean
}

export interface DNADiagramStep {
  step: number
  type: 'backbone' | 'bases' | 'pair' | 'label' | 'unwind' | 'replicate' | 'complete'
  /** Which base pair position is being revealed */
  basePairPosition?: number
  description?: string
  descriptionHe?: string
  calculation?: string
  highlighted?: boolean
}

export interface DNADiagramData {
  /** DNA sequence (one strand, complementary auto-generated) */
  sequence: Nucleotide[]
  /** Show as double helix (3D-ish) or flat ladder */
  displayMode: 'helix' | 'ladder'
  /** Animation steps */
  steps?: DNADiagramStep[]
  /** Show base pair labels (A-T, G-C) */
  showBaseLabels?: boolean
  /** Show hydrogen bonds between pairs */
  showHydrogenBonds?: boolean
  /** Show sugar-phosphate backbone */
  showBackbone?: boolean
  /** Show 5' and 3' ends */
  showDirectionality?: boolean
  /** Helix rotation angle (for 3D effect) */
  helixAngle?: number
  /** Title */
  title?: string
}

// ============================================================================
// Organelle Detail Types
// ============================================================================

export interface OrganelleDetailPart {
  name: string
  nameHe?: string
  position: { x: number; y: number }
  size?: number
  function?: string
  functionHe?: string
  color?: string
}

export interface OrganelleDiagramStep {
  step: number
  type: 'structure' | 'part' | 'function' | 'label' | 'complete'
  partName?: string
  description?: string
  descriptionHe?: string
  highlighted?: boolean
}

export interface OrganelleDiagramData {
  /** Which organelle to show in detail */
  organelleType: OrganelleType
  /** Parts of the organelle */
  parts: OrganelleDetailPart[]
  /** Animation steps */
  steps?: OrganelleDiagramStep[]
  /** Show labels */
  showLabels?: boolean
  /** Show function descriptions */
  showFunctions?: boolean
  /** Title */
  title?: string
}

// ============================================================================
// Process Types (Photosynthesis, Respiration, etc.)
// ============================================================================

export type BiologicalProcess =
  | 'photosynthesis'
  | 'cellular_respiration'
  | 'mitosis'
  | 'meiosis'
  | 'protein_synthesis'
  | 'dna_replication'

export interface ProcessStage {
  name: string
  nameHe?: string
  /** Position in process flow */
  position: number
  /** Inputs for this stage */
  inputs?: string[]
  /** Outputs from this stage */
  outputs?: string[]
  /** Location (which organelle) */
  location?: OrganelleType
  /** Description */
  description?: string
  descriptionHe?: string
}

export interface ProcessDiagramStep {
  step: number
  type: 'overview' | 'stage' | 'arrow' | 'label' | 'complete'
  stageIndex?: number
  description?: string
  descriptionHe?: string
  calculation?: string
  highlighted?: boolean
}

export interface ProcessDiagramData {
  process: BiologicalProcess
  stages: ProcessStage[]
  steps?: ProcessDiagramStep[]
  /** Show energy/ATP indicators */
  showEnergy?: boolean
  /** Show reactants and products */
  showChemicals?: boolean
  /** Title */
  title?: string
}

// ============================================================================
// Combined Biology Diagram Types
// ============================================================================

export type BiologyDiagramType =
  | 'cell'
  | 'organelle'
  | 'dna'
  | 'process'

export type BiologyDiagramData =
  | CellDiagramData
  | OrganelleDiagramData
  | DNADiagramData
  | ProcessDiagramData

export interface BiologyDiagramState {
  /** Type of diagram */
  type: BiologyDiagramType
  /** Diagram-specific data */
  data: BiologyDiagramData
  /** Current step to display */
  visibleStep: number
  /** Total number of steps */
  totalSteps?: number
  /** Step configuration for progressive reveal */
  stepConfig?: BiologyDiagramStepConfig[]
  /** Evolution mode */
  evolutionMode?: 'manual' | 'auto-advance'
  /** Conversation turn */
  conversationTurn?: number
  /** Elements that were updated in this step */
  updatedElements?: string[]
}

export interface BiologyDiagramStepConfig {
  step: number
  stepLabel?: string
  stepLabelHe?: string
  showCalculation?: string
  animation?: 'none' | 'fade' | 'draw' | 'highlight' | 'pulse'
}

// ============================================================================
// Styling Constants
// ============================================================================

/**
 * Organelle colors (educational standard colors)
 */
export const ORGANELLE_COLORS: Record<OrganelleType, string> = {
  nucleus: '#6366f1',           // Indigo
  cell_membrane: '#a78bfa',     // Light purple
  cell_wall: '#65a30d',         // Lime green
  cytoplasm: '#fef3c7',         // Light yellow (fill)
  mitochondria: '#f97316',      // Orange
  ribosome: '#0ea5e9',          // Sky blue
  endoplasmic_reticulum_rough: '#14b8a6', // Teal
  endoplasmic_reticulum_smooth: '#2dd4bf', // Light teal
  golgi_apparatus: '#eab308',   // Yellow
  lysosome: '#dc2626',          // Red
  vacuole: '#60a5fa',           // Blue
  chloroplast: '#22c55e',       // Green
  centriole: '#8b5cf6',         // Purple
  nuclear_membrane: '#818cf8',  // Light indigo
  nucleolus: '#4338ca',         // Dark indigo
  chromatin: '#1e40af',         // Dark blue
  cytoskeleton: '#9ca3af',      // Gray
  peroxisome: '#fb923c',        // Light orange
  flagellum: '#6b7280',         // Gray
  cilia: '#9ca3af',             // Light gray
}

/**
 * Cell membrane colors
 */
export const CELL_COLORS: Record<CellType, { membrane: string; cytoplasm: string }> = {
  animal: {
    membrane: '#a78bfa',
    cytoplasm: '#fef3c7',
  },
  plant: {
    membrane: '#86efac',
    cytoplasm: '#dcfce7',
  },
  bacteria: {
    membrane: '#fbbf24',
    cytoplasm: '#fef9c3',
  },
  virus: {
    membrane: '#f87171',
    cytoplasm: '#fecaca',
  },
}

/**
 * DNA/RNA base colors
 */
export const BASE_COLORS: Record<Nucleotide, string> = {
  A: '#ef4444', // Adenine - Red
  T: '#3b82f6', // Thymine - Blue
  G: '#22c55e', // Guanine - Green
  C: '#f59e0b', // Cytosine - Amber
  U: '#8b5cf6', // Uracil (RNA) - Purple
}

/**
 * DNA backbone color
 */
export const DNA_BACKBONE_COLOR = '#6b7280'

/**
 * Hydrogen bond color
 */
export const HYDROGEN_BOND_COLOR = '#d1d5db'

// ============================================================================
// Default Data
// ============================================================================

/**
 * Default organelles for animal cell
 */
export const ANIMAL_CELL_ORGANELLES: Organelle[] = [
  { type: 'cell_membrane', position: { x: 0.5, y: 0.5 }, size: 1, function: 'Controls what enters and exits the cell' },
  { type: 'cytoplasm', position: { x: 0.5, y: 0.5 }, size: 0.95, function: 'Gel-like fluid where organelles float' },
  { type: 'nucleus', position: { x: 0.5, y: 0.45 }, size: 0.25, function: 'Contains DNA; controls cell activities' },
  { type: 'nucleolus', position: { x: 0.5, y: 0.45 }, size: 0.08, function: 'Makes ribosomes' },
  { type: 'mitochondria', position: { x: 0.7, y: 0.35 }, size: 0.12, function: 'Produces energy (ATP) for the cell' },
  { type: 'ribosome', position: { x: 0.35, y: 0.6 }, size: 0.03, function: 'Makes proteins' },
  { type: 'endoplasmic_reticulum_rough', position: { x: 0.65, y: 0.55 }, size: 0.15, function: 'Makes and transports proteins' },
  { type: 'endoplasmic_reticulum_smooth', position: { x: 0.35, y: 0.45 }, size: 0.12, function: 'Makes lipids; detoxifies' },
  { type: 'golgi_apparatus', position: { x: 0.3, y: 0.65 }, size: 0.12, function: 'Packages and ships proteins' },
  { type: 'lysosome', position: { x: 0.25, y: 0.35 }, size: 0.06, function: 'Digests waste and old parts' },
  { type: 'centriole', position: { x: 0.55, y: 0.7 }, size: 0.05, function: 'Helps cell divide' },
]

/**
 * Default organelles for plant cell
 */
export const PLANT_CELL_ORGANELLES: Organelle[] = [
  { type: 'cell_wall', position: { x: 0.5, y: 0.5 }, size: 1, function: 'Provides structure and support' },
  { type: 'cell_membrane', position: { x: 0.5, y: 0.5 }, size: 0.97, function: 'Controls what enters and exits' },
  { type: 'cytoplasm', position: { x: 0.5, y: 0.5 }, size: 0.93, function: 'Gel-like fluid where organelles float' },
  { type: 'nucleus', position: { x: 0.5, y: 0.35 }, size: 0.18, function: 'Contains DNA; controls cell activities' },
  { type: 'nucleolus', position: { x: 0.5, y: 0.35 }, size: 0.06, function: 'Makes ribosomes' },
  { type: 'vacuole', position: { x: 0.5, y: 0.6 }, size: 0.4, function: 'Stores water and nutrients; maintains pressure' },
  { type: 'chloroplast', position: { x: 0.3, y: 0.4 }, size: 0.12, function: 'Makes food through photosynthesis' },
  { type: 'mitochondria', position: { x: 0.7, y: 0.3 }, size: 0.1, function: 'Produces energy (ATP)' },
  { type: 'ribosome', position: { x: 0.25, y: 0.55 }, size: 0.025, function: 'Makes proteins' },
  { type: 'endoplasmic_reticulum_rough', position: { x: 0.7, y: 0.5 }, size: 0.12, function: 'Makes and transports proteins' },
  { type: 'golgi_apparatus', position: { x: 0.25, y: 0.7 }, size: 0.1, function: 'Packages and ships proteins' },
]

/**
 * Get complementary base pair
 */
export function getComplementaryBase(base: Nucleotide, isRNA = false): Nucleotide {
  switch (base) {
    case 'A': return isRNA ? 'U' : 'T'
    case 'T': return 'A'
    case 'U': return 'A'
    case 'G': return 'C'
    case 'C': return 'G'
    default: return 'A'
  }
}

/**
 * Generate base pairs from a sequence
 */
export function generateBasePairs(sequence: Nucleotide[]): BasePair[] {
  return sequence.map((base, index) => ({
    left: base,
    right: getComplementaryBase(base),
    position: index,
  }))
}
