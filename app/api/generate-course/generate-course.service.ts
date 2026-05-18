import { type GeneratedCourse, type LessonOutline, type LessonIntensityMode } from '@/types'
import {
  generateCourseFromImage,
  generateCourseFromMultipleImagesProgressive,
  generateInitialCourse,
} from '@/lib/ai'
import type { UserLearningContext } from '@/lib/ai'
import { type ExtractedDocument } from '@/lib/documents'
import { uploadExtractedImages } from '@/lib/images'
import { createLogger } from '@/lib/logger'
import { logError } from '@/lib/api/errors'

const log = createLogger('service:generate-course')

export type SourceType = 'image' | 'pdf' | 'pptx' | 'docx' | 'text'

export interface ProgressiveMetadata {
  lessonOutline: LessonOutline[]
  documentSummary: string
  totalLessons: number
  lessonsReady: number
}

export interface GenerateCourseServiceParams {
  imageUrl?: string
  imageUrls?: string[]
  documentContent?: ExtractedDocument
  documentFileName?: string
  documentFileType?: 'pdf' | 'pptx' | 'docx'
  textContent?: string
  title?: string
  intensityMode?: LessonIntensityMode
  supplementaryText?: string
  /** Used for uploading legacy base64 images from document payloads */
  userId?: string
}

export interface GenerateCourseServiceResult {
  generatedCourse: GeneratedCourse
  extractedContent: string
  sourceType: SourceType
  courseImageUrls: string[]
  progressiveMetadata?: ProgressiveMetadata
}

