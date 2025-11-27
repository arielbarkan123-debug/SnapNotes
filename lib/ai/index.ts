/**
 * AI Module Exports
 *
 * Central export point for all AI-related functionality
 */

// Claude API service - functions
export {
  analyzeNotebookImage,
  generateStudyCourse,
  generateCourseFromImage,
  generateCourseFromImageSingleCall,
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
  ClaudeErrorCode,
} from './claude'

// Prompts - functions
export {
  getImageAnalysisPrompt,
  getCourseGenerationPrompt,
  getCombinedAnalysisPrompt,
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
