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
  generateCourseFromMultipleImagesProgressive,
  generateCourseFromImageSingleCall,
  generateCourseFromDocument,
  generateCourseFromText,
  generateInitialCourse,
  generateContinuationLessons,
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
  TextCourseResult,
  InitialCourseResult,
  InitialImageCourseResult,
  ContinuationResult,
  ClaudeErrorCode,
} from './claude'

// Prompts - functions
export {
  getImageAnalysisPrompt,
  getMultiPageImageAnalysisPrompt,
  getCourseGenerationPrompt,
  getCombinedAnalysisPrompt,
  getDocumentCoursePrompt,
  getTextCoursePrompt,
  getExamCoursePrompt,
  isExamContent,
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
  UserLearningContext,
} from './prompts'
