/**
 * Subject and Topic Detection
 *
 * Detects subject and topic from content using keyword matching.
 * Falls back to simple heuristics rather than AI calls to avoid latency.
 */

import type { StudySystem, SubjectDetectionResult } from './types'
import { loadAvailableSubjects } from './loader'

// =============================================================================
// Subject Detection
// =============================================================================

// Keywords mapped to subjects (case-insensitive)
const SUBJECT_KEYWORDS: Record<string, string[]> = {
  biology: [
    'cell', 'cells', 'dna', 'rna', 'protein', 'enzyme', 'mitosis', 'meiosis',
    'genetics', 'gene', 'chromosome', 'photosynthesis', 'respiration', 'evolution',
    'ecology', 'ecosystem', 'organism', 'bacteria', 'virus', 'membrane',
    'nucleus', 'organelle', 'mitochondria', 'chloroplast', 'ribosome',
    'transcription', 'translation', 'mutation', 'allele', 'phenotype', 'genotype',
    'homeostasis', 'hormone', 'neuron', 'synapse', 'digestion', 'circulation',
    'species', 'biodiversity', 'natural selection', 'adaptation', 'population',
  ],
  chemistry: [
    'atom', 'molecule', 'element', 'compound', 'reaction', 'bond', 'ionic',
    'covalent', 'electron', 'proton', 'neutron', 'orbital', 'oxidation',
    'reduction', 'acid', 'base', 'ph', 'mole', 'concentration', 'equilibrium',
    'enthalpy', 'entropy', 'catalyst', 'organic', 'inorganic', 'polymer',
    'isomer', 'stoichiometry', 'electrochemistry', 'thermodynamics',
    'periodic table', 'valence', 'isotope', 'solution', 'solvent', 'solute',
  ],
  physics: [
    'force', 'energy', 'mass', 'velocity', 'acceleration', 'momentum',
    'gravity', 'electric', 'magnetic', 'wave', 'frequency', 'wavelength',
    'circuit', 'current', 'voltage', 'resistance', 'capacitor', 'inductor',
    'newton', 'joule', 'watt', 'quantum', 'relativity', 'thermodynamics',
    'kinetic', 'potential', 'oscillation', 'interference', 'diffraction',
    'nuclear', 'radioactive', 'photon', 'particle', 'field',
  ],
  mathematics: [
    'equation', 'function', 'derivative', 'integral', 'calculus', 'algebra',
    'geometry', 'trigonometry', 'vector', 'matrix', 'probability', 'statistics',
    'logarithm', 'exponential', 'polynomial', 'quadratic', 'linear',
    'differentiation', 'integration', 'limit', 'series', 'sequence',
    'sine', 'cosine', 'tangent', 'theorem', 'proof', 'graph',
    'coordinate', 'asymptote', 'domain', 'range', 'coefficient',
  ],
  'computer-science': [
    'algorithm', 'data structure', 'programming', 'code', 'variable',
    'function', 'loop', 'array', 'object', 'class', 'inheritance',
    'recursion', 'sorting', 'searching', 'binary', 'database', 'network',
    'cpu', 'memory', 'stack', 'queue', 'tree', 'graph', 'hash',
    'complexity', 'boolean', 'logic gate', 'software', 'hardware',
  ],
  economics: [
    'supply', 'demand', 'market', 'price', 'gdp', 'inflation', 'unemployment',
    'fiscal', 'monetary', 'trade', 'tariff', 'subsidy', 'tax', 'budget',
    'elasticity', 'equilibrium', 'externality', 'monopoly', 'oligopoly',
    'interest rate', 'exchange rate', 'central bank', 'economic growth',
    'microeconomics', 'macroeconomics', 'consumer', 'producer', 'cost',
  ],
  history: [
    'war', 'revolution', 'empire', 'dynasty', 'civilization', 'treaty',
    'democracy', 'dictatorship', 'colonialism', 'independence', 'reform',
    'century', 'era', 'period', 'movement', 'leader', 'battle',
    'cold war', 'world war', 'nationalism', 'industrialization',
  ],
  psychology: [
    'behavior', 'cognition', 'memory', 'learning', 'perception', 'emotion',
    'personality', 'development', 'motivation', 'consciousness', 'mental',
    'therapy', 'disorder', 'brain', 'stimulus', 'response', 'conditioning',
    'freud', 'piaget', 'attachment', 'social', 'cognitive', 'biological',
  ],
  'english-literature': [
    'novel', 'poem', 'poetry', 'drama', 'play', 'character', 'theme',
    'metaphor', 'simile', 'symbolism', 'imagery', 'narrative', 'plot',
    'setting', 'conflict', 'protagonist', 'antagonist', 'genre', 'author',
    'literary', 'analysis', 'interpretation', 'shakespeare', 'verse', 'prose',
  ],
}

