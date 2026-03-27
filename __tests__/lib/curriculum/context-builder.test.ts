/**
 * Tests for curriculum/context-builder.ts
 *
 * Covers: buildCurriculumContext (tiered), formatContextForPrompt,
 *         hasSignificantContext, convenience builders.
 */

// Mock the loader functions
jest.mock('@/lib/curriculum/loader', () => ({
  loadSystemOverview: jest.fn(),
  loadSubjectOverview: jest.fn(),
  loadTopicDetails: jest.fn(),
  loadAvailableSubjects: jest.fn(() => Promise.resolve(null)),
}))

// Mock the subject-detector
jest.mock('@/lib/curriculum/subject-detector', () => ({
  detectSubjectFromContent: jest.fn(() =>
    Promise.resolve({ subject: null, confidence: 0, detectedTopics: [], matchedKeywords: [] })
  ),
  detectTopicFromContent: jest.fn(() =>
    Promise.resolve({ topicId: null, topicName: null, confidence: 0 })
  ),
}))

import {
  buildCurriculumContext,
  formatContextForPrompt,
  hasSignificantContext,
  buildCourseContext,
  buildExamContext,
  buildChatContext,
} from '@/lib/curriculum/context-builder'

import { loadSystemOverview, loadSubjectOverview, loadTopicDetails } from '@/lib/curriculum/loader'
import { detectSubjectFromContent, detectTopicFromContent } from '@/lib/curriculum/subject-detector'
import type { CurriculumContext } from '@/lib/curriculum/types'

const mockLoadSystem = loadSystemOverview as jest.Mock
const mockLoadSubject = loadSubjectOverview as jest.Mock
const mockLoadTopic = loadTopicDetails as jest.Mock
const mockDetectSubject = detectSubjectFromContent as jest.Mock
const mockDetectTopic = detectTopicFromContent as jest.Mock

// Minimal mock data
const MOCK_SYSTEM = {
  id: 'ib',
  name: 'International Baccalaureate',
  description: 'A rigorous pre-university program.',
  grading: { scale: '1-7', passingGrade: '4', descriptions: [] },
  assessmentPhilosophy: 'Holistic assessment approach.',
  keyTerminology: {},
  commandTerms: [
    { term: 'Analyse', definition: 'Break down to identify components' },
    { term: 'Evaluate', definition: 'Make an appraisal' },
  ],
}

const MOCK_SUBJECT = {
  systemId: 'ib',
  subjectId: 'biology',
  name: 'Biology',
  levels: ['SL', 'HL'],
  assessmentComponents: [
    { name: 'Paper 1', weight: 20, duration: '45min', description: 'MCQ', structure: '30 MCQ' },
    { name: 'Paper 2', weight: 40, duration: '2h15min', description: 'Data-based', structure: 'Section A + B' },
  ],
  assessmentObjectives: [
    { id: 'AO1', description: 'Knowledge and understanding', verbs: ['state', 'define'], weight: 30 },
    { id: 'AO2', description: 'Application and analysis', verbs: ['apply', 'analyse'], weight: 40 },
  ],
  topicList: [
    { id: '1', name: 'Cell Biology' },
    { id: '2', name: 'Molecular Biology' },
    { id: '3', name: 'Genetics' },
  ],
}

const MOCK_TOPIC = {
  systemId: 'ib',
  subjectId: 'biology',
  topicId: '1',
  name: 'Cell Biology',
  understandings: ['Cells are the basic unit of life', 'Cell theory states...'],
  applications: ['Microscopy techniques'],
  keyConcepts: [{ term: 'Cell membrane', definition: 'Phospholipid bilayer', importance: 'High' }],
  commonMisconceptions: [{ misconception: 'All cells have a nucleus', correction: 'Prokaryotes do not' }],
  examFocus: {
    frequentlyTested: ['Cell membrane structure'],
    typicalQuestions: ['Describe the structure of...'],
    markingNotes: ['Must mention phospholipid bilayer'],
  },
  connections: [],
}

beforeEach(() => {
  jest.clearAllMocks()
  mockLoadSystem.mockResolvedValue(null)
  mockLoadSubject.mockResolvedValue(null)
  mockLoadTopic.mockResolvedValue(null)
  mockDetectSubject.mockResolvedValue({ subject: null, confidence: 0, detectedTopics: [], matchedKeywords: [] })
  mockDetectTopic.mockResolvedValue({ topicId: null, topicName: null, confidence: 0 })
})

