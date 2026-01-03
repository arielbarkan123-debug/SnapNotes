/**
 * Past Exams Library
 * Exports analyzer and style guide builder functions
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
