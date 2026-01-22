/**
 * Style Guide Builder
 * Converts past exam analysis into a prompt context for exam generation
 */

import type { ExamAnalysis, PastExamTemplate, QuestionTypeKey, ImageAnalysis, DiagramType, LabelingStyle } from '@/types/past-exam'

/**
 * Aggregate analyses from multiple past exam templates
 */
function aggregateAnalyses(analyses: ExamAnalysis[]): ExamAnalysis {
  if (analyses.length === 0) {
    throw new Error('No analyses to aggregate')
  }

  if (analyses.length === 1) {
    return analyses[0]
  }

  // Average numerical values
  const avgTotalQuestions = Math.round(
    analyses.reduce((sum, a) => sum + a.total_questions, 0) / analyses.length
  )
  const avgTotalPoints = Math.round(
    analyses.reduce((sum, a) => sum + a.total_points, 0) / analyses.length
  )

  // Aggregate question types (average percentages)
  const allQuestionTypes = new Set<QuestionTypeKey>()
  analyses.forEach((a) => {
    Object.keys(a.question_types).forEach((k) => allQuestionTypes.add(k as QuestionTypeKey))
  })

  const questionTypes: Partial<Record<QuestionTypeKey, { count: number; percentage: number; avg_points: number }>> = {}
  allQuestionTypes.forEach((type) => {
    const typesWithThisType = analyses.filter((a) => a.question_types[type])
    if (typesWithThisType.length > 0) {
      questionTypes[type] = {
        count: Math.round(
          typesWithThisType.reduce((sum, a) => sum + (a.question_types[type]?.count || 0), 0) /
            typesWithThisType.length
        ),
        percentage: Math.round(
          typesWithThisType.reduce((sum, a) => sum + (a.question_types[type]?.percentage || 0), 0) /
            typesWithThisType.length
        ),
        avg_points: Math.round(
          typesWithThisType.reduce((sum, a) => sum + (a.question_types[type]?.avg_points || 0), 0) /
            typesWithThisType.length * 10
        ) / 10,
      }
    }
  })

  // Normalize percentages to sum to 100
  const totalPercentage = Object.values(questionTypes).reduce((sum, t) => sum + t.percentage, 0)
  if (totalPercentage > 0 && totalPercentage !== 100) {
    const scale = 100 / totalPercentage
    Object.values(questionTypes).forEach((t) => {
      t.percentage = Math.round(t.percentage * scale)
    })
  }

  // Average difficulty distribution
  const difficulty = {
    easy: Math.round(analyses.reduce((sum, a) => sum + a.difficulty_distribution.easy, 0) / analyses.length),
    medium: Math.round(analyses.reduce((sum, a) => sum + a.difficulty_distribution.medium, 0) / analyses.length),
    hard: Math.round(analyses.reduce((sum, a) => sum + a.difficulty_distribution.hard, 0) / analyses.length),
  }
  // Ensure sums to 100
  const diffTotal = difficulty.easy + difficulty.medium + difficulty.hard
  if (diffTotal !== 100) {
    difficulty.hard = 100 - difficulty.easy - difficulty.medium
  }

  // Aggregate point distribution
  const allCommonValues = new Set<number>()
  analyses.forEach((a) => a.point_distribution.common_values.forEach((v) => allCommonValues.add(v)))

  // Aggregate command terms (union)
  const allCommandTerms = new Set<string>()
  analyses.forEach((a) => a.question_style.command_terms.forEach((t) => allCommandTerms.add(t)))

  // Average Bloom levels
  const bloom = {
    remember: Math.round(analyses.reduce((sum, a) => sum + a.question_style.bloom_levels.remember, 0) / analyses.length),
    understand: Math.round(analyses.reduce((sum, a) => sum + a.question_style.bloom_levels.understand, 0) / analyses.length),
    apply: Math.round(analyses.reduce((sum, a) => sum + a.question_style.bloom_levels.apply, 0) / analyses.length),
    analyze: Math.round(analyses.reduce((sum, a) => sum + a.question_style.bloom_levels.analyze, 0) / analyses.length),
    evaluate: Math.round(analyses.reduce((sum, a) => sum + a.question_style.bloom_levels.evaluate, 0) / analyses.length),
    create: Math.round(analyses.reduce((sum, a) => sum + a.question_style.bloom_levels.create, 0) / analyses.length),
  }
  // Ensure sums to 100
  const bloomTotal = Object.values(bloom).reduce((a, b) => a + b, 0)
  if (bloomTotal !== 100) {
    bloom.create = 100 - bloom.remember - bloom.understand - bloom.apply - bloom.analyze - bloom.evaluate
  }

  // Combine sample questions (take first 2 from each)
  const sampleQuestions = analyses.flatMap((a) => a.sample_questions.slice(0, 2)).slice(0, 6)

  // Aggregate image analysis
  const imageAnalysis = aggregateImageAnalyses(analyses.map((a) => a.image_analysis).filter((ia): ia is ImageAnalysis => !!ia))

  return {
    total_questions: avgTotalQuestions,
    total_points: avgTotalPoints,
    time_estimate_minutes: analyses.find((a) => a.time_estimate_minutes)?.time_estimate_minutes || null,
    question_types: questionTypes,
    difficulty_distribution: difficulty,
    point_distribution: {
      min_points: Math.min(...analyses.map((a) => a.point_distribution.min_points)),
      max_points: Math.max(...analyses.map((a) => a.point_distribution.max_points)),
      avg_points: Math.round(
        analyses.reduce((sum, a) => sum + a.point_distribution.avg_points, 0) / analyses.length * 10
      ) / 10,
      common_values: Array.from(allCommonValues).sort((a, b) => a - b),
    },
    structure_patterns: {
      has_sections: analyses.some((a) => a.structure_patterns.has_sections),
      section_count: Math.round(
        analyses.reduce((sum, a) => sum + a.structure_patterns.section_count, 0) / analyses.length
      ),
      sections: analyses[0].structure_patterns.sections, // Use first template's sections as reference
      has_instructions: analyses.some((a) => a.structure_patterns.has_instructions),
      instruction_style: analyses.find((a) => a.structure_patterns.instruction_style)?.structure_patterns.instruction_style,
    },
    grading_patterns: {
      partial_credit_allowed: analyses.some((a) => a.grading_patterns.partial_credit_allowed),
      rubric_style: analyses[0].grading_patterns.rubric_style,
      common_point_values: Array.from(allCommonValues).sort((a, b) => a - b),
      bonus_questions: analyses.some((a) => a.grading_patterns.bonus_questions),
    },
    question_style: {
      avg_question_length_words: Math.round(
        analyses.reduce((sum, a) => sum + a.question_style.avg_question_length_words, 0) / analyses.length
      ),
      uses_scenarios: analyses.some((a) => a.question_style.uses_scenarios),
      uses_diagrams: analyses.some((a) => a.question_style.uses_diagrams),
      uses_calculations: analyses.some((a) => a.question_style.uses_calculations),
      command_terms: Array.from(allCommandTerms),
      bloom_levels: bloom,
    },
    sample_questions: sampleQuestions,
    image_analysis: imageAnalysis,
  }
}

