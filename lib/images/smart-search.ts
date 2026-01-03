/**
 * Smart Image Search Logic
 *
 * Determines when to include images in courses, exams, and practice
 * based on subject matter, user context, and past exam patterns.
 */

import type { ImageAnalysis, DiagramType } from '@/types/past-exam'
import { searchEducationalImages, type SearchedImage } from './search'

// =============================================================================
// Types
// =============================================================================

export interface ImageSearchContext {
  /** Course or exam title */
  title: string
  /** Subject area (biology, chemistry, etc.) */
  subject: string
  /** Topics covered */
  topics: string[]
  /** Whether past exams contain images */
  pastExamHasImages: boolean
  /** Image analysis from past exams */
  pastExamImageAnalysis?: ImageAnalysis
  /** Visual keywords mentioned by user */
  userMentionedVisuals: string[]
  /** User's exam description */
  examDescription?: string
}

export interface SmartImageResult {
  /** Whether images should be included */
  shouldInclude: boolean
  /** Reason for the decision */
  reason: string
  /** Suggested search queries */
  searchQueries: string[]
  /** Diagram types to look for */
  diagramTypes: DiagramType[]
  /** Whether labeling questions are appropriate */
  suggestLabelingQuestions: boolean
}

// =============================================================================
// Constants
// =============================================================================

/** Subjects that inherently benefit from visual learning */
const VISUAL_SUBJECTS = [
  'biology',
  'anatomy',
  'physiology',
  'chemistry',
  'organic chemistry',
  'biochemistry',
  'physics',
  'geography',
  'geology',
  'astronomy',
  'botany',
  'zoology',
  'histology',
  'microbiology',
  'genetics',
  'ecology',
  'environmental science',
  'earth science',
  'art',
  'art history',
  'architecture',
  'design',
  'engineering',
  'electronics',
  'circuit design',
  'computer architecture',
  'anatomy and physiology',
  'cell biology',
  'molecular biology',
]

/** Keywords that indicate visual learning needs */
const VISUAL_KEYWORDS = [
  'diagram',
  'structure',
  'label',
  'identify',
  'picture',
  'image',
  'illustration',
  'chart',
  'graph',
  'map',
  'circuit',
  'anatomy',
  'cell',
  'organ',
  'molecule',
  'compound',
  'parts',
  'components',
  'layers',
  'cycle',
  'process',
  'flow',
  'pathway',
  'system',
  'model',
  'schematic',
  'cross-section',
  'microscope',
  'specimen',
]

/** Subjects that typically don't need images */
const NON_VISUAL_SUBJECTS = [
  'philosophy',
  'literature',
  'creative writing',
  'linguistics',
  'grammar',
  'pure mathematics',
  'abstract algebra',
  'number theory',
  'logic',
  'ethics',
  'metaphysics',
  'theology',
  'law',
  'jurisprudence',
]

