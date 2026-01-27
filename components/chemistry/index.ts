/**
 * Chemistry Visualization Components
 * Step-synced diagrams for atoms, molecules, and chemical processes
 */

export { AtomDiagram } from './AtomDiagram'
export { MoleculeDiagram } from './MoleculeDiagram'
export { ChemistryDiagramRenderer } from './ChemistryDiagramRenderer'

// Re-export types for convenience
export type {
  AtomDiagramData,
  MoleculeDiagramData,
  ChemistryDiagramState,
  ChemistryDiagramStepConfig,
  ElementData,
  MoleculeAtom,
  ChemicalBond,
  BondType,
  ElectronShell,
  BondAngle,
  MolecularGeometry,
  VSEPRInfo,
} from '@/types/chemistry'

// Re-export utility functions
export {
  generateElectronConfigNotation,
  getValenceElectrons,
  getShellCapacityExplanation,
  getVSEPRInfo,
  getGeometryDisplayName,
} from '@/types/chemistry'