// Map base subjects to IB subject IDs
const IB_SUBJECT_MAPPING: Record<string, string> = {
  biology: 'biology',
  chemistry: 'chemistry',
  physics: 'physics',
  mathematics: 'mathematics-aa', // Default to AA
  'computer-science': 'computer-science',
  economics: 'economics',
  history: 'history',
  psychology: 'psychology',
  geography: 'geography',
  'english-literature': 'english-a-literature',
}

// Map base subjects to A-Level subject IDs
const ALEVEL_SUBJECT_MAPPING: Record<string, string> = {
  biology: 'biology',
  chemistry: 'chemistry',
  physics: 'physics',
  mathematics: 'mathematics',
  'computer-science': 'computer-science',
  economics: 'economics',
  history: 'history',
  psychology: 'psychology',
  'english-literature': 'english-literature',
}

// Map base subjects to AP subject IDs
const AP_SUBJECT_MAPPING: Record<string, string> = {
  biology: 'ap-biology',
  chemistry: 'ap-chemistry',
  physics: 'ap-physics-1',
  mathematics: 'ap-calculus-ab',
  'computer-science': 'ap-computer-science-a',
  economics: 'ap-economics-micro',
  history: 'ap-us-history',
  psychology: 'ap-psychology',
}

export async function detectSubjectFromContent(
  content: string,
  system: StudySystem,
  userSubjects: string[] = []
): Promise<SubjectDetectionResult> {
  const normalizedContent = content.toLowerCase()
  const scores: Record<string, { count: number; keywords: string[] }> = {}

  // Score each subject based on keyword matches
  for (const [subject, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
    scores[subject] = { count: 0, keywords: [] }
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
      const matches = normalizedContent.match(regex)
      if (matches) {
        scores[subject].count += matches.length
        scores[subject].keywords.push(keyword)
      }
    }
  }

  // Find the subject with highest score
  let bestSubject: string | null = null
  let bestScore = 0
  let matchedKeywords: string[] = []

  for (const [subject, data] of Object.entries(scores)) {
    if (data.count > bestScore) {
      bestScore = data.count
      bestSubject = subject
      matchedKeywords = data.keywords
    }
  }

  // Calculate confidence (0-1)
  // Higher confidence with more keyword matches and unique keywords
  const confidence = Math.min(1, (bestScore / 10) * (matchedKeywords.length / 5))

  if (!bestSubject || confidence < 0.2) {
    return {
      subject: null,
      confidence: 0,
      detectedTopics: [],
      matchedKeywords: [],
    }
  }

  // Map to system-specific subject ID
  let systemSubjectId: string | null = null

  switch (system) {
    case 'ib':
      systemSubjectId = IB_SUBJECT_MAPPING[bestSubject] || bestSubject
      // If user has specified subjects, try to match with level
      if (userSubjects.length > 0) {
        const matchingUserSubject = userSubjects.find(
          (s) => s.startsWith(systemSubjectId || '') || s.includes(bestSubject)
        )
        if (matchingUserSubject) {
          systemSubjectId = matchingUserSubject
        }
      }
      break
    case 'uk':
      systemSubjectId = ALEVEL_SUBJECT_MAPPING[bestSubject] || bestSubject
      break
    case 'ap':
      systemSubjectId = AP_SUBJECT_MAPPING[bestSubject] || bestSubject
      break
    default:
      systemSubjectId = bestSubject
  }

  return {
    subject: systemSubjectId,
    confidence,
    detectedTopics: [], // TODO: Add topic detection
    matchedKeywords,
  }
}

