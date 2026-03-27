/**
 * Tests for curriculum/subject-detector.ts
 *
 * Covers: detectSubjectFromContent for various subjects & systems,
 *         detectTopicFromContent for biology/chemistry/physics topics.
 */

// Mock the curriculum loader (not needed for keyword detection)
jest.mock('@/lib/curriculum/loader', () => ({
  loadAvailableSubjects: jest.fn(() => Promise.resolve(null)),
}))

import { detectSubjectFromContent, detectTopicFromContent } from '@/lib/curriculum/subject-detector'
import type { StudySystem } from '@/lib/curriculum/types'

describe('detectSubjectFromContent', () => {
  // ── Math detection ──

  it('detects mathematics from equation/calculus content', async () => {
    const content = 'Find the derivative of the quadratic function f(x) = x^2 + 3x. Use calculus to solve the integral.'
    const result = await detectSubjectFromContent(content, 'ib')
    expect(result.subject).toContain('mathematics')
    expect(result.confidence).toBeGreaterThan(0)
    expect(result.matchedKeywords.length).toBeGreaterThan(0)
  })

  // ── Biology detection ──

  it('detects biology from cell/DNA content', async () => {
    const content = 'The cell membrane contains dna and chromosomes. Mitosis and meiosis are forms of cell division. The gene encodes protein.'
    const result = await detectSubjectFromContent(content, 'ib')
    expect(result.subject).toBe('biology')
    expect(result.confidence).toBeGreaterThan(0)
  })

  it('detects biology with many keywords', async () => {
    const content = 'Photosynthesis occurs in the chloroplast. The mitochondria provides energy through respiration. Evolution drives natural selection and adaptation in the ecosystem.'
    const result = await detectSubjectFromContent(content, 'ib')
    expect(result.subject).toBe('biology')
    expect(result.matchedKeywords).toContain('photosynthesis')
  })

  // ── Chemistry detection ──

  it('detects chemistry from atomic/reaction content', async () => {
    const content = 'The atom has electrons in orbitals. The ionic bond forms between a cation and anion. The reaction produces a compound. Oxidation and reduction occur at the electrode.'
    const result = await detectSubjectFromContent(content, 'ib')
    expect(result.subject).toBe('chemistry')
  })

  // ── Physics detection ──

  it('detects physics from force/energy content', async () => {
    const content = 'The force equals mass times acceleration. Kinetic energy is converted to potential energy. The wave has frequency and wavelength. The circuit has current and resistance.'
    const result = await detectSubjectFromContent(content, 'ib')
    expect(result.subject).toBe('physics')
  })

  // ── Economics detection ──

  it('detects economics from market/trade content', async () => {
    const content = 'Supply and demand determine the market price. GDP measures economic output. Inflation erodes purchasing power. The elasticity of demand affects consumer behavior.'
    const result = await detectSubjectFromContent(content, 'ib')
    expect(result.subject).toBe('economics')
  })

  // ── System mapping (IB, A-Level, AP) ──

  it('maps biology to IB subject ID', async () => {
    const content = 'DNA replication involves helicase and polymerase enzymes. Transcription and translation produce protein from gene sequences.'
    const result = await detectSubjectFromContent(content, 'ib')
    expect(result.subject).toBe('biology')
  })

  it('maps physics to AP subject ID (ap-physics-1)', async () => {
    const content = 'Force and acceleration follow Newton\'s second law. Energy and momentum are conserved in the system.'
    const result = await detectSubjectFromContent(content, 'ap')
    expect(result.subject).toBe('ap-physics-1')
  })

  it('maps chemistry to A-Level subject ID', async () => {
    const content = 'Enthalpy changes in exothermic reactions. Electron configuration and orbital theory. The equilibrium constant Kc.'
    const result = await detectSubjectFromContent(content, 'uk')
    expect(result.subject).toBe('chemistry')
  })

  it('maps economics to general subject for unknown system', async () => {
    const content = 'Supply and demand equilibrium. Market price determination. GDP and inflation analysis. Fiscal policy and monetary policy.'
    const result = await detectSubjectFromContent(content, 'general')
    expect(result.subject).toBe('economics')
  })

  // ── Low confidence / no match ──

  it('returns null for unrelated content', async () => {
    const content = 'The weather is nice today. I like cooking pasta for dinner.'
    const result = await detectSubjectFromContent(content, 'ib')
    expect(result.subject).toBeNull()
    expect(result.confidence).toBe(0)
  })

  it('returns null for very short content', async () => {
    const content = 'hi'
    const result = await detectSubjectFromContent(content, 'ib')
    expect(result.subject).toBeNull()
  })

  // ── User subjects preference ──

  it('prefers user-specified subjects when matching (IB)', async () => {
    const content = 'The cell membrane controls what enters and exits the cell. DNA replication occurs during mitosis.'
    const result = await detectSubjectFromContent(content, 'ib', ['biology-hl'])
    // Should match to the user's specified 'biology-hl'
    expect(result.subject).toBe('biology-hl')
  })
})