/** Map diagram types to search query modifiers */
const DIAGRAM_TYPE_QUERIES: Record<DiagramType, string[]> = {
  cell_diagram: ['cell structure diagram', 'cell anatomy labeled', 'cellular organelles'],
  anatomy: ['anatomy diagram labeled', 'anatomical illustration', 'body parts diagram'],
  graph: ['data graph', 'scientific graph', 'chart visualization'],
  chart: ['educational chart', 'comparison chart', 'infographic'],
  map: ['educational map', 'labeled map', 'geographic map'],
  circuit: ['circuit diagram', 'electrical schematic', 'circuit layout'],
  molecular_structure: ['molecular structure', 'molecule diagram', 'chemical structure'],
  flow_diagram: ['flow diagram', 'process flow', 'flowchart'],
  timeline: ['timeline diagram', 'historical timeline', 'chronological chart'],
  process_diagram: ['process diagram', 'cycle diagram', 'step by step illustration'],
  labeled_illustration: ['labeled diagram', 'educational illustration', 'annotated image'],
  other: ['educational diagram', 'scientific illustration', 'labeled image'],
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Determine whether images should be included based on context
 */
export function shouldIncludeImages(context: ImageSearchContext): SmartImageResult {
  const {
    title,
    subject,
    topics,
    pastExamHasImages,
    pastExamImageAnalysis,
    userMentionedVisuals,
    examDescription,
  } = context

  // Combine all text for keyword analysis
  const allText = [
    title,
    subject,
    ...topics,
    examDescription || '',
    ...userMentionedVisuals,
  ].join(' ').toLowerCase()

  // Check conditions in priority order
  const reasons: string[] = []
  let shouldInclude = false
  let suggestLabelingQuestions = false
  const diagramTypes: DiagramType[] = []
  const searchQueries: string[] = []

  // 1. Past exam has images - highest priority
  if (pastExamHasImages || pastExamImageAnalysis?.has_diagrams) {
    shouldInclude = true
    reasons.push('Past exam contains diagrams/images')

    if (pastExamImageAnalysis) {
      diagramTypes.push(...pastExamImageAnalysis.diagram_types)
      searchQueries.push(...pastExamImageAnalysis.suggested_image_queries)
      suggestLabelingQuestions = pastExamImageAnalysis.requires_labeling
    }
  }

  // 2. User explicitly mentioned visual content
  if (userMentionedVisuals.length > 0) {
    shouldInclude = true
    reasons.push('User mentioned visual content: ' + userMentionedVisuals.join(', '))

    // Generate search queries from user mentions
    userMentionedVisuals.forEach(mention => {
      searchQueries.push(mention + ' diagram educational')
      searchQueries.push(mention + ' labeled illustration')
    })
  }

  // 3. Check for visual keywords in exam description
  const foundKeywords = VISUAL_KEYWORDS.filter(keyword => allText.includes(keyword))
  if (foundKeywords.length > 0) {
    shouldInclude = true
    reasons.push('Visual keywords detected: ' + foundKeywords.slice(0, 5).join(', '))

    // Determine diagram types from keywords
    if (foundKeywords.some(k => ['cell', 'organelle', 'mitochondria', 'nucleus'].includes(k))) {
      diagramTypes.push('cell_diagram')
    }
    if (foundKeywords.some(k => ['anatomy', 'organ', 'body', 'skeleton', 'muscle'].includes(k))) {
      diagramTypes.push('anatomy')
    }
    if (foundKeywords.some(k => ['molecule', 'compound', 'atom', 'bond'].includes(k))) {
      diagramTypes.push('molecular_structure')
    }
    if (foundKeywords.some(k => ['circuit', 'wire', 'resistor', 'capacitor'].includes(k))) {
      diagramTypes.push('circuit')
    }
    if (foundKeywords.some(k => ['label', 'identify', 'parts', 'components'].includes(k))) {
      suggestLabelingQuestions = true
    }
  }

  // 4. Subject is inherently visual
  const isVisualSubject = VISUAL_SUBJECTS.some(vs =>
    subject.toLowerCase().includes(vs) || vs.includes(subject.toLowerCase())
  )
  if (isVisualSubject) {
    shouldInclude = true
    reasons.push('Subject "' + subject + '" typically benefits from visual learning')

    // Add subject-specific diagram types
    if (subject.toLowerCase().includes('bio') || subject.toLowerCase().includes('anatomy')) {
      if (!diagramTypes.includes('cell_diagram')) diagramTypes.push('cell_diagram')
      if (!diagramTypes.includes('anatomy')) diagramTypes.push('anatomy')
    }
    if (subject.toLowerCase().includes('chem')) {
      if (!diagramTypes.includes('molecular_structure')) diagramTypes.push('molecular_structure')
    }
    if (subject.toLowerCase().includes('geo')) {
      if (!diagramTypes.includes('map')) diagramTypes.push('map')
    }
    if (subject.toLowerCase().includes('physics') || subject.toLowerCase().includes('circuit')) {
      if (!diagramTypes.includes('circuit')) diagramTypes.push('circuit')
    }
  }

  // 5. Check if subject explicitly doesn't need images
  const isNonVisualSubject = NON_VISUAL_SUBJECTS.some(nvs =>
    subject.toLowerCase().includes(nvs) || nvs.includes(subject.toLowerCase())
  )
  if (isNonVisualSubject && !pastExamHasImages && userMentionedVisuals.length === 0) {
    shouldInclude = false
    reasons.length = 0
    reasons.push('Subject "' + subject + '" typically does not require visual content')
  }

  // Generate search queries based on topics and diagram types
  if (shouldInclude && searchQueries.length === 0) {
    topics.forEach(topic => {
      searchQueries.push(topic + ' diagram educational')
      if (diagramTypes.length > 0) {
        const typeQueries = DIAGRAM_TYPE_QUERIES[diagramTypes[0]] || []
        typeQueries.forEach(tq => searchQueries.push(topic + ' ' + tq))
      }
    })
  }

  // Deduplicate
  const uniqueQueries = [...new Set(searchQueries)].slice(0, 10)
  const uniqueDiagramTypes = [...new Set(diagramTypes)]

  return {
    shouldInclude,
    reason: reasons.join('; ') || 'No visual content indicators found',
    searchQueries: uniqueQueries,
    diagramTypes: uniqueDiagramTypes,
    suggestLabelingQuestions,
  }
}

/**
 * Extract visual keywords from user text
 */
export function extractVisualKeywords(text: string): string[] {
  const lowercaseText = text.toLowerCase()
  return VISUAL_KEYWORDS.filter(keyword => lowercaseText.includes(keyword))
}

/**
 * Detect if user description mentions visual content
 */
export function detectVisualContentMentions(description: string): string[] {
  const mentions: string[] = []

  // Check for explicit visual mentions with patterns
  const labelPattern = /(?:label|identify|name)\s+(?:the\s+)?(?:parts|components|structures?|organs?|cells?)/gi
  const diagramPattern = /(?:diagram|chart|graph|map|illustration|image|picture)\s+of\s+(\w+(?:\s+\w+)?)/gi
  const structurePattern = /(?:know|understand|learn)\s+(?:the\s+)?(?:structure|anatomy|parts)\s+of\s+(\w+)/gi

  let match
  while ((match = labelPattern.exec(description)) !== null) {
    if (match[0] && !mentions.includes(match[0])) {
      mentions.push(match[0].trim())
    }
  }
  while ((match = diagramPattern.exec(description)) !== null) {
    const captured = match[1] || match[0]
    if (captured && !mentions.includes(captured)) {
      mentions.push(captured.trim())
    }
  }
  while ((match = structurePattern.exec(description)) !== null) {
    const captured = match[1] || match[0]
    if (captured && !mentions.includes(captured)) {
      mentions.push(captured.trim())
    }
  }

  // Also check for visual keywords
  const keywords = extractVisualKeywords(description)
  keywords.forEach(kw => {
    if (!mentions.includes(kw)) {
      mentions.push(kw)
    }
  })

  return mentions.slice(0, 10) // Limit to 10 mentions
}

/**
 * Smart search for images based on context
 * Only searches if context indicates images are needed
 */
export async function smartSearchImages(
  context: ImageSearchContext
): Promise<{ images: SearchedImage[]; decision: SmartImageResult }> {
  const decision = shouldIncludeImages(context)

  if (!decision.shouldInclude) {
    return { images: [], decision }
  }

  // Search using the generated queries
  const images: SearchedImage[] = []
  const queriesUsed = new Set<string>()

  for (const query of decision.searchQueries.slice(0, 3)) {
    if (queriesUsed.has(query)) continue
    queriesUsed.add(query)

    try {
      const results = await searchEducationalImages(query, context.subject)
      if (results.length > 0) {
        images.push(...results.slice(0, 2))
      }

      // Stop if we have enough images
      if (images.length >= 5) break
    } catch (error) {
      console.error('Failed to search for "' + query + '":', error)
    }
  }

  // Deduplicate by URL
  const uniqueImages = images.filter((img, idx, arr) =>
    arr.findIndex(i => i.url === img.url) === idx
  )

  return { images: uniqueImages.slice(0, 5), decision }
}

/**
 * Get image search queries for a specific topic based on past exam patterns
 */
export function getTopicImageQueries(
  topic: string,
  pastExamAnalysis?: ImageAnalysis
): string[] {
  const queries: string[] = []

  // Base query
  queries.push(topic + ' diagram educational')
  queries.push(topic + ' labeled illustration')

  // If we have past exam analysis, use the diagram types
  if (pastExamAnalysis?.diagram_types.length) {
    pastExamAnalysis.diagram_types.forEach(type => {
      const typeQueries = DIAGRAM_TYPE_QUERIES[type] || []
      typeQueries.slice(0, 2).forEach(tq => {
        queries.push(topic + ' ' + tq)
      })
    })
  }

  return [...new Set(queries)].slice(0, 5)
}

/**
 * Filter images for quality (educational relevance)
 */
export function filterEducationalImages(images: SearchedImage[]): SearchedImage[] {
  return images.filter(img => {
    // Minimum dimensions for educational use
    if (img.width < 600 || img.height < 400) return false

    // Prefer landscape for diagrams
    const aspectRatio = img.width / img.height
    if (aspectRatio < 0.5) return false // Too tall/narrow

    // Check alt text for educational indicators
    const alt = img.alt.toLowerCase()
    const educationalTerms = [
      'diagram', 'chart', 'illustration', 'labeled',
      'anatomy', 'structure', 'cell', 'process',
      'educational', 'science', 'biology', 'chemistry',
    ]
    const hasEducationalIndicators = educationalTerms.some(indicator => alt.includes(indicator))

    // Filter out likely stock photos of people
    const stockPhotoTerms = [
      'person', 'people', 'man', 'woman', 'student', 'teacher',
      'business', 'office', 'meeting', 'team', 'group',
    ]
    const likelyStockPhoto = stockPhotoTerms.some(term => alt.includes(term))

    // Accept if educational or not a stock photo
    return hasEducationalIndicators || !likelyStockPhoto
  })
}
