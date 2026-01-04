/**
 * Tests for Past Exam Style Guide Builder
 * Verifies that style guides are correctly built from past exam templates
 */

import {
  buildExamStyleGuide,
  hasCompletedAnalysis,
  pastExamsHaveImages,
  getAggregatedImageAnalysis,
} from '@/lib/past-exams/style-guide'
import {
  mockExamAnalysis,
  mockEssayExamAnalysis,
  mockNoImagesAnalysis,
  mockHighEasyAnalysis,
  mockPastExamTemplates,
  mockSingleTemplate,
  mockTemplatesNoImages,
  mockTemplatesHighEasy,
  emptyPastExamTemplates,
  mockPendingTemplates,
} from '../../fixtures/mock-past-exams'
import type { PastExamTemplate } from '@/types/past-exam'

describe('buildExamStyleGuide', () => {
  describe('with no templates', () => {
    it('returns empty string for empty array', () => {
      const result = buildExamStyleGuide([])
      expect(result).toBe('')
    })

    it('returns empty string for templates with no analysis', () => {
      const templates = [
        { title: 'Test', extracted_analysis: null },
        { title: 'Test 2', extracted_analysis: undefined },
      ]
      const result = buildExamStyleGuide(templates as unknown as Pick<PastExamTemplate, 'extracted_analysis' | 'title'>[])
      expect(result).toBe('')
    })
  })

  describe('with single template', () => {
    it('includes question type distribution', () => {
      const result = buildExamStyleGuide(mockSingleTemplate as Pick<PastExamTemplate, 'extracted_analysis' | 'title'>[])

      expect(result).toContain('Question Type Distribution')
      expect(result).toContain('Multiple Choice')
      expect(result).toContain('60%')
      expect(result).toContain('Short Answer')
      expect(result).toContain('20%')
      expect(result).toContain('Essay')
    })

    it('includes difficulty distribution', () => {
      const result = buildExamStyleGuide(mockSingleTemplate as Pick<PastExamTemplate, 'extracted_analysis' | 'title'>[])

      expect(result).toContain('Difficulty Distribution')
      expect(result).toContain('Easy: 30%')
      expect(result).toContain('Medium: 50%')
      expect(result).toContain('Hard: 20%')
    })

    it('includes point values', () => {
      const result = buildExamStyleGuide(mockSingleTemplate as Pick<PastExamTemplate, 'extracted_analysis' | 'title'>[])

      expect(result).toContain('Point Values')
      expect(result).toContain('Common point values')
      expect(result).toContain('1, 2, 4, 8')
    })

    it('includes command terms', () => {
      const result = buildExamStyleGuide(mockSingleTemplate as Pick<PastExamTemplate, 'extracted_analysis' | 'title'>[])

      expect(result).toContain('command terms')
      expect(result).toContain('Define')
      expect(result).toContain('Explain')
      expect(result).toContain('Compare')
      expect(result).toContain('Evaluate')
    })

    it('includes Bloom taxonomy levels', () => {
      const result = buildExamStyleGuide(mockSingleTemplate as Pick<PastExamTemplate, 'extracted_analysis' | 'title'>[])

      expect(result).toContain('Bloom\'s Taxonomy')
      expect(result).toContain('Remember/Recall')
      expect(result).toContain('Understand')
      expect(result).toContain('Apply')
      expect(result).toContain('Analyze')
      expect(result).toContain('Evaluate')
      expect(result).toContain('Create')
    })

    it('includes scenario guidance when uses_scenarios is true', () => {
      const result = buildExamStyleGuide(mockSingleTemplate as Pick<PastExamTemplate, 'extracted_analysis' | 'title'>[])

      expect(result).toContain('real-world scenarios')
    })

    it('includes sample questions when available', () => {
      const result = buildExamStyleGuide(mockSingleTemplate as Pick<PastExamTemplate, 'extracted_analysis' | 'title'>[])

      expect(result).toContain('Sample Question Styles')
      expect(result).toContain('multiple_choice')
      expect(result).toContain('short_answer')
      expect(result).toContain('essay')
    })
  })

  describe('with image/diagram analysis', () => {
    it('includes diagram guidance when exams have images', () => {
      const result = buildExamStyleGuide(mockSingleTemplate as Pick<PastExamTemplate, 'extracted_analysis' | 'title'>[])

      expect(result).toContain('Diagram/Image Questions')
      expect(result).toContain('Past exams contain')
      expect(result).toContain('diagrams/images')
    })

    it('includes diagram types', () => {
      const result = buildExamStyleGuide(mockSingleTemplate as Pick<PastExamTemplate, 'extracted_analysis' | 'title'>[])

      expect(result).toContain('Diagram types used')
      expect(result).toContain('cell_diagram')
    })

    it('includes labeling information', () => {
      const result = buildExamStyleGuide(mockSingleTemplate as Pick<PastExamTemplate, 'extracted_analysis' | 'title'>[])

      expect(result).toContain('LABEL parts of diagrams')
      expect(result).toContain('Labeling style')
    })

    it('includes diagram topics', () => {
      const result = buildExamStyleGuide(mockSingleTemplate as Pick<PastExamTemplate, 'extracted_analysis' | 'title'>[])

      expect(result).toContain('Diagram topics')
      expect(result).toContain('cell structure')
    })

    it('recommends generating image_label questions', () => {
      const result = buildExamStyleGuide(mockSingleTemplate as Pick<PastExamTemplate, 'extracted_analysis' | 'title'>[])

      expect(result).toContain('GENERATE image_label questions')
    })

    it('does not include diagram guidance when exams have no images', () => {
      const result = buildExamStyleGuide(mockTemplatesNoImages as Pick<PastExamTemplate, 'extracted_analysis' | 'title'>[])

      expect(result).not.toContain('Diagram/Image Questions')
      expect(result).not.toContain('GENERATE image_label questions')
    })
  })

  describe('with multiple templates', () => {
    it('aggregates question type percentages', () => {
      const result = buildExamStyleGuide(mockPastExamTemplates as Pick<PastExamTemplate, 'extracted_analysis' | 'title'>[])

      // Should have aggregated values
      expect(result).toContain('Question Type Distribution')
      expect(result).toContain('%')
    })

    it('aggregates difficulty distributions', () => {
      const result = buildExamStyleGuide(mockPastExamTemplates as Pick<PastExamTemplate, 'extracted_analysis' | 'title'>[])

      expect(result).toContain('Easy:')
      expect(result).toContain('Medium:')
      expect(result).toContain('Hard:')
    })

    it('combines command terms from all templates', () => {
      const result = buildExamStyleGuide(mockPastExamTemplates as Pick<PastExamTemplate, 'extracted_analysis' | 'title'>[])

      // Should include terms from both templates
      expect(result).toContain('Define')
      expect(result).toContain('Discuss')
    })

    it('combines point values from all templates', () => {
      const result = buildExamStyleGuide(mockPastExamTemplates as Pick<PastExamTemplate, 'extracted_analysis' | 'title'>[])

      expect(result).toContain('Common point values')
    })
  })

  describe('special distributions', () => {
    it('reflects high easy difficulty (70%)', () => {
      const result = buildExamStyleGuide(mockTemplatesHighEasy as Pick<PastExamTemplate, 'extracted_analysis' | 'title'>[])

      expect(result).toContain('Easy: 70%')
      expect(result).toContain('Medium: 20%')
      expect(result).toContain('Hard: 10%')
    })

    it('handles essay-only exams', () => {
      const templates = [
        { title: 'Essay Exam', extracted_analysis: mockEssayExamAnalysis },
      ]
      const result = buildExamStyleGuide(templates as Pick<PastExamTemplate, 'extracted_analysis' | 'title'>[])

      expect(result).toContain('Essay')
      expect(result).toContain('100%')
    })
  })

  describe('style guide format', () => {
    it('includes header and footer markers', () => {
      const result = buildExamStyleGuide(mockSingleTemplate as Pick<PastExamTemplate, 'extracted_analysis' | 'title'>[])

      expect(result).toContain('=== EXAM STYLE GUIDE')
      expect(result).toContain('=== END STYLE GUIDE ===')
    })

    it('includes importance instruction', () => {
      const result = buildExamStyleGuide(mockSingleTemplate as Pick<PastExamTemplate, 'extracted_analysis' | 'title'>[])

      expect(result).toContain('IMPORTANT')
      expect(result).toContain('closely match the style')
    })

    it('includes FOLLOW THIS CLOSELY instruction for question types', () => {
      const result = buildExamStyleGuide(mockSingleTemplate as Pick<PastExamTemplate, 'extracted_analysis' | 'title'>[])

      expect(result).toContain('FOLLOW THIS CLOSELY')
    })
  })
})