describe('detectTopicFromContent', () => {
  // ── Biology topics ──

  it('detects Cell Biology topic', async () => {
    const content = 'The cell membrane and organelles like the nucleus and cytoplasm are essential for eukaryote function.'
    const result = await detectTopicFromContent(content, 'ib', 'biology')
    expect(result.topicName).toBe('Cell Biology')
    expect(result.topicId).toBe('1')
  })

  it('detects Genetics topic', async () => {
    const content = 'The gene and chromosome carry alleles. Meiosis produces gametes with different genotype and phenotype combinations. Mendel\'s inheritance patterns.'
    const result = await detectTopicFromContent(content, 'ib', 'biology')
    expect(result.topicName).toBe('Genetics')
    expect(result.topicId).toBe('3')
  })

  it('detects Ecology topic', async () => {
    const content = 'The ecosystem contains interacting populations in a community. Energy flow through the food chain follows the carbon cycle.'
    const result = await detectTopicFromContent(content, 'ib', 'biology')
    expect(result.topicName).toBe('Ecology')
    expect(result.topicId).toBe('4')
  })

  // ── Chemistry topics ──

  it('detects Chemical Bonding topic', async () => {
    const content = 'Ionic and covalent bonds form between atoms. Lewis structures show electron sharing. VSEPR theory predicts molecular polarity and intermolecular forces.'
    const result = await detectTopicFromContent(content, 'ib', 'chemistry')
    expect(result.topicName).toBe('Chemical Bonding')
    expect(result.topicId).toBe('4')
  })

  it('detects Acids and Bases topic', async () => {
    const content = 'pH measures the acid and base strength. Bronsted acid donates a proton. Buffer solutions resist pH changes. Titration determines concentration and pKa.'
    const result = await detectTopicFromContent(content, 'ib', 'chemistry')
    expect(result.topicName).toBe('Acids and Bases')
    expect(result.topicId).toBe('8')
  })

  // ── Physics topics ──

  it('detects Mechanics topic', async () => {
    const content = 'The force and Newton\'s laws describe motion and kinematics. Momentum and impulse relate to energy and work done on the object.'
    const result = await detectTopicFromContent(content, 'ib', 'physics')
    expect(result.topicName).toBe('Mechanics')
    expect(result.topicId).toBe('2')
  })

  // ── Unknown subject ──

  it('returns null for unsupported subject', async () => {
    const content = 'Some content about history and wars'
    const result = await detectTopicFromContent(content, 'ib', 'history')
    expect(result.topicId).toBeNull()
    expect(result.topicName).toBeNull()
    expect(result.confidence).toBe(0)
  })

  // ── IB subject ID with level suffix ──

  it('strips level suffix to find base subject', async () => {
    const content = 'The cell membrane and organelles. DNA and chromosome replication in the nucleus. Prokaryote vs eukaryote.'
    const result = await detectTopicFromContent(content, 'ib', 'biology-hl')
    expect(result.topicName).toBe('Cell Biology')
  })

  it('strips AP prefix to find base subject', async () => {
    const content = 'Force and Newton laws. Motion and kinematics. Energy and momentum conservation.'
    const result = await detectTopicFromContent(content, 'ap', 'ap-physics')
    expect(result.topicName).toBe('Mechanics')
  })
})