/**
 * Aggregate image analyses from multiple exams
 */
function aggregateImageAnalyses(imageAnalyses: ImageAnalysis[]): ImageAnalysis | undefined {
  if (imageAnalyses.length === 0) {
    return undefined
  }

  // Check if any exam has diagrams
  const hasDiagrams = imageAnalyses.some((ia) => ia.has_diagrams)
  if (!hasDiagrams) {
    return {
      has_diagrams: false,
      diagram_count: 0,
      diagram_types: [],
      diagram_topics: [],
      labeling_style: null,
      typical_label_count: 0,
      requires_labeling: false,
      suggested_image_queries: [],
    }
  }

  // Aggregate diagram types (union)
  const allDiagramTypes = new Set<DiagramType>()
  imageAnalyses.forEach((ia) => ia.diagram_types.forEach((dt) => allDiagramTypes.add(dt)))

  // Aggregate diagram topics (union)
  const allDiagramTopics = new Set<string>()
  imageAnalyses.forEach((ia) => ia.diagram_topics.forEach((dt) => allDiagramTopics.add(dt)))

  // Aggregate suggested queries (union, limit to 10)
  const allQueries = new Set<string>()
  imageAnalyses.forEach((ia) => ia.suggested_image_queries.forEach((q) => allQueries.add(q)))

  // Find most common labeling style
  const labelingStyles = imageAnalyses
    .map((ia) => ia.labeling_style)
    .filter((style): style is LabelingStyle => style !== undefined && style !== null)
  const labelingStyleCounts = labelingStyles.reduce((acc, style) => {
    acc[style] = (acc[style] || 0) + 1
    return acc
  }, {} as Record<LabelingStyle, number>)
  const mostCommonLabelingStyle = Object.entries(labelingStyleCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] as LabelingStyle | undefined

  // Average diagram count and label count
  const avgDiagramCount = Math.round(
    imageAnalyses.reduce((sum, ia) => sum + ia.diagram_count, 0) / imageAnalyses.length
  )
  const avgLabelCount = Math.round(
    imageAnalyses.reduce((sum, ia) => sum + ia.typical_label_count, 0) / imageAnalyses.length
  )

  return {
    has_diagrams: true,
    diagram_count: avgDiagramCount,
    diagram_types: Array.from(allDiagramTypes),
    diagram_topics: Array.from(allDiagramTopics).slice(0, 10),
    labeling_style: mostCommonLabelingStyle || null,
    typical_label_count: avgLabelCount,
    requires_labeling: imageAnalyses.some((ia) => ia.requires_labeling),
    suggested_image_queries: Array.from(allQueries).slice(0, 10),
  }
}

