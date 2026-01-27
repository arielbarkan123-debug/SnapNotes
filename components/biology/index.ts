/**
 * Biology Visualization Components
 * Step-synced diagrams for cells, DNA, and biological processes
 */

export { CellDiagram } from './CellDiagram'
export { DNADiagram } from './DNADiagram'
export { BiologyDiagramRenderer } from './BiologyDiagramRenderer'

// Re-export types for convenience
export type {
  CellDiagramData,
  DNADiagramData,
  BiologyDiagramState,
  BiologyDiagramStepConfig,
  Organelle,
  OrganelleType,
  CellType,
  Nucleotide,
  BasePair,
} from '@/types/biology'