// =============================================================================
// Topic Detection
// =============================================================================

interface TopicDetectionResult {
  topicId: string | null
  topicName: string | null
  confidence: number
}

// Topic keywords for biology (as an example - can expand for other subjects)
const BIOLOGY_TOPIC_KEYWORDS: Record<string, { id: string; keywords: string[] }> = {
  'Cell Biology': {
    id: '1',
    keywords: ['cell', 'membrane', 'organelle', 'nucleus', 'cytoplasm', 'prokaryote', 'eukaryote'],
  },
  'Molecular Biology': {
    id: '2',
    keywords: ['dna', 'rna', 'protein', 'enzyme', 'metabolism', 'water', 'carbohydrate', 'lipid'],
  },
  Genetics: {
    id: '3',
    keywords: ['gene', 'chromosome', 'allele', 'meiosis', 'inheritance', 'mendel', 'genotype', 'phenotype'],
  },
  Ecology: {
    id: '4',
    keywords: ['ecosystem', 'population', 'community', 'food chain', 'carbon cycle', 'energy flow'],
  },
  'Evolution & Biodiversity': {
    id: '5',
    keywords: ['evolution', 'natural selection', 'species', 'darwin', 'adaptation', 'classification'],
  },
  'Human Physiology': {
    id: '6',
    keywords: ['digestion', 'circulation', 'heart', 'blood', 'respiration', 'lung', 'nerve', 'hormone'],
  },
  'Nucleic Acids': {
    id: '7',
    keywords: ['replication', 'transcription', 'translation', 'codon', 'helicase', 'polymerase'],
  },
  Metabolism: {
    id: '8',
    keywords: ['photosynthesis', 'cellular respiration', 'atp', 'glycolysis', 'krebs', 'electron transport'],
  },
  'Plant Biology': {
    id: '9',
    keywords: ['xylem', 'phloem', 'transpiration', 'stomata', 'root', 'leaf', 'auxin'],
  },
  'Genetics & Evolution': {
    id: '10',
    keywords: ['gene pool', 'speciation', 'hardy-weinberg', 'genetic drift', 'gene flow'],
  },
  'Animal Physiology': {
    id: '11',
    keywords: ['antibody', 'immune', 'muscle', 'movement', 'kidney', 'osmoregulation', 'reproduction'],
  },
}

const CHEMISTRY_TOPIC_KEYWORDS: Record<string, { id: string; keywords: string[] }> = {
  'Stoichiometric Relationships': {
    id: '1',
    keywords: ['mole', 'avogadro', 'mass', 'formula', 'limiting reagent', 'yield'],
  },
  'Atomic Structure': {
    id: '2',
    keywords: ['electron', 'orbital', 'shell', 'ionization energy', 'emission spectrum'],
  },
  Periodicity: {
    id: '3',
    keywords: ['periodic table', 'group', 'period', 'trend', 'electronegativity', 'atomic radius'],
  },
  'Chemical Bonding': {
    id: '4',
    keywords: ['ionic', 'covalent', 'metallic', 'lewis', 'vsepr', 'polarity', 'intermolecular'],
  },
  Energetics: {
    id: '5',
    keywords: ['enthalpy', 'exothermic', 'endothermic', 'hess', 'bond enthalpy', 'calorimetry'],
  },
  'Chemical Kinetics': {
    id: '6',
    keywords: ['rate', 'collision theory', 'activation energy', 'catalyst', 'mechanism'],
  },
  Equilibrium: {
    id: '7',
    keywords: ['equilibrium constant', 'le chatelier', 'dynamic equilibrium', 'kc', 'kp'],
  },
  'Acids and Bases': {
    id: '8',
    keywords: ['ph', 'acid', 'base', 'bronsted', 'buffer', 'titration', 'pka'],
  },
  'Redox Processes': {
    id: '9',
    keywords: ['oxidation', 'reduction', 'electrode', 'electrochemical', 'cell potential'],
  },
  'Organic Chemistry': {
    id: '10',
    keywords: ['alkane', 'alkene', 'alcohol', 'aldehyde', 'ketone', 'carboxylic', 'ester', 'amine'],
  },
}

