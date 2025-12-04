/**
 * Images Module
 *
 * Utilities for handling images in courses:
 * - Searching for images from web (Unsplash)
 * - Uploading extracted images to storage
 */

export {
  searchImages,
  searchEducationalImages,
  searchImagesForTopics,
  getImageForTopic,
} from './search'

export type { SearchedImage } from './search'

export {
  uploadExtractedImages,
  uploadBase64Image,
} from './upload'

export type {
  UploadedImageResult,
  UploadImageError,
  ImageUploadResult,
} from './upload'