describe('hasCompletedAnalysis', () => {
  it('returns true when at least one template has completed analysis', () => {
    const templates = [
      { analysis_status: 'completed' as const, extracted_analysis: mockExamAnalysis },
      { analysis_status: 'pending' as const, extracted_analysis: null },
    ]
    expect(hasCompletedAnalysis(templates)).toBe(true)
  })

  it('returns false when no templates have completed analysis', () => {
    expect(hasCompletedAnalysis(mockPendingTemplates as Pick<PastExamTemplate, 'analysis_status' | 'extracted_analysis'>[])).toBe(false)
  })

  it('returns false for empty array', () => {
    expect(hasCompletedAnalysis([])).toBe(false)
  })

  it('returns false when status is completed but analysis is null', () => {
    const templates = [
      { analysis_status: 'completed' as const, extracted_analysis: null },
    ]
    expect(hasCompletedAnalysis(templates)).toBe(false)
  })
})

describe('pastExamsHaveImages', () => {
  it('returns true when image_analysis.has_diagrams is true', () => {
    const templates = [
      { extracted_analysis: mockExamAnalysis },
    ]
    expect(pastExamsHaveImages(templates)).toBe(true)
  })

  it('returns true when question_style.uses_diagrams is true', () => {
    const templates = [
      {
        extracted_analysis: {
          ...mockNoImagesAnalysis,
          question_style: { ...mockNoImagesAnalysis.question_style, uses_diagrams: true },
        },
      },
    ]
    expect(pastExamsHaveImages(templates)).toBe(true)
  })

  it('returns false when no images in any template', () => {
    expect(pastExamsHaveImages(mockTemplatesNoImages as Pick<PastExamTemplate, 'extracted_analysis'>[])).toBe(false)
  })

  it('returns false for empty array', () => {
    expect(pastExamsHaveImages([])).toBe(false)
  })

  it('returns false when extracted_analysis is null', () => {
    const templates = [
      { extracted_analysis: null },
    ]
    expect(pastExamsHaveImages(templates as Pick<PastExamTemplate, 'extracted_analysis'>[])).toBe(false)
  })
})