const PHYSICS_TOPIC_KEYWORDS: Record<string, { id: string; keywords: string[] }> = {
  Measurements: {
    id: '1',
    keywords: ['uncertainty', 'precision', 'accuracy', 'significant figures', 'unit'],
  },
  Mechanics: {
    id: '2',
    keywords: ['motion', 'kinematics', 'force', 'newton', 'momentum', 'impulse', 'work', 'energy', 'power'],
  },
  'Thermal Physics': {
    id: '3',
    keywords: ['temperature', 'heat', 'specific heat', 'latent heat', 'ideal gas', 'thermodynamics'],
  },
  Waves: {
    id: '4',
    keywords: ['wave', 'frequency', 'wavelength', 'amplitude', 'interference', 'diffraction', 'standing wave'],
  },
  'Electricity & Magnetism': {
    id: '5',
    keywords: ['electric field', 'current', 'resistance', 'circuit', 'magnetic', 'induction'],
  },
  'Circular Motion': {
    id: '6',
    keywords: ['centripetal', 'angular', 'circular motion', 'gravitation', 'orbit'],
  },
  'Atomic & Nuclear': {
    id: '7',
    keywords: ['radioactive', 'decay', 'half-life', 'nuclear', 'fission', 'fusion', 'binding energy'],
  },
  'Energy Production': {
    id: '8',
    keywords: ['renewable', 'fossil fuel', 'solar', 'wind', 'nuclear power', 'efficiency'],
  },
}

const SUBJECT_TOPIC_KEYWORDS: Record<string, Record<string, { id: string; keywords: string[] }>> = {
  biology: BIOLOGY_TOPIC_KEYWORDS,
  chemistry: CHEMISTRY_TOPIC_KEYWORDS,
  physics: PHYSICS_TOPIC_KEYWORDS,
}

export async function detectTopicFromContent(
  content: string,
  system: StudySystem,
  subjectId: string
): Promise<TopicDetectionResult> {
  // Normalize subject ID to base subject
  const baseSubject = subjectId.replace(/-(?:hl|sl|aa|ai|aqa|\d+)$/i, '').replace(/^ap-/, '')
  const normalizedContent = content.toLowerCase()

  const topicKeywords = SUBJECT_TOPIC_KEYWORDS[baseSubject]
  if (!topicKeywords) {
    return { topicId: null, topicName: null, confidence: 0 }
  }

  // Score each topic
  const scores: Record<string, number> = {}
  for (const [topicName, data] of Object.entries(topicKeywords)) {
    let score = 0
    for (const keyword of data.keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
      const matches = normalizedContent.match(regex)
      if (matches) {
        score += matches.length
      }
    }
    scores[topicName] = score
  }

  // Find best topic
  let bestTopic: string | null = null
  let bestTopicId: string | null = null
  let bestScore = 0

  for (const [topicName, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score
      bestTopic = topicName
      bestTopicId = topicKeywords[topicName].id
    }
  }

  const confidence = Math.min(1, bestScore / 8)

  return {
    topicId: bestTopicId,
    topicName: bestTopic,
    confidence,
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get all available subjects for a system
 */
export async function getAvailableSubjectsForSystem(system: StudySystem): Promise<string[]> {
  const systemSubjects = await loadAvailableSubjects(system)
  if (!systemSubjects) return []
  return systemSubjects.subjects.map((s) => s.id)
}

/**
 * Validate if a subject ID is valid for a system
 */
export async function isValidSubject(system: StudySystem, subjectId: string): Promise<boolean> {
  const available = await getAvailableSubjectsForSystem(system)
  const baseSubject = subjectId.replace(/-(?:hl|sl)$/i, '')
  return available.some((s) => s === subjectId || s === baseSubject || s.startsWith(baseSubject))
}
