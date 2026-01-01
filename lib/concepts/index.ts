/**
 * Concept System
 *
 * Knowledge graph and gap detection for personalized learning.
 */

// Types
export * from './types'

// Concept extraction
export {
  extractConceptsFromCourse,
  extractAndStoreConcepts,
  storeConcepts,
  buildPrerequisiteEdges,
  storeContentMappings,
  getConceptsForCourse,
  getConceptsForLesson,
} from './extractor'

// Prerequisite graph
export { PrerequisiteGraph, createPrerequisiteGraph } from './prerequisite-graph'

// Gap detection
export {
  detectKnowledgeGaps,
  enrichGapsWithAI,
  storeGaps,
  resolveGap,
  getUnresolvedGaps,
  getGapsForConcepts,
  checkPrerequisitesForLesson,
} from './gap-detector'