describe('buildCurriculumContext', () => {
  it('returns empty context for general system', async () => {
    const result = await buildCurriculumContext({
      userProfile: { studySystem: 'general' },
      purpose: 'course',
    })
    expect(result.tier1).toBeNull()
    expect(result.tier2).toBeNull()
    expect(result.tier3).toBeNull()
  })

  it('returns empty context for other system', async () => {
    const result = await buildCurriculumContext({
      userProfile: { studySystem: 'other' },
      purpose: 'course',
    })
    expect(result.tier1).toBeNull()
  })

  it('builds tier 1 from system overview', async () => {
    mockLoadSystem.mockResolvedValue(MOCK_SYSTEM)

    const result = await buildCurriculumContext({
      userProfile: { studySystem: 'ib' },
      purpose: 'course',
    })

    expect(result.tier1).not.toBeNull()
    expect(result.tier1).toContain('International Baccalaureate')
    expect(result.metadata.system).toBe('ib')
  })

  it('builds tier 2 when subject is provided', async () => {
    mockLoadSystem.mockResolvedValue(MOCK_SYSTEM)
    mockLoadSubject.mockResolvedValue(MOCK_SUBJECT)

    const result = await buildCurriculumContext({
      userProfile: { studySystem: 'ib', subjects: ['biology'] },
      purpose: 'course',
    })

    expect(result.tier2).not.toBeNull()
    expect(result.tier2).toContain('Biology')
    expect(result.metadata.subject).toBe('biology')
  })

  it('detects subject from content when not provided', async () => {
    mockLoadSystem.mockResolvedValue(MOCK_SYSTEM)
    mockDetectSubject.mockResolvedValue({
      subject: 'biology',
      confidence: 0.8,
      detectedTopics: [],
      matchedKeywords: ['cell', 'dna'],
    })
    mockLoadSubject.mockResolvedValue(MOCK_SUBJECT)

    const result = await buildCurriculumContext({
      userProfile: { studySystem: 'ib' },
      contentSample: 'The cell contains DNA and organelles',
      purpose: 'course',
    })

    expect(result.tier2).not.toBeNull()
    expect(result.metadata.detectedFromContent).toBe(true)
  })

  it('does not detect subject when confidence is too low', async () => {
    mockLoadSystem.mockResolvedValue(MOCK_SYSTEM)
    mockDetectSubject.mockResolvedValue({
      subject: 'biology',
      confidence: 0.3,
      detectedTopics: [],
      matchedKeywords: ['cell'],
    })

    const result = await buildCurriculumContext({
      userProfile: { studySystem: 'ib' },
      contentSample: 'Some cell content',
      purpose: 'course',
    })

    expect(result.tier2).toBeNull()
    expect(result.metadata.detectedFromContent).toBe(false)
  })

  it('builds tier 3 for exam purpose with topic', async () => {
    mockLoadSystem.mockResolvedValue(MOCK_SYSTEM)
    mockLoadSubject.mockResolvedValue(MOCK_SUBJECT)
    mockLoadTopic.mockResolvedValue(MOCK_TOPIC)

    const result = await buildCurriculumContext({
      userProfile: { studySystem: 'ib', subjects: ['biology'] },
      contentSample: 'Cell biology content',
      specificTopic: '1',
      purpose: 'exam',
    })

    expect(result.tier3).not.toBeNull()
    expect(result.tier3).toContain('Cell Biology')
    expect(result.metadata.topic).toBe('1')
  })

  it('skips tier 3 for course purpose (no topic details)', async () => {
    mockLoadSystem.mockResolvedValue(MOCK_SYSTEM)
    mockLoadSubject.mockResolvedValue(MOCK_SUBJECT)

    const result = await buildCurriculumContext({
      userProfile: { studySystem: 'ib', subjects: ['biology'] },
      contentSample: 'Cell biology content',
      specificTopic: '1',
      purpose: 'course',
    })

    // course purpose doesn't build tier 3
    expect(result.tier3).toBeNull()
  })

  it('calculates total token estimate', async () => {
    mockLoadSystem.mockResolvedValue(MOCK_SYSTEM)
    mockLoadSubject.mockResolvedValue(MOCK_SUBJECT)

    const result = await buildCurriculumContext({
      userProfile: { studySystem: 'ib', subjects: ['biology'] },
      purpose: 'course',
    })

    expect(result.metadata.tokenEstimate.total).toBeGreaterThan(0)
    expect(result.metadata.tokenEstimate.total).toBe(
      result.metadata.tokenEstimate.tier1 +
        result.metadata.tokenEstimate.tier2 +
        result.metadata.tokenEstimate.tier3
    )
  })

  it('includes grade in system overview', async () => {
    mockLoadSystem.mockResolvedValue(MOCK_SYSTEM)

    const result = await buildCurriculumContext({
      userProfile: { studySystem: 'ib', grade: 'dp1' },
      purpose: 'course',
    })

    expect(result.tier1).toContain('dp1')
  })

  it('includes raw data when requested', async () => {
    mockLoadSystem.mockResolvedValue(MOCK_SYSTEM)

    const result = await buildCurriculumContext({
      userProfile: { studySystem: 'ib' },
      purpose: 'course',
      includeRawData: true,
    })

    expect(result.raw).toBeDefined()
    expect(result.raw?.system).toBe(MOCK_SYSTEM)
  })
})

