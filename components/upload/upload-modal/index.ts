/**
 * UploadModal components - Split into smaller, focused components
 */

// Main component
export { default } from './UploadModal'
export { default as UploadModal } from './UploadModal'

// Sub-components
export { default as IntensityModeSelector } from './IntensityModeSelector'
export { default as DropZone } from './DropZone'
export { default as FilePreviewGrid } from './FilePreviewGrid'
export { default as TextInputArea } from './TextInputArea'
export { default as UploadProgressOverlay } from './UploadProgressOverlay'
export { default as ErrorDisplay } from './ErrorDisplay'

// Types
export type {
  UploadModalProps,
  UploadError,
  UploadProgress,
  UploadFileError,
  FileCategory,
  InputMode,
  SelectedFile,
} from './types'

// Constants
export {
  ACCEPTED_TYPES,
  ACCEPTED_EXTENSIONS,
  MAX_FILE_SIZES,
  MAX_FILES,
  FILE_ICONS,
  FILE_TYPE_LABELS,
} from './types'

// Helpers
export {
  formatFileSize,
  getFileCategory,
  getMaxSizeForCategory,
  getButtonText,
  getErrorMessage,
  generateFileId,
  validateFile,
} from './helpers'