/**
 * Format question type distribution for the style guide
 */
function formatQuestionTypeDistribution(
  questionTypes: ExamAnalysis['question_types']
): string {
  const typeNames: Record<QuestionTypeKey, string> = {
    multiple_choice: 'Multiple Choice',
    true_false: 'True/False',
    fill_blank: 'Fill in the Blank',
    short_answer: 'Short Answer',
    matching: 'Matching',
    ordering: 'Ordering/Sequence',
    essay: 'Essay',
    passage_based: 'Passage-Based',
    image_label: 'Image Labeling',
  }

  return Object.entries(questionTypes)
    .filter(([, data]) => data.percentage > 0)
    .map(([type, data]) => `- ${typeNames[type as QuestionTypeKey]}: ${data.percentage}% (~${data.avg_points} points each)`)
    .join('\n')
}

/**
 * Format sample questions for the style guide
 */
function formatSampleQuestions(questions: ExamAnalysis['sample_questions']): string {
  if (questions.length === 0) {
    return 'No sample questions available.'
  }

  return questions
    .slice(0, 4)
    .map((q, i) => `${i + 1}. [${q.type}, ${q.difficulty}, ${q.points}pts] "${q.text.slice(0, 100)}${q.text.length > 100 ? '...' : ''}"`)
    .join('\n')
}

/**
 * Build an exam style guide from past exam templates
 * This guide is included in the exam generation prompt
 */
