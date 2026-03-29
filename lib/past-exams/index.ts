/**
 * Past Exams Library
 * Exports analyzer, style guide builder, and shared utility functions
 */

export {
  analyzeExamImage,
  analyzeExamText,
  getMediaTypeFromExtension,
} from './analyzer'

export {
  buildExamStyleGuide,
  hasCompletedAnalysis,
  pastExamsHaveImages,
  getAggregatedImageAnalysis,
} from './style-guide'

// Re-export client-safe utilities
export { formatSubjectLabel } from './utils'