export async function generateCourseService(
  params: GenerateCourseServiceParams,
  userContext?: UserLearningContext,
): Promise<GenerateCourseServiceResult> {
  const {
    imageUrl,
    imageUrls: imageUrlsParam,
    documentContent,
    textContent,
    supplementaryText,
    title,
    intensityMode,
    userId,
  } = params

  // Resolve source type
  const hasImages =
    (imageUrlsParam && Array.isArray(imageUrlsParam) && imageUrlsParam.length > 0) ||
    (imageUrl && typeof imageUrl === 'string')
  const hasDocument = documentContent && documentContent.type

  let sourceType: SourceType = 'image'
  let urls: string[] = []

  if (textContent && typeof textContent === 'string' && textContent.trim().length > 0 && !hasImages && !hasDocument) {
    sourceType = 'text'
  } else if (documentContent && documentContent.type) {
    sourceType = documentContent.type as SourceType
  } else {
    if (imageUrlsParam && Array.isArray(imageUrlsParam) && imageUrlsParam.length > 0) {
      urls = imageUrlsParam.filter((url) => typeof url === 'string' && url.trim())
    } else if (imageUrl && typeof imageUrl === 'string') {
      urls = [imageUrl]
    }

    if (urls.length === 0) {
      throw new Error('Either imageUrl/imageUrls, documentContent, or textContent is required')
    }
    if (urls.length > 10) {
      throw new Error('Maximum 10 images allowed per course')
    }
  }

  let generatedCourse: GeneratedCourse
  let extractedContent: string
  let courseImageUrls: string[] = []
  let progressiveMetadata: ProgressiveMetadata | undefined

  const tempCourseId = crypto.randomUUID()

  log.info({ sourceType, urlCount: urls.length }, 'Source resolved')

  if (sourceType === 'text' && textContent) {
    log.info({ title, intensityMode, textLength: textContent.length }, 'Generating course from text (progressive)')
    const textAsDocument: ExtractedDocument = {
      type: 'pdf',
      title: title || 'Text Course',
      content: textContent,
      sections: [{ title: 'Content', content: textContent, pageNumber: 1 }],
      metadata: { pageCount: 1 },
      images: [],
    }
    const result = await generateInitialCourse(textAsDocument, title, [], userContext, intensityMode)
    generatedCourse = result.generatedCourse
    extractedContent = textContent
    log.info({ lessons: result.generatedCourse.lessons.length, totalLessons: result.totalLessons }, 'Text course initial generation done')
    progressiveMetadata = {
      lessonOutline: result.lessonOutline,
      documentSummary: result.documentSummary,
      totalLessons: result.totalLessons,
      lessonsReady: result.generatedCourse.lessons.length,
    }
  } else if (documentContent) {
    let docImageUrls: string[] = []

    if (documentContent.images && documentContent.images.length > 0) {
      try {
        const alreadyUploaded = documentContent.images
          .filter((img) => img.url)
          .map((img) => img.url as string)

        const needsUpload = documentContent.images.filter((img) => !img.url && img.data)

        log.info({ needsUpload: needsUpload.length, alreadyUploaded: alreadyUploaded.length }, 'Uploading extracted images')
        if (needsUpload.length > 0 && userId) {
          const uploadResults = await uploadExtractedImages(needsUpload, userId, tempCourseId)
          const freshlyUploaded = uploadResults
            .filter((r) => r.success)
            .map((r) => (r as { url: string }).url)
          docImageUrls = [...alreadyUploaded, ...freshlyUploaded]
        } else {
          docImageUrls = alreadyUploaded
        }

        courseImageUrls = docImageUrls
        log.info({ docImageUrls: docImageUrls.length }, 'Images ready')
      } catch (uploadError) {
        logError('GenerateCourseService:imageUpload', uploadError)
        // Continue without images
      }
    }

    const effectiveDocTitle = supplementaryText
      ? `${title || ''}\n\nAdditional context from student: ${supplementaryText}`.trim()
      : title

    log.info({ title: effectiveDocTitle, intensityMode, sourceType }, 'Generating initial course from document')
    const result = await generateInitialCourse(documentContent, effectiveDocTitle, docImageUrls, userContext, intensityMode)
    generatedCourse = result.generatedCourse
    extractedContent = documentContent.content
    log.info({ lessons: result.generatedCourse.lessons.length, totalLessons: result.totalLessons }, 'Document course generated')

    if (supplementaryText) {
      extractedContent += `\n\n--- Student Notes ---\n${supplementaryText}`
    }

    progressiveMetadata = {
      lessonOutline: result.lessonOutline,
      documentSummary: result.documentSummary,
      totalLessons: result.totalLessons,
      lessonsReady: result.generatedCourse.lessons.length,
    }
  } else if (urls.length === 1) {
    courseImageUrls = urls
    const effectiveTitle = supplementaryText
      ? `${title || ''}\n\nAdditional context from student: ${supplementaryText}`.trim()
      : title

    log.info({ url: urls[0], title: effectiveTitle, intensityMode }, 'Generating course from single image')
    const result = await generateCourseFromImage(urls[0], effectiveTitle, userContext, intensityMode)
    generatedCourse = result.generatedCourse
    extractedContent = result.extractionRawText
    log.info({ lessons: result.generatedCourse.lessons.length }, 'Single-image course generated')

    if (supplementaryText) {
      extractedContent += `\n\n--- Student Notes ---\n${supplementaryText}`
    }
  } else {
    courseImageUrls = urls
    const effectiveTitle = supplementaryText
      ? `${title || ''}\n\nAdditional context from student: ${supplementaryText}`.trim()
      : title

    log.info({ urlCount: urls.length, title: effectiveTitle, intensityMode }, 'Generating course from multiple images (progressive)')
    const result = await generateCourseFromMultipleImagesProgressive(urls, effectiveTitle, userContext, intensityMode)
    generatedCourse = result.generatedCourse
    extractedContent = result.extractionRawText
    log.info({ lessons: result.generatedCourse.lessons.length, totalLessons: result.totalLessons }, 'Multi-image course generated')

    if (supplementaryText) {
      extractedContent += `\n\n--- Student Notes ---\n${supplementaryText}`
    }

    progressiveMetadata = {
      lessonOutline: result.lessonOutline,
      documentSummary: result.documentSummary,
      totalLessons: result.totalLessons,
      lessonsReady: result.generatedCourse.lessons.length,
    }
  }

  log.info({ sourceType, lessonsReady: generatedCourse.lessons?.length }, 'Course generation complete')

  return {
    generatedCourse,
    extractedContent,
    sourceType,
    courseImageUrls,
    progressiveMetadata,
  }
}
