/**
 * Extraction Confidence Scoring System
 *
 * Addresses the 24.8% extraction accuracy challenge by scoring
 * extraction quality and flagging low-confidence areas.
 */

import { createClient } from '@/lib/supabase/client'

// =============================================================================
// Types
// =============================================================================

export interface ExtractionConfidence {
  overall: number // 0-1 overall confidence score

  // Component confidence scores
  textConfidence: number // Text extraction quality
  structureConfidence: number // Document structure detection
  formulaConfidence: number // Mathematical formula extraction
  diagramConfidence: number // Diagram/image analysis

  // Low confidence areas for user review
  lowConfidenceAreas: LowConfidenceArea[]

  // Metadata
  extractionMethod: 'ocr' | 'pdf_parse' | 'vision' | 'hybrid'
  processingTimeMs: number
  contentLength: number
  pageCount?: number
}

export interface LowConfidenceArea {
  sectionIndex?: number
  stepIndex?: number
  contentType: 'text' | 'formula' | 'diagram' | 'structure' | 'other'
  location: string // Human-readable location
  reason: string // Why confidence is low
  suggestion: string // Suggested action
  originalContent?: string // The extracted content
  confidence: number // 0-1
}

export interface ExtractionFeedback {
  id?: string
  courseId: string
  userId: string
  sectionIndex?: number
  stepIndex?: number
  contentType: 'text' | 'formula' | 'diagram' | 'structure' | 'other'
  feedbackType: 'incorrect' | 'unclear' | 'missing' | 'garbled' | 'wrong_order' | 'other'
  originalContent?: string
  userCorrection?: string
  additionalNotes?: string
  status?: 'pending' | 'reviewed' | 'applied' | 'dismissed'
  createdAt?: Date
}

export interface ExtractionQualityReport {
  courseId: string
  overallScore: number
  componentScores: {
    text: number
    structure: number
    formulas: number
    diagrams: number
  }
  issueCount: number
  feedbackCount: number
  qualityTrend: 'improving' | 'stable' | 'declining'
  recommendations: string[]
}

// =============================================================================
// Confidence Scoring
// =============================================================================

/**
 * Configuration for confidence scoring
 */
const CONFIDENCE_CONFIG = {
  // Minimum word count thresholds
  minWordsForHighConfidence: 50,
  minWordsForMediumConfidence: 20,

  // Text quality indicators
  garbledTextPatterns: [
    /[^\x00-\x7F]{5,}/, // Long sequences of non-ASCII
    /(\w)\1{4,}/, // Repeated characters (aaaa)
    /[?]{3,}/, // Multiple question marks (OCR artifacts)
    /[■□▪▫]{2,}/, // Box characters (failed rendering)
  ],

  // Structure indicators
  goodStructurePatterns: [
    /^#{1,6}\s/, // Markdown headers
    /^\d+\.\s/, // Numbered lists
    /^[-*•]\s/, // Bullet points
  ],

  // Formula indicators
  formulaPatterns: [
    /\$.*\$/, // LaTeX inline
    /\\\[.*\\\]/, // LaTeX display
    /[a-z]\s*=\s*[^=]/i, // Variable assignments
    /\d+\s*[+\-*/÷×]\s*\d+/, // Basic arithmetic
  ],

  // Weights for overall score
  weights: {
    text: 0.4,
    structure: 0.2,
    formula: 0.2,
    diagram: 0.2,
  },
}

/**
 * Scores extraction confidence for given content
 */
export function scoreExtraction(
  extractedContent: string,
  metadata: {
    hasFormulas?: boolean
    hasDiagrams?: boolean
    pageCount?: number
    extractionMethod: ExtractionConfidence['extractionMethod']
    processingTimeMs: number
  }
): ExtractionConfidence {
  const lowConfidenceAreas: LowConfidenceArea[] = []

  // Score text confidence
  const textConfidence = scoreTextConfidence(extractedContent, lowConfidenceAreas)

  // Score structure confidence
  const structureConfidence = scoreStructureConfidence(extractedContent, lowConfidenceAreas)

  // Score formula confidence
  const formulaConfidence = metadata.hasFormulas
    ? scoreFormulaConfidence(extractedContent, lowConfidenceAreas)
    : 1.0 // Full confidence if no formulas expected

  // Score diagram confidence
  const diagramConfidence = metadata.hasDiagrams
    ? scoreDiagramConfidence(extractedContent, lowConfidenceAreas)
    : 1.0 // Full confidence if no diagrams expected

  // Calculate overall score
  const { weights } = CONFIDENCE_CONFIG
  const overall =
    textConfidence * weights.text +
    structureConfidence * weights.structure +
    formulaConfidence * weights.formula +
    diagramConfidence * weights.diagram

  return {
    overall: Number(overall.toFixed(2)),
    textConfidence: Number(textConfidence.toFixed(2)),
    structureConfidence: Number(structureConfidence.toFixed(2)),
    formulaConfidence: Number(formulaConfidence.toFixed(2)),
    diagramConfidence: Number(diagramConfidence.toFixed(2)),
    lowConfidenceAreas,
    extractionMethod: metadata.extractionMethod,
    processingTimeMs: metadata.processingTimeMs,
    contentLength: extractedContent.length,
    pageCount: metadata.pageCount,
  }
}