export function buildExamStyleGuide(
  templates: Pick<PastExamTemplate, 'extracted_analysis' | 'title'>[]
): string {
  // Filter to only completed analyses
  const analyses = templates
    .map((t) => t.extracted_analysis)
    .filter((analysis): analysis is ExamAnalysis => analysis !== null && analysis !== undefined)

  if (analyses.length === 0) {
    return ''
  }

  // Aggregate if multiple templates
  const aggregated = aggregateAnalyses(analyses)

  // Build the style guide
  const lines: string[] = [
    '=== EXAM STYLE GUIDE (from user\'s past exams) ===',
    '',
    'The user has provided past exams. Generate questions that CLOSELY MATCH these patterns:',
    '',
    '**Question Type Distribution (FOLLOW THIS CLOSELY):**',
    formatQuestionTypeDistribution(aggregated.question_types),
    '',
    '**Difficulty Distribution:**',
    `- Easy: ${aggregated.difficulty_distribution.easy}%`,
    `- Medium: ${aggregated.difficulty_distribution.medium}%`,
    `- Hard: ${aggregated.difficulty_distribution.hard}%`,
    '',
    '**Point Values:**',
    `- Common point values: ${aggregated.point_distribution.common_values.join(', ')}`,
    `- Average points per question: ${aggregated.point_distribution.avg_points}`,
    '',
    '**Question Style:**',
    `- Average question length: ~${aggregated.question_style.avg_question_length_words} words`,
  ]

  if (aggregated.question_style.command_terms.length > 0) {
    lines.push(`- Use these command terms: ${aggregated.question_style.command_terms.slice(0, 8).join(', ')}`)
  }

  if (aggregated.question_style.uses_scenarios) {
    lines.push('- Include real-world scenarios and contexts in questions')
  }

  if (aggregated.question_style.uses_calculations) {
    lines.push('- Include calculation-based questions where appropriate')
  }

  // Add image/diagram guidance if past exams use them
  if (aggregated.image_analysis?.has_diagrams) {
    lines.push('')
    lines.push('**Diagram/Image Questions (IMPORTANT - Past exams include these):**')
    lines.push(`- Past exams contain ${aggregated.image_analysis.diagram_count || 'some'} diagrams/images`)

    if (aggregated.image_analysis.diagram_types.length > 0) {
      lines.push(`- Diagram types used: ${aggregated.image_analysis.diagram_types.join(', ')}`)
    }

    if (aggregated.image_analysis.requires_labeling) {
      lines.push('- Exams require students to LABEL parts of diagrams')
      if (aggregated.image_analysis.labeling_style) {
        const styleDescriptions: Record<string, string> = {
          'drag_drop': 'Students drag labels to correct positions',
          'fill_blank': 'Students fill in blank labels on diagrams',
          'multiple_choice': 'Students select correct labels from options',
          'point_and_identify': 'Students identify labeled parts',
        }
        lines.push(`- Labeling style: ${styleDescriptions[aggregated.image_analysis.labeling_style] || aggregated.image_analysis.labeling_style}`)
      }
      if (aggregated.image_analysis.typical_label_count > 0) {
        lines.push(`- Typical number of labels per diagram: ${aggregated.image_analysis.typical_label_count}`)
      }
    }

    if (aggregated.image_analysis.diagram_topics.length > 0) {
      lines.push(`- Diagram topics: ${aggregated.image_analysis.diagram_topics.slice(0, 5).join(', ')}`)
    }

    lines.push('- GENERATE image_label questions when appropriate for visual content')
  }

  lines.push('')
  lines.push('**Cognitive Levels (Bloom\'s Taxonomy):**')
  lines.push(`- Remember/Recall: ${aggregated.question_style.bloom_levels.remember}%`)
  lines.push(`- Understand: ${aggregated.question_style.bloom_levels.understand}%`)
  lines.push(`- Apply: ${aggregated.question_style.bloom_levels.apply}%`)
  lines.push(`- Analyze: ${aggregated.question_style.bloom_levels.analyze}%`)
  lines.push(`- Evaluate: ${aggregated.question_style.bloom_levels.evaluate}%`)
  lines.push(`- Create: ${aggregated.question_style.bloom_levels.create}%`)

  if (aggregated.sample_questions.length > 0) {
    lines.push('')
    lines.push('**Sample Question Styles (mimic these formats):**')
    lines.push(formatSampleQuestions(aggregated.sample_questions))
  }

  lines.push('')
  lines.push('IMPORTANT: Generate questions that closely match the style, difficulty, and format of these past exams.')
  lines.push('=== END STYLE GUIDE ===')
  lines.push('')

  return lines.join('\n')
}

/**
 * Check if any templates have completed analysis
 */
export function hasCompletedAnalysis(
  templates: Pick<PastExamTemplate, 'analysis_status' | 'extracted_analysis'>[]
): boolean {
  return templates.some(
    (t) => t.analysis_status === 'completed' && t.extracted_analysis !== null
  )
}

/**
 * Check if past exams contain images/diagrams
 */
export function pastExamsHaveImages(
  templates: Pick<PastExamTemplate, 'extracted_analysis'>[]
): boolean {
  return templates.some(
    (t) => t.extracted_analysis?.image_analysis?.has_diagrams ||
           t.extracted_analysis?.question_style?.uses_diagrams
  )
}

/**
 * Get aggregated image analysis from past exam templates
 */
export function getAggregatedImageAnalysis(
  templates: Pick<PastExamTemplate, 'extracted_analysis'>[]
): ImageAnalysis | undefined {
  const imageAnalyses = templates
    .map((t) => t.extracted_analysis?.image_analysis)
    .filter((analysis): analysis is ImageAnalysis => analysis !== undefined && analysis !== null)

  return aggregateImageAnalyses(imageAnalyses)
}