describe('formatContextForPrompt', () => {
  it('formats all tiers into a single string', () => {
    const context: CurriculumContext = {
      tier1: 'System info',
      tier2: 'Subject info',
      tier3: 'Topic info',
      metadata: {
        system: 'ib',
        subject: 'biology',
        topic: '1',
        detectedFromContent: false,
        tokenEstimate: { tier1: 10, tier2: 20, tier3: 30, total: 60 },
      },
    }

    const formatted = formatContextForPrompt(context)
    expect(formatted).toContain('## Curriculum System')
    expect(formatted).toContain('System info')
    expect(formatted).toContain('## Subject Requirements')
    expect(formatted).toContain('Subject info')
    expect(formatted).toContain('## Topic Specifics')
    expect(formatted).toContain('Topic info')
  })

  it('omits sections that are null', () => {
    const context: CurriculumContext = {
      tier1: 'System info',
      tier2: null,
      tier3: null,
      metadata: {
        system: 'ib',
        subject: null,
        topic: null,
        detectedFromContent: false,
        tokenEstimate: { tier1: 10, tier2: 0, tier3: 0, total: 10 },
      },
    }

    const formatted = formatContextForPrompt(context)
    expect(formatted).toContain('## Curriculum System')
    expect(formatted).not.toContain('## Subject Requirements')
    expect(formatted).not.toContain('## Topic Specifics')
  })

  it('returns empty string when all tiers are null', () => {
    const context: CurriculumContext = {
      tier1: null,
      tier2: null,
      tier3: null,
      metadata: {
        system: 'general',
        subject: null,
        topic: null,
        detectedFromContent: false,
        tokenEstimate: { tier1: 0, tier2: 0, tier3: 0, total: 0 },
      },
    }

    expect(formatContextForPrompt(context)).toBe('')
  })
})

describe('hasSignificantContext', () => {
  it('returns true when tier1 is set', () => {
    const context: CurriculumContext = {
      tier1: 'System data',
      tier2: null,
      tier3: null,
      metadata: {
        system: 'ib',
        subject: null,
        topic: null,
        detectedFromContent: false,
        tokenEstimate: { tier1: 10, tier2: 0, tier3: 0, total: 10 },
      },
    }
    expect(hasSignificantContext(context)).toBe(true)
  })

  it('returns true when tier2 is set', () => {
    const context: CurriculumContext = {
      tier1: null,
      tier2: 'Subject data',
      tier3: null,
      metadata: {
        system: 'ib',
        subject: 'biology',
        topic: null,
        detectedFromContent: false,
        tokenEstimate: { tier1: 0, tier2: 20, tier3: 0, total: 20 },
      },
    }
    expect(hasSignificantContext(context)).toBe(true)
  })

  it('returns false when all tiers are null', () => {
    const context: CurriculumContext = {
      tier1: null,
      tier2: null,
      tier3: null,
      metadata: {
        system: 'general',
        subject: null,
        topic: null,
        detectedFromContent: false,
        tokenEstimate: { tier1: 0, tier2: 0, tier3: 0, total: 0 },
      },
    }
    expect(hasSignificantContext(context)).toBe(false)
  })
})

describe('convenience builders', () => {
  it('buildCourseContext calls buildCurriculumContext with course purpose', async () => {
    mockLoadSystem.mockResolvedValue(MOCK_SYSTEM)

    const result = await buildCourseContext('ib', ['biology'], 'cell content', 'dp1')
    // Should have tier1 at minimum
    expect(result.tier1).not.toBeNull()
    expect(result.metadata.system).toBe('ib')
  })

  it('buildExamContext calls with exam purpose', async () => {
    mockLoadSystem.mockResolvedValue(MOCK_SYSTEM)
    mockLoadSubject.mockResolvedValue(MOCK_SUBJECT)

    const result = await buildExamContext('ib', ['biology'], { biology: 'HL' }, 'match_real')
    expect(result.tier1).not.toBeNull()
    expect(result.metadata.system).toBe('ib')
  })

  it('buildChatContext calls with chat purpose', async () => {
    mockLoadSystem.mockResolvedValue(MOCK_SYSTEM)

    const result = await buildChatContext('ib', ['biology'], 'cell division', 'dp2')
    expect(result.tier1).not.toBeNull()
    expect(result.metadata.system).toBe('ib')
  })

  it('buildCourseContext returns empty for general system', async () => {
    const result = await buildCourseContext('general')
    expect(result.tier1).toBeNull()
    expect(result.tier2).toBeNull()
  })
})
