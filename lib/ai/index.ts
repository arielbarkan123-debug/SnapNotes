/**
 * AI Module Exports
 *
 * Central export point for all AI-related functionality
 */

// Claude API service - functions
export {
  analyzeNotebookImage,
  analyzeMultipleNotebookImages,
  generateStudyCourse,
  generateCourseFromImage,
  generateCourseFromMultipleImages,
  generateCourseFromImageSingleCall,
  generateCourseFromDocument,
  fetchImageAsBase64,
  ClaudeAPIError,
  isRetryableError,
  getUserFriendlyError,
  AI_MODEL,
} from './claude'

// Claude API service - types
export type {
  ImageMediaType,
  ImageData,
  AnalysisResult,
  CourseGenerationResult,
  FullPipelineResult,
  DocumentCourseResult,
  ClaudeErrorCode,
} from './claude'

// Prompts - functions
export {
  getImageAnalysisPrompt,
  getMultiPageImageAnalysisPrompt,
  getCourseGenerationPrompt,
  getCombinedAnalysisPrompt,
  getDocumentCoursePrompt,
  cleanJsonResponse,
  validateExtractedContent,
  formatExtractedContentForPrompt,
} from './prompts'

// Prompts - types
export type {
  ExtractedContent,
  ContentItem,
  DiagramItem,
  FormulaItem,
} from './prompts'