describe('getAggregatedImageAnalysis', () => {
  it('returns aggregated image analysis from multiple templates', () => {
    const templates = [
      { extracted_analysis: mockExamAnalysis },
      { extracted_analysis: mockExamAnalysis },
    ]
    const result = getAggregatedImageAnalysis(templates)

    expect(result).toBeDefined()
    expect(result?.has_diagrams).toBe(true)
    expect(result?.diagram_types).toContain('cell_diagram')
    expect(result?.diagram_topics.length).toBeGreaterThan(0)
  })

  it('returns undefined when no templates have image analysis', () => {
    const templates = [
      { extracted_analysis: null },
    ]
    const result = getAggregatedImageAnalysis(templates as Pick<PastExamTemplate, 'extracted_analysis'>[])

    expect(result).toBeUndefined()
  })

  it('returns empty diagram info when has_diagrams is false in all', () => {
    const result = getAggregatedImageAnalysis(mockTemplatesNoImages as Pick<PastExamTemplate, 'extracted_analysis'>[])

    expect(result).toBeDefined()
    expect(result?.has_diagrams).toBe(false)
    expect(result?.diagram_count).toBe(0)
  })

  it('aggregates labeling style from multiple templates', () => {
    const templates = [
      { extracted_analysis: mockExamAnalysis },
    ]
    const result = getAggregatedImageAnalysis(templates)

    expect(result?.labeling_style).toBe('fill_blank')
    expect(result?.typical_label_count).toBe(5)
  })

  it('combines suggested image queries from all templates', () => {
    const templates = [
      { extracted_analysis: mockExamAnalysis },
    ]
    const result = getAggregatedImageAnalysis(templates)

    expect(result?.suggested_image_queries).toContain('cell diagram labeled')
    expect(result?.suggested_image_queries).toContain('heart anatomy diagram')
  })
})