/**
 * Scores text extraction confidence
 */
function scoreTextConfidence(
  content: string,
  lowConfidenceAreas: LowConfidenceArea[]
): number {
  let score = 1.0
  const words = content.split(/\s+/).filter(w => w.length > 0)

  // Check word count
  if (words.length < CONFIDENCE_CONFIG.minWordsForMediumConfidence) {
    score -= 0.3
    lowConfidenceAreas.push({
      contentType: 'text',
      location: 'Overall content',
      reason: 'Very short extracted content',
      suggestion: 'Verify that all text was captured from the source',
      confidence: 0.5,
    })
  } else if (words.length < CONFIDENCE_CONFIG.minWordsForHighConfidence) {
    score -= 0.1
  }

  // Check for garbled text patterns
  for (const pattern of CONFIDENCE_CONFIG.garbledTextPatterns) {
    const matches = content.match(pattern)
    if (matches) {
      score -= 0.15
      lowConfidenceAreas.push({
        contentType: 'text',
        location: 'Text content',
        reason: 'Potential OCR artifacts or garbled text detected',
        suggestion: 'Review text for accuracy and correct any garbled sections',
        originalContent: matches[0].substring(0, 50),
        confidence: 0.4,
      })
      break // Only penalize once
    }
  }

  // Check for very long words (potential OCR errors)
  const longWords = words.filter(w => w.length > 25 && !/^https?:\/\//.test(w))
  if (longWords.length > 0) {
    score -= 0.1
    lowConfidenceAreas.push({
      contentType: 'text',
      location: 'Word boundaries',
      reason: 'Unusually long words detected (possible missing spaces)',
      suggestion: 'Check for words that may have been merged together',
      originalContent: longWords[0],
      confidence: 0.6,
    })
  }

  return Math.max(0, score)
}

/**
 * Scores structure detection confidence
 */
function scoreStructureConfidence(
  content: string,
  lowConfidenceAreas: LowConfidenceArea[]
): number {
  let score = 0.5 // Start neutral

  const lines = content.split('\n').filter(l => l.trim().length > 0)

  // Check for good structure patterns
  let structuredLines = 0
  for (const line of lines) {
    for (const pattern of CONFIDENCE_CONFIG.goodStructurePatterns) {
      if (pattern.test(line.trim())) {
        structuredLines++
        break
      }
    }
  }

  const structureRatio = lines.length > 0 ? structuredLines / lines.length : 0

  if (structureRatio > 0.3) {
    score = 0.9 // Good structure
  } else if (structureRatio > 0.1) {
    score = 0.7 // Some structure
  } else {
    score = 0.5 // Little structure detected
    lowConfidenceAreas.push({
      contentType: 'structure',
      location: 'Document structure',
      reason: 'Limited structural markers detected',
      suggestion: 'Verify document hierarchy (headings, lists) was captured correctly',
      confidence: 0.5,
    })
  }

  return score
}

/**
 * Scores formula extraction confidence
 */
function scoreFormulaConfidence(
  content: string,
  lowConfidenceAreas: LowConfidenceArea[]
): number {
  let score = 1.0

  // Count formula patterns
  let formulaCount = 0
  for (const pattern of CONFIDENCE_CONFIG.formulaPatterns) {
    const matches = content.match(new RegExp(pattern, 'g'))
    if (matches) {
      formulaCount += matches.length
    }
  }

  if (formulaCount === 0) {
    score = 0.5
    lowConfidenceAreas.push({
      contentType: 'formula',
      location: 'Mathematical content',
      reason: 'No formulas detected in content expected to have formulas',
      suggestion: 'Check if mathematical formulas were properly extracted',
      confidence: 0.5,
    })
  }

  // Check for common formula extraction issues
  const brokenFormulaPatterns = [
    /\$\s*\$/, // Empty LaTeX
    /\\\[\s*\\\]/, // Empty display math
    /_{[^}]*$/, // Unclosed subscript
    /\^{[^}]*$/, // Unclosed superscript
  ]

  for (const pattern of brokenFormulaPatterns) {
    if (pattern.test(content)) {
      score -= 0.2
      lowConfidenceAreas.push({
        contentType: 'formula',
        location: 'Formula syntax',
        reason: 'Potentially broken formula syntax detected',
        suggestion: 'Review formulas for completeness and proper formatting',
        confidence: 0.4,
      })
      break
    }
  }

  return Math.max(0, score)
}

/**
 * Scores diagram extraction confidence
 */
function scoreDiagramConfidence(
  content: string,
  lowConfidenceAreas: LowConfidenceArea[]
): number {
  // Check for diagram descriptions
  const diagramIndicators = [
    /diagram|figure|chart|graph|illustration/i,
    /\[image\]/i,
    /shows?|depicts?|illustrates?/i,
  ]

  let hasDescription = false
  for (const pattern of diagramIndicators) {
    if (pattern.test(content)) {
      hasDescription = true
      break
    }
  }

  if (!hasDescription) {
    lowConfidenceAreas.push({
      contentType: 'diagram',
      location: 'Visual content',
      reason: 'No diagram descriptions found in content expected to have diagrams',
      suggestion: 'Verify that diagram descriptions and labels were captured',
      confidence: 0.5,
    })
    return 0.5
  }

  return 0.8 // Moderate confidence with descriptions
}

// =============================================================================
// Feedback Management
// =============================================================================

/**
 * Records user feedback on extraction quality
 */
export async function recordExtractionFeedback(
  feedback: Omit<ExtractionFeedback, 'id' | 'status' | 'createdAt'>
): Promise<{ success: boolean; feedbackId?: string; error?: string }> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('extraction_feedback')
      .insert({
        course_id: feedback.courseId,
        user_id: feedback.userId,
        section_index: feedback.sectionIndex,
        step_index: feedback.stepIndex,
        content_type: feedback.contentType,
        feedback_type: feedback.feedbackType,
        original_content: feedback.originalContent,
        user_correction: feedback.userCorrection,
        additional_notes: feedback.additionalNotes,
      })
      .select('id')
      .single()

    if (error) throw error

    return { success: true, feedbackId: data.id }
  } catch (error) {
    console.error('Error recording extraction feedback:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Gets extraction feedback for a course
 */
export async function getExtractionFeedback(
  courseId: string,
  status?: ExtractionFeedback['status']
): Promise<ExtractionFeedback[]> {
  try {
    const supabase = createClient()

    let query = supabase
      .from('extraction_feedback')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return (data || []).map(row => ({
      id: row.id,
      courseId: row.course_id,
      userId: row.user_id,
      sectionIndex: row.section_index,
      stepIndex: row.step_index,
      contentType: row.content_type,
      feedbackType: row.feedback_type,
      originalContent: row.original_content,
      userCorrection: row.user_correction,
      additionalNotes: row.additional_notes,
      status: row.status,
      createdAt: new Date(row.created_at),
    }))
  } catch (error) {
    console.error('Error fetching extraction feedback:', error)
    return []
  }
}

/**
 * Updates feedback status
 */
export async function updateFeedbackStatus(
  feedbackId: string,
  status: ExtractionFeedback['status']
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from('extraction_feedback')
      .update({
        status,
        reviewed_at: status !== 'pending' ? new Date().toISOString() : null,
      })
      .eq('id', feedbackId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error updating feedback status:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// =============================================================================
// Quality Reports
// =============================================================================

/**
 * Generates extraction quality report for a course
 */
export async function generateQualityReport(
  courseId: string
): Promise<ExtractionQualityReport | null> {
  try {
    const supabase = createClient()

    // Get course extraction metadata
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('extraction_confidence, extraction_metadata')
      .eq('id', courseId)
      .single()

    if (courseError || !course) return null

    const confidence = course.extraction_confidence || 0
    const metadata = course.extraction_metadata as ExtractionConfidence | null

    // Get feedback count
    const { count: feedbackCount } = await supabase
      .from('extraction_feedback')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)

    // Get pending issues count
    const { count: issueCount } = await supabase
      .from('extraction_feedback')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('status', 'pending')

    // Generate recommendations
    const recommendations: string[] = []

    if (confidence < 0.7) {
      recommendations.push('Consider re-processing the document with a different extraction method')
    }

    if (metadata?.textConfidence && metadata.textConfidence < 0.6) {
      recommendations.push('Review extracted text for accuracy - OCR quality may be low')
    }

    if (metadata?.formulaConfidence && metadata.formulaConfidence < 0.6) {
      recommendations.push('Mathematical formulas may need manual verification')
    }

    if ((feedbackCount || 0) > 5) {
      recommendations.push('Multiple user corrections suggest source quality issues')
    }

    return {
      courseId,
      overallScore: confidence,
      componentScores: {
        text: metadata?.textConfidence || 0,
        structure: metadata?.structureConfidence || 0,
        formulas: metadata?.formulaConfidence || 0,
        diagrams: metadata?.diagramConfidence || 0,
      },
      issueCount: issueCount || 0,
      feedbackCount: feedbackCount || 0,
      qualityTrend: 'stable', // Would need historical data
      recommendations,
    }
  } catch (error) {
    console.error('Error generating quality report:', error)
    return null
  }
}

// =============================================================================
// Export
// =============================================================================

const confidenceScorer = {
  scoreExtraction,
  recordExtractionFeedback,
  getExtractionFeedback,
  updateFeedbackStatus,
  generateQualityReport,
}

export default confidenceScorer
