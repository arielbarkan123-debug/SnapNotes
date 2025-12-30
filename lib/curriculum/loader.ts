/**
 * Curriculum Data Loader
 *
 * Handles lazy-loading of curriculum JSON files with caching.
 * All curriculum data is server-side only.
 */

import type {
  StudySystem,
  SystemOverview,
  SubjectOverview,
  TopicDetails,
  SystemSubjects,
  AvailableSubject,
} from './types'

// =============================================================================
// Cache
// =============================================================================

const systemCache = new Map<StudySystem, SystemOverview>()
const subjectCache = new Map<string, SubjectOverview>() // key: `${system}/${subject}`
const topicCache = new Map<string, TopicDetails>() // key: `${system}/${subject}/${topic}`

// =============================================================================
// System Overview Loader
// =============================================================================

export async function loadSystemOverview(system: StudySystem): Promise<SystemOverview | null> {
  if (system === 'general' || system === 'other') {
    return null
  }

  // Check cache
  if (systemCache.has(system)) {
    return systemCache.get(system)!
  }

  try {
    // Dynamic import of JSON file
    const data = await import(`./data/systems/${system}/system.json`)
    const systemData = data.default as SystemOverview
    systemCache.set(system, systemData)
    return systemData
  } catch {
    console.warn(`[Curriculum] System data not found for: ${system}`)
    return null
  }
}

// =============================================================================
// Subject Overview Loader
// =============================================================================

export async function loadSubjectOverview(
  system: StudySystem,
  subjectId: string
): Promise<SubjectOverview | null> {
  if (system === 'general' || system === 'other') {
    return null
  }

  const cacheKey = `${system}/${subjectId}`

  // Check cache
  if (subjectCache.has(cacheKey)) {
    return subjectCache.get(cacheKey)!
  }

  try {
    const data = await import(`./data/systems/${system}/subjects/${subjectId}.json`)
    const subjectData = data.default as SubjectOverview
    subjectCache.set(cacheKey, subjectData)
    return subjectData
  } catch {
    console.warn(`[Curriculum] Subject data not found: ${system}/${subjectId}`)
    return null
  }
}

// =============================================================================
// Topic Details Loader
// =============================================================================

export async function loadTopicDetails(
  system: StudySystem,
  subjectId: string,
  topicId: string
): Promise<TopicDetails | null> {
  if (system === 'general' || system === 'other') {
    return null
  }

  // Normalize subject ID for topic lookup (e.g., "biology-hl" -> "biology")
  const baseSubject = subjectId.replace(/-(?:hl|sl|aa|ai)$/i, '')
  const cacheKey = `${system}/${baseSubject}/${topicId}`

  // Check cache
  if (topicCache.has(cacheKey)) {
    return topicCache.get(cacheKey)!
  }

  try {
    // Topic files are named by topic ID (e.g., "topic-1.json", "topic-2-4.json")
    const normalizedTopicId = topicId.replace(/\./g, '-')
    const data = await import(
      `./data/systems/${system}/topics/${baseSubject}/topic-${normalizedTopicId}.json`
    )
    const topicData = data.default as TopicDetails
    topicCache.set(cacheKey, topicData)
    return topicData
  } catch {
    console.warn(`[Curriculum] Topic data not found: ${system}/${baseSubject}/${topicId}`)
    return null
  }
}

// =============================================================================
// Available Subjects Loader
// =============================================================================

export async function loadAvailableSubjects(system: StudySystem): Promise<SystemSubjects | null> {
  // 'other' system has no predefined subjects
  if (system === 'other') {
    return null
  }

  // For 'general' and 'us', use hardcoded subjects directly (no JSON files)
  if (system === 'general' || system === 'us') {
    return getHardcodedSubjects(system)
  }

  try {
    const systemData = await loadSystemOverview(system)

    // Try to load subjects index file
    try {
      const subjectsIndex = await import(`./data/systems/${system}/subjects-index.json`)
      return {
        systemId: system,
        systemName: systemData?.name || system.toUpperCase(),
        groups: subjectsIndex.default.groups,
        subjects: subjectsIndex.default.subjects as AvailableSubject[],
      }
    } catch {
      // subjects-index.json doesn't exist, fall back to hardcoded
      return getHardcodedSubjects(system)
    }
  } catch {
    // System data loading failed, fall back to hardcoded list
    return getHardcodedSubjects(system)
  }
}

// =============================================================================
// Hardcoded Subject Lists (Fallback)
// =============================================================================

function getHardcodedSubjects(system: StudySystem): SystemSubjects | null {
  const subjectLists: Record<string, SystemSubjects> = {
    ib: {
      systemId: 'ib',
      systemName: 'International Baccalaureate',
      groups: [
        { id: 'group1', name: 'Group 1: Studies in Language & Literature' },
        { id: 'group2', name: 'Group 2: Language Acquisition' },
        { id: 'group3', name: 'Group 3: Individuals & Societies' },
        { id: 'group4', name: 'Group 4: Sciences' },
        { id: 'group5', name: 'Group 5: Mathematics' },
        { id: 'group6', name: 'Group 6: The Arts' },
      ],
      subjects: [
        // =====================================================================
        // Group 1: Studies in Language & Literature
        // =====================================================================
        { id: 'english-a-literature', name: 'English A: Literature', shortName: 'English A Lit', levels: ['SL', 'HL'], group: 'group1', icon: '📚' },
        { id: 'english-a-lang-lit', name: 'English A: Language & Literature', shortName: 'English A L&L', levels: ['SL', 'HL'], group: 'group1', icon: '📝' },
        { id: 'chinese-a-literature', name: 'Chinese A: Literature', shortName: 'Chinese A Lit', levels: ['SL', 'HL'], group: 'group1', icon: '🇨🇳' },
        { id: 'chinese-a-lang-lit', name: 'Chinese A: Language & Literature', shortName: 'Chinese A L&L', levels: ['SL', 'HL'], group: 'group1', icon: '🇨🇳' },
        { id: 'spanish-a-literature', name: 'Spanish A: Literature', shortName: 'Spanish A Lit', levels: ['SL', 'HL'], group: 'group1', icon: '🇪🇸' },
        { id: 'spanish-a-lang-lit', name: 'Spanish A: Language & Literature', shortName: 'Spanish A L&L', levels: ['SL', 'HL'], group: 'group1', icon: '🇪🇸' },
        { id: 'french-a-literature', name: 'French A: Literature', shortName: 'French A Lit', levels: ['SL', 'HL'], group: 'group1', icon: '🇫🇷' },
        { id: 'french-a-lang-lit', name: 'French A: Language & Literature', shortName: 'French A L&L', levels: ['SL', 'HL'], group: 'group1', icon: '🇫🇷' },
        { id: 'german-a-literature', name: 'German A: Literature', shortName: 'German A Lit', levels: ['SL', 'HL'], group: 'group1', icon: '🇩🇪' },
        { id: 'arabic-a-literature', name: 'Arabic A: Literature', shortName: 'Arabic A Lit', levels: ['SL', 'HL'], group: 'group1', icon: '🇸🇦' },
        { id: 'korean-a-literature', name: 'Korean A: Literature', shortName: 'Korean A Lit', levels: ['SL', 'HL'], group: 'group1', icon: '🇰🇷' },
        { id: 'japanese-a-literature', name: 'Japanese A: Literature', shortName: 'Japanese A Lit', levels: ['SL', 'HL'], group: 'group1', icon: '🇯🇵' },
        { id: 'hebrew-a-literature', name: 'Hebrew A: Literature', shortName: 'Hebrew A Lit', levels: ['SL', 'HL'], group: 'group1', icon: '🇮🇱' },

        // =====================================================================
        // Group 2: Language Acquisition
        // =====================================================================
        { id: 'english-b', name: 'English B', levels: ['SL', 'HL'], group: 'group2', icon: '🇬🇧' },
        { id: 'french-b', name: 'French B', levels: ['SL', 'HL'], group: 'group2', icon: '🇫🇷' },
        { id: 'spanish-b', name: 'Spanish B', levels: ['SL', 'HL'], group: 'group2', icon: '🇪🇸' },
        { id: 'german-b', name: 'German B', levels: ['SL', 'HL'], group: 'group2', icon: '🇩🇪' },
        { id: 'mandarin-b', name: 'Mandarin B', levels: ['SL', 'HL'], group: 'group2', icon: '🇨🇳' },
        { id: 'arabic-b', name: 'Arabic B', levels: ['SL', 'HL'], group: 'group2', icon: '🇸🇦' },
        { id: 'italian-b', name: 'Italian B', levels: ['SL', 'HL'], group: 'group2', icon: '🇮🇹' },
        { id: 'japanese-b', name: 'Japanese B', levels: ['SL', 'HL'], group: 'group2', icon: '🇯🇵' },
        { id: 'korean-b', name: 'Korean B', levels: ['SL', 'HL'], group: 'group2', icon: '🇰🇷' },
        { id: 'hebrew-b', name: 'Hebrew B', levels: ['SL', 'HL'], group: 'group2', icon: '🇮🇱' },
        { id: 'spanish-ab-initio', name: 'Spanish ab initio', levels: ['SL'], group: 'group2', icon: '🇪🇸' },
        { id: 'french-ab-initio', name: 'French ab initio', levels: ['SL'], group: 'group2', icon: '🇫🇷' },
        { id: 'mandarin-ab-initio', name: 'Mandarin ab initio', levels: ['SL'], group: 'group2', icon: '🇨🇳' },
        { id: 'german-ab-initio', name: 'German ab initio', levels: ['SL'], group: 'group2', icon: '🇩🇪' },
        { id: 'italian-ab-initio', name: 'Italian ab initio', levels: ['SL'], group: 'group2', icon: '🇮🇹' },
        { id: 'japanese-ab-initio', name: 'Japanese ab initio', levels: ['SL'], group: 'group2', icon: '🇯🇵' },
        { id: 'arabic-ab-initio', name: 'Arabic ab initio', levels: ['SL'], group: 'group2', icon: '🇸🇦' },

        // =====================================================================
        // Group 3: Individuals & Societies
        // =====================================================================
        { id: 'history', name: 'History', levels: ['SL', 'HL'], group: 'group3', icon: '📜' },
        { id: 'geography', name: 'Geography', levels: ['SL', 'HL'], group: 'group3', icon: '🗺️' },
        { id: 'economics', name: 'Economics', levels: ['SL', 'HL'], group: 'group3', icon: '📈' },
        { id: 'psychology', name: 'Psychology', levels: ['SL', 'HL'], group: 'group3', icon: '🧠' },
        { id: 'business-management', name: 'Business Management', levels: ['SL', 'HL'], group: 'group3', icon: '💼' },
        { id: 'global-politics', name: 'Global Politics', levels: ['SL', 'HL'], group: 'group3', icon: '🌐' },
        { id: 'philosophy', name: 'Philosophy', levels: ['SL', 'HL'], group: 'group3', icon: '🤔' },
        { id: 'digital-society', name: 'Digital Society', levels: ['SL', 'HL'], group: 'group3', icon: '📱' },
        { id: 'social-cultural-anthropology', name: 'Social & Cultural Anthropology', levels: ['SL', 'HL'], group: 'group3', icon: '👥' },
        { id: 'world-religions', name: 'World Religions', levels: ['SL'], group: 'group3', icon: '🕊️' },

        // =====================================================================
        // Group 4: Sciences
        // =====================================================================
        { id: 'biology', name: 'Biology', levels: ['SL', 'HL'], group: 'group4', icon: '🧬' },
        { id: 'chemistry', name: 'Chemistry', levels: ['SL', 'HL'], group: 'group4', icon: '⚗️' },
        { id: 'physics', name: 'Physics', levels: ['SL', 'HL'], group: 'group4', icon: '⚛️' },
        { id: 'computer-science', name: 'Computer Science', levels: ['SL', 'HL'], group: 'group4', icon: '💻' },
        { id: 'design-technology', name: 'Design Technology', levels: ['SL', 'HL'], group: 'group4', icon: '🎨' },
        { id: 'sports-exercise-health', name: 'Sports, Exercise & Health Science', shortName: 'SEHS', levels: ['SL', 'HL'], group: 'group4', icon: '🏃' },
        { id: 'ess', name: 'Environmental Systems & Societies', shortName: 'ESS', levels: ['SL'], group: 'group4', icon: '🌍' },

        // =====================================================================
        // Group 5: Mathematics
        // =====================================================================
        { id: 'mathematics-aa', name: 'Mathematics: Analysis & Approaches', shortName: 'Math AA', levels: ['SL', 'HL'], group: 'group5', icon: '📐' },
        { id: 'mathematics-ai', name: 'Mathematics: Applications & Interpretation', shortName: 'Math AI', levels: ['SL', 'HL'], group: 'group5', icon: '📊' },

        // =====================================================================
        // Group 6: The Arts
        // =====================================================================
        { id: 'visual-arts', name: 'Visual Arts', levels: ['SL', 'HL'], group: 'group6', icon: '🎨' },
        { id: 'music', name: 'Music', levels: ['SL', 'HL'], group: 'group6', icon: '🎵' },
        { id: 'theatre', name: 'Theatre', levels: ['SL', 'HL'], group: 'group6', icon: '🎭' },
        { id: 'film', name: 'Film', levels: ['SL', 'HL'], group: 'group6', icon: '🎬' },
        { id: 'dance', name: 'Dance', levels: ['SL', 'HL'], group: 'group6', icon: '💃' },
      ],
    },
    'a-levels': {
      systemId: 'uk',
      systemName: 'UK A-Levels',
      groups: [
        { id: 'sciences', name: 'Sciences' },
        { id: 'mathematics', name: 'Mathematics' },
        { id: 'humanities', name: 'Humanities & Social Sciences' },
        { id: 'languages', name: 'Languages & Literature' },
        { id: 'arts', name: 'Creative & Performing Arts' },
        { id: 'technology', name: 'Technology & Vocational' },
      ],
      subjects: [
        // =====================================================================
        // Sciences
        // =====================================================================
        { id: 'biology', name: 'Biology', group: 'sciences', icon: '🧬' },
        { id: 'chemistry', name: 'Chemistry', group: 'sciences', icon: '⚗️' },
        { id: 'physics', name: 'Physics', group: 'sciences', icon: '⚛️' },
        { id: 'computer-science', name: 'Computer Science', group: 'sciences', icon: '💻' },
        { id: 'environmental-science', name: 'Environmental Science', group: 'sciences', icon: '🌍' },
        { id: 'geology', name: 'Geology', group: 'sciences', icon: '🪨' },
        { id: 'psychology', name: 'Psychology', group: 'sciences', icon: '🧠' },

        // =====================================================================
        // Mathematics
        // =====================================================================
        { id: 'mathematics', name: 'Mathematics', group: 'mathematics', icon: '📐' },
        { id: 'further-mathematics', name: 'Further Mathematics', group: 'mathematics', icon: '🔢' },
        { id: 'statistics', name: 'Statistics', group: 'mathematics', icon: '📊' },

        // =====================================================================
        // Humanities & Social Sciences
        // =====================================================================
        { id: 'economics', name: 'Economics', group: 'humanities', icon: '📈' },
        { id: 'history', name: 'History', group: 'humanities', icon: '📜' },
        { id: 'geography', name: 'Geography', group: 'humanities', icon: '🗺️' },
        { id: 'business', name: 'Business Studies', group: 'humanities', icon: '💼' },
        { id: 'politics', name: 'Politics', group: 'humanities', icon: '🏛️' },
        { id: 'sociology', name: 'Sociology', group: 'humanities', icon: '👥' },
        { id: 'law', name: 'Law', group: 'humanities', icon: '⚖️' },
        { id: 'philosophy', name: 'Philosophy', group: 'humanities', icon: '🤔' },
        { id: 'religious-studies', name: 'Religious Studies', group: 'humanities', icon: '🕊️' },
        { id: 'classical-civilisation', name: 'Classical Civilisation', group: 'humanities', icon: '🏛️' },
        { id: 'ancient-history', name: 'Ancient History', group: 'humanities', icon: '📜' },
        { id: 'archaeology', name: 'Archaeology', group: 'humanities', icon: '🏺' },

        // =====================================================================
        // Languages & Literature
        // =====================================================================
        { id: 'english-literature', name: 'English Literature', group: 'languages', icon: '📚' },
        { id: 'english-language', name: 'English Language', group: 'languages', icon: '📝' },
        { id: 'english-lang-lit', name: 'English Language & Literature', group: 'languages', icon: '📖' },
        { id: 'french', name: 'French', group: 'languages', icon: '🇫🇷' },
        { id: 'spanish', name: 'Spanish', group: 'languages', icon: '🇪🇸' },
        { id: 'german', name: 'German', group: 'languages', icon: '🇩🇪' },
        { id: 'italian', name: 'Italian', group: 'languages', icon: '🇮🇹' },
        { id: 'russian', name: 'Russian', group: 'languages', icon: '🇷🇺' },
        { id: 'chinese', name: 'Chinese', group: 'languages', icon: '🇨🇳' },
        { id: 'japanese', name: 'Japanese', group: 'languages', icon: '🇯🇵' },
        { id: 'arabic', name: 'Arabic', group: 'languages', icon: '🇸🇦' },
        { id: 'latin', name: 'Latin', group: 'languages', icon: '🏛️' },
        { id: 'greek', name: 'Ancient Greek', group: 'languages', icon: '🇬🇷' },

        // =====================================================================
        // Creative & Performing Arts
        // =====================================================================
        { id: 'art-design', name: 'Art & Design', group: 'arts', icon: '🎨' },
        { id: 'music', name: 'Music', group: 'arts', icon: '🎵' },
        { id: 'drama-theatre', name: 'Drama & Theatre Studies', group: 'arts', icon: '🎭' },
        { id: 'dance', name: 'Dance', group: 'arts', icon: '💃' },
        { id: 'film-studies', name: 'Film Studies', group: 'arts', icon: '🎬' },
        { id: 'media-studies', name: 'Media Studies', group: 'arts', icon: '📺' },
        { id: 'photography', name: 'Photography', group: 'arts', icon: '📷' },
        { id: 'music-technology', name: 'Music Technology', group: 'arts', icon: '🎧' },
        { id: 'graphic-design', name: 'Graphic Communication', group: 'arts', icon: '🖼️' },
        { id: 'textile-design', name: 'Textile Design', group: 'arts', icon: '🧵' },

        // =====================================================================
        // Technology & Vocational
        // =====================================================================
        { id: 'design-technology', name: 'Design & Technology', group: 'technology', icon: '🔧' },
        { id: 'electronics', name: 'Electronics', group: 'technology', icon: '⚡' },
        { id: 'food-technology', name: 'Food Science & Nutrition', group: 'technology', icon: '🍳' },
        { id: 'physical-education', name: 'Physical Education', group: 'technology', icon: '🏃' },
        { id: 'health-social-care', name: 'Health & Social Care', group: 'technology', icon: '🏥' },
        { id: 'accounting', name: 'Accounting', group: 'technology', icon: '📊' },
      ],
    },
    ap: {
      systemId: 'ap',
      systemName: 'Advanced Placement',
      groups: [
        { id: 'sciences', name: 'Sciences' },
        { id: 'mathematics', name: 'Mathematics & Computer Science' },
        { id: 'humanities', name: 'History & Social Sciences' },
        { id: 'languages', name: 'English' },
        { id: 'world-languages', name: 'World Languages & Cultures' },
        { id: 'arts', name: 'Arts' },
        { id: 'capstone', name: 'AP Capstone' },
      ],
      subjects: [
        // =====================================================================
        // Sciences
        // =====================================================================
        { id: 'ap-biology', name: 'AP Biology', group: 'sciences', icon: '🧬' },
        { id: 'ap-chemistry', name: 'AP Chemistry', group: 'sciences', icon: '⚗️' },
        { id: 'ap-physics-1', name: 'AP Physics 1: Algebra-Based', shortName: 'AP Physics 1', group: 'sciences', icon: '⚛️' },
        { id: 'ap-physics-2', name: 'AP Physics 2: Algebra-Based', shortName: 'AP Physics 2', group: 'sciences', icon: '⚛️' },
        { id: 'ap-physics-c-mechanics', name: 'AP Physics C: Mechanics', group: 'sciences', icon: '⚛️' },
        { id: 'ap-physics-c-em', name: 'AP Physics C: Electricity & Magnetism', shortName: 'AP Physics C: E&M', group: 'sciences', icon: '⚛️' },
        { id: 'ap-environmental-science', name: 'AP Environmental Science', shortName: 'AP Environmental', group: 'sciences', icon: '🌍' },

        // =====================================================================
        // Mathematics & Computer Science
        // =====================================================================
        { id: 'ap-precalculus', name: 'AP Precalculus', group: 'mathematics', icon: '📐' },
        { id: 'ap-calculus-ab', name: 'AP Calculus AB', group: 'mathematics', icon: '📐' },
        { id: 'ap-calculus-bc', name: 'AP Calculus BC', group: 'mathematics', icon: '📐' },
        { id: 'ap-statistics', name: 'AP Statistics', group: 'mathematics', icon: '📊' },
        { id: 'ap-computer-science-a', name: 'AP Computer Science A', shortName: 'AP CS A', group: 'mathematics', icon: '💻' },
        { id: 'ap-computer-science-principles', name: 'AP Computer Science Principles', shortName: 'AP CSP', group: 'mathematics', icon: '💻' },

        // =====================================================================
        // History & Social Sciences
        // =====================================================================
        { id: 'ap-us-history', name: 'AP United States History', shortName: 'AP US History', group: 'humanities', icon: '📜' },
        { id: 'ap-world-history', name: 'AP World History: Modern', shortName: 'AP World History', group: 'humanities', icon: '🌍' },
        { id: 'ap-european-history', name: 'AP European History', group: 'humanities', icon: '🏰' },
        { id: 'ap-psychology', name: 'AP Psychology', group: 'humanities', icon: '🧠' },
        { id: 'ap-economics-micro', name: 'AP Microeconomics', group: 'humanities', icon: '📈' },
        { id: 'ap-economics-macro', name: 'AP Macroeconomics', group: 'humanities', icon: '📈' },
        { id: 'ap-government-us', name: 'AP United States Government & Politics', shortName: 'AP US Gov', group: 'humanities', icon: '🏛️' },
        { id: 'ap-government-comparative', name: 'AP Comparative Government & Politics', shortName: 'AP Comp Gov', group: 'humanities', icon: '🌐' },
        { id: 'ap-human-geography', name: 'AP Human Geography', group: 'humanities', icon: '🗺️' },
        { id: 'ap-african-american-studies', name: 'AP African American Studies', group: 'humanities', icon: '📖' },

        // =====================================================================
        // English
        // =====================================================================
        { id: 'ap-english-literature', name: 'AP English Literature & Composition', shortName: 'AP Eng Lit', group: 'languages', icon: '📚' },
        { id: 'ap-english-language', name: 'AP English Language & Composition', shortName: 'AP Eng Lang', group: 'languages', icon: '📝' },

        // =====================================================================
        // World Languages & Cultures
        // =====================================================================
        { id: 'ap-spanish-language', name: 'AP Spanish Language & Culture', shortName: 'AP Spanish Lang', group: 'world-languages', icon: '🇪🇸' },
        { id: 'ap-spanish-literature', name: 'AP Spanish Literature & Culture', shortName: 'AP Spanish Lit', group: 'world-languages', icon: '🇪🇸' },
        { id: 'ap-french', name: 'AP French Language & Culture', shortName: 'AP French', group: 'world-languages', icon: '🇫🇷' },
        { id: 'ap-german', name: 'AP German Language & Culture', shortName: 'AP German', group: 'world-languages', icon: '🇩🇪' },
        { id: 'ap-italian', name: 'AP Italian Language & Culture', shortName: 'AP Italian', group: 'world-languages', icon: '🇮🇹' },
        { id: 'ap-japanese', name: 'AP Japanese Language & Culture', shortName: 'AP Japanese', group: 'world-languages', icon: '🇯🇵' },
        { id: 'ap-chinese', name: 'AP Chinese Language & Culture', shortName: 'AP Chinese', group: 'world-languages', icon: '🇨🇳' },
        { id: 'ap-latin', name: 'AP Latin', group: 'world-languages', icon: '🏛️' },

        // =====================================================================
        // Arts
        // =====================================================================
        { id: 'ap-art-history', name: 'AP Art History', group: 'arts', icon: '🖼️' },
        { id: 'ap-music-theory', name: 'AP Music Theory', group: 'arts', icon: '🎵' },
        { id: 'ap-studio-art-2d', name: 'AP 2-D Art and Design', shortName: 'AP 2D Art', group: 'arts', icon: '🎨' },
        { id: 'ap-studio-art-3d', name: 'AP 3-D Art and Design', shortName: 'AP 3D Art', group: 'arts', icon: '🗿' },
        { id: 'ap-studio-art-drawing', name: 'AP Drawing', group: 'arts', icon: '✏️' },

        // =====================================================================
        // AP Capstone
        // =====================================================================
        { id: 'ap-seminar', name: 'AP Seminar', group: 'capstone', icon: '🎓' },
        { id: 'ap-research', name: 'AP Research', group: 'capstone', icon: '🔬' },
      ],
    },
    israeli_bagrut: {
      systemId: 'israeli_bagrut',
      systemName: 'Israeli Bagrut',
      groups: [
        { id: 'sciences', name: 'מדעים (Sciences)' },
        { id: 'mathematics', name: 'מתמטיקה (Mathematics)' },
        { id: 'humanities', name: 'מדעי הרוח (Humanities)' },
        { id: 'social', name: 'מדעי החברה (Social Sciences)' },
        { id: 'languages', name: 'שפות (Languages)' },
        { id: 'arts', name: 'אמנויות (Arts)' },
        { id: 'required', name: 'מקצועות חובה (Required)' },
      ],
      subjects: [
        // =====================================================================
        // מדעים (Sciences)
        // =====================================================================
        { id: 'biology', name: 'ביולוגיה', shortName: 'Biology', levels: ['3', '5'], group: 'sciences', icon: '🧬' },
        { id: 'chemistry', name: 'כימיה', shortName: 'Chemistry', levels: ['3', '5'], group: 'sciences', icon: '⚗️' },
        { id: 'physics', name: 'פיזיקה', shortName: 'Physics', levels: ['3', '5'], group: 'sciences', icon: '⚛️' },
        { id: 'computer-science', name: 'מדעי המחשב', shortName: 'Computer Science', levels: ['3', '5'], group: 'sciences', icon: '💻' },
        { id: 'electronics', name: 'אלקטרוניקה', shortName: 'Electronics', levels: ['3', '5'], group: 'sciences', icon: '⚡' },
        { id: 'biotechnology', name: 'ביוטכנולוגיה', shortName: 'Biotechnology', levels: ['3', '5'], group: 'sciences', icon: '🧪' },
        { id: 'earth-science', name: 'מדעי כדור הארץ', shortName: 'Earth Science', levels: ['3', '5'], group: 'sciences', icon: '🌍' },

        // =====================================================================
        // מתמטיקה (Mathematics)
        // =====================================================================
        { id: 'mathematics', name: 'מתמטיקה', shortName: 'Mathematics', levels: ['3', '4', '5'], group: 'mathematics', icon: '📐' },

        // =====================================================================
        // מדעי הרוח (Humanities)
        // =====================================================================
        { id: 'history', name: 'היסטוריה', shortName: 'History', levels: ['2', '5'], group: 'humanities', icon: '📜' },
        { id: 'bible', name: 'תנ"ך', shortName: 'Bible Studies', levels: ['2', '5'], group: 'humanities', icon: '📖' },
        { id: 'literature', name: 'ספרות', shortName: 'Literature', levels: ['2', '5'], group: 'humanities', icon: '📚' },
        { id: 'philosophy', name: 'פילוסופיה', shortName: 'Philosophy', levels: ['5'], group: 'humanities', icon: '🤔' },
        { id: 'jewish-thought', name: 'מחשבת ישראל', shortName: 'Jewish Thought', levels: ['5'], group: 'humanities', icon: '✡️' },
        { id: 'talmud', name: 'תלמוד', shortName: 'Talmud', levels: ['5'], group: 'humanities', icon: '📜' },
        { id: 'general-history', name: 'היסטוריה כללית', shortName: 'General History', levels: ['2', '5'], group: 'humanities', icon: '🌐' },

        // =====================================================================
        // מדעי החברה (Social Sciences)
        // =====================================================================
        { id: 'psychology', name: 'פסיכולוגיה', shortName: 'Psychology', levels: ['5'], group: 'social', icon: '🧠' },
        { id: 'sociology', name: 'סוציולוגיה', shortName: 'Sociology', levels: ['5'], group: 'social', icon: '👥' },
        { id: 'economics', name: 'כלכלה', shortName: 'Economics', levels: ['5'], group: 'social', icon: '📈' },
        { id: 'geography', name: 'גאוגרפיה', shortName: 'Geography', levels: ['2', '5'], group: 'social', icon: '🗺️' },
        { id: 'political-science', name: 'מדע המדינה', shortName: 'Political Science', levels: ['5'], group: 'social', icon: '🏛️' },
        { id: 'communication', name: 'תקשורת', shortName: 'Communication', levels: ['5'], group: 'social', icon: '📺' },
        { id: 'education', name: 'חינוך', shortName: 'Education', levels: ['5'], group: 'social', icon: '🎓' },

        // =====================================================================
        // שפות (Languages)
        // =====================================================================
        { id: 'english', name: 'אנגלית', shortName: 'English', levels: ['3', '4', '5'], group: 'languages', icon: '🇬🇧' },
        { id: 'hebrew', name: 'עברית', shortName: 'Hebrew', levels: ['2', '5'], group: 'languages', icon: '📝' },
        { id: 'arabic', name: 'ערבית', shortName: 'Arabic', levels: ['3', '4', '5'], group: 'languages', icon: '🇸🇦' },
        { id: 'french', name: 'צרפתית', shortName: 'French', levels: ['3', '4', '5'], group: 'languages', icon: '🇫🇷' },
        { id: 'spanish', name: 'ספרדית', shortName: 'Spanish', levels: ['3', '5'], group: 'languages', icon: '🇪🇸' },
        { id: 'russian', name: 'רוסית', shortName: 'Russian', levels: ['5'], group: 'languages', icon: '🇷🇺' },
        { id: 'amharic', name: 'אמהרית', shortName: 'Amharic', levels: ['5'], group: 'languages', icon: '🇪🇹' },

        // =====================================================================
        // אמנויות (Arts)
        // =====================================================================
        { id: 'music', name: 'מוסיקה', shortName: 'Music', levels: ['5'], group: 'arts', icon: '🎵' },
        { id: 'art', name: 'אמנות', shortName: 'Art', levels: ['5'], group: 'arts', icon: '🎨' },
        { id: 'theatre', name: 'תיאטרון', shortName: 'Theatre', levels: ['5'], group: 'arts', icon: '🎭' },
        { id: 'dance', name: 'מחול', shortName: 'Dance', levels: ['5'], group: 'arts', icon: '💃' },
        { id: 'cinema', name: 'קולנוע', shortName: 'Cinema', levels: ['5'], group: 'arts', icon: '🎬' },
        { id: 'design', name: 'עיצוב', shortName: 'Design', levels: ['5'], group: 'arts', icon: '🖼️' },

        // =====================================================================
        // מקצועות חובה (Required)
        // =====================================================================
        { id: 'civics', name: 'אזרחות', shortName: 'Civics', levels: ['2'], group: 'required', icon: '🏛️' },
        { id: 'physical-education', name: 'חינוך גופני', shortName: 'Physical Education', levels: ['2'], group: 'required', icon: '🏃' },
      ],
    },
    us: {
      systemId: 'us',
      systemName: 'US High School',
      groups: [
        { id: 'sciences', name: 'Sciences' },
        { id: 'mathematics', name: 'Mathematics' },
        { id: 'english', name: 'English & Language Arts' },
        { id: 'social-studies', name: 'Social Studies' },
        { id: 'world-languages', name: 'World Languages' },
        { id: 'arts', name: 'Fine & Performing Arts' },
        { id: 'electives', name: 'Electives' },
      ],
      subjects: [
        // =====================================================================
        // Sciences
        // =====================================================================
        { id: 'biology', name: 'Biology', group: 'sciences', icon: '🧬' },
        { id: 'chemistry', name: 'Chemistry', group: 'sciences', icon: '⚗️' },
        { id: 'physics', name: 'Physics', group: 'sciences', icon: '⚛️' },
        { id: 'earth-science', name: 'Earth Science', group: 'sciences', icon: '🌍' },
        { id: 'environmental-science', name: 'Environmental Science', group: 'sciences', icon: '🌱' },
        { id: 'anatomy-physiology', name: 'Anatomy & Physiology', group: 'sciences', icon: '🫀' },
        { id: 'marine-biology', name: 'Marine Biology', group: 'sciences', icon: '🐠' },
        { id: 'astronomy', name: 'Astronomy', group: 'sciences', icon: '🔭' },

        // =====================================================================
        // Mathematics
        // =====================================================================
        { id: 'algebra-1', name: 'Algebra 1', group: 'mathematics', icon: '📐' },
        { id: 'algebra-2', name: 'Algebra 2', group: 'mathematics', icon: '📐' },
        { id: 'geometry', name: 'Geometry', group: 'mathematics', icon: '📐' },
        { id: 'precalculus', name: 'Precalculus', group: 'mathematics', icon: '📐' },
        { id: 'calculus', name: 'Calculus', group: 'mathematics', icon: '📐' },
        { id: 'statistics', name: 'Statistics', group: 'mathematics', icon: '📊' },
        { id: 'trigonometry', name: 'Trigonometry', group: 'mathematics', icon: '📐' },

        // =====================================================================
        // English & Language Arts
        // =====================================================================
        { id: 'english-9', name: 'English 9', group: 'english', icon: '📚' },
        { id: 'english-10', name: 'English 10', group: 'english', icon: '📚' },
        { id: 'english-11', name: 'English 11 (American Lit)', shortName: 'English 11', group: 'english', icon: '📚' },
        { id: 'english-12', name: 'English 12 (British Lit)', shortName: 'English 12', group: 'english', icon: '📚' },
        { id: 'creative-writing', name: 'Creative Writing', group: 'english', icon: '✍️' },
        { id: 'journalism', name: 'Journalism', group: 'english', icon: '📰' },
        { id: 'speech-debate', name: 'Speech & Debate', group: 'english', icon: '🎤' },

        // =====================================================================
        // Social Studies
        // =====================================================================
        { id: 'us-history', name: 'US History', group: 'social-studies', icon: '📜' },
        { id: 'world-history', name: 'World History', group: 'social-studies', icon: '🌍' },
        { id: 'us-government', name: 'US Government', group: 'social-studies', icon: '🏛️' },
        { id: 'economics', name: 'Economics', group: 'social-studies', icon: '📈' },
        { id: 'geography', name: 'Geography', group: 'social-studies', icon: '🗺️' },
        { id: 'psychology', name: 'Psychology', group: 'social-studies', icon: '🧠' },
        { id: 'sociology', name: 'Sociology', group: 'social-studies', icon: '👥' },

        // =====================================================================
        // World Languages
        // =====================================================================
        { id: 'spanish', name: 'Spanish', group: 'world-languages', icon: '🇪🇸' },
        { id: 'french', name: 'French', group: 'world-languages', icon: '🇫🇷' },
        { id: 'german', name: 'German', group: 'world-languages', icon: '🇩🇪' },
        { id: 'chinese', name: 'Chinese (Mandarin)', group: 'world-languages', icon: '🇨🇳' },
        { id: 'japanese', name: 'Japanese', group: 'world-languages', icon: '🇯🇵' },
        { id: 'latin', name: 'Latin', group: 'world-languages', icon: '🏛️' },
        { id: 'italian', name: 'Italian', group: 'world-languages', icon: '🇮🇹' },
        { id: 'american-sign-language', name: 'American Sign Language', shortName: 'ASL', group: 'world-languages', icon: '🤟' },

        // =====================================================================
        // Fine & Performing Arts
        // =====================================================================
        { id: 'art', name: 'Art', group: 'arts', icon: '🎨' },
        { id: 'band', name: 'Band', group: 'arts', icon: '🎺' },
        { id: 'choir', name: 'Choir', group: 'arts', icon: '🎵' },
        { id: 'orchestra', name: 'Orchestra', group: 'arts', icon: '🎻' },
        { id: 'drama-theater', name: 'Drama/Theater', group: 'arts', icon: '🎭' },
        { id: 'dance', name: 'Dance', group: 'arts', icon: '💃' },
        { id: 'photography', name: 'Photography', group: 'arts', icon: '📷' },
        { id: 'film-video', name: 'Film & Video Production', group: 'arts', icon: '🎬' },
        { id: 'graphic-design', name: 'Graphic Design', group: 'arts', icon: '🖼️' },

        // =====================================================================
        // Electives
        // =====================================================================
        { id: 'computer-science', name: 'Computer Science', group: 'electives', icon: '💻' },
        { id: 'physical-education', name: 'Physical Education', group: 'electives', icon: '🏃' },
        { id: 'health', name: 'Health', group: 'electives', icon: '🏥' },
        { id: 'business', name: 'Business', group: 'electives', icon: '💼' },
        { id: 'accounting', name: 'Accounting', group: 'electives', icon: '📊' },
        { id: 'personal-finance', name: 'Personal Finance', group: 'electives', icon: '💰' },
        { id: 'culinary-arts', name: 'Culinary Arts', group: 'electives', icon: '🍳' },
        { id: 'automotive', name: 'Automotive Technology', group: 'electives', icon: '🚗' },
        { id: 'woodworking', name: 'Woodworking', group: 'electives', icon: '🪵' },
        { id: 'engineering', name: 'Engineering', group: 'electives', icon: '⚙️' },
        { id: 'robotics', name: 'Robotics', group: 'electives', icon: '🤖' },
      ],
    },
    general: {
      systemId: 'general',
      systemName: 'General Education',
      groups: [
        { id: 'core', name: 'Core Subjects' },
        { id: 'sciences', name: 'Sciences' },
        { id: 'languages', name: 'Languages' },
        { id: 'arts', name: 'Arts & Humanities' },
        { id: 'practical', name: 'Practical Skills' },
      ],
      subjects: [
        // Core Subjects
        { id: 'mathematics', name: 'Mathematics', group: 'core', icon: '📐' },
        { id: 'reading', name: 'Reading & Literature', group: 'core', icon: '📚' },
        { id: 'writing', name: 'Writing & Composition', group: 'core', icon: '✍️' },
        { id: 'history', name: 'History', group: 'core', icon: '📜' },
        { id: 'geography', name: 'Geography', group: 'core', icon: '🗺️' },

        // Sciences
        { id: 'general-science', name: 'General Science', group: 'sciences', icon: '🔬' },
        { id: 'biology', name: 'Biology', group: 'sciences', icon: '🧬' },
        { id: 'chemistry', name: 'Chemistry', group: 'sciences', icon: '⚗️' },
        { id: 'physics', name: 'Physics', group: 'sciences', icon: '⚛️' },
        { id: 'computer-science', name: 'Computer Science', group: 'sciences', icon: '💻' },

        // Languages
        { id: 'english', name: 'English', group: 'languages', icon: '🇬🇧' },
        { id: 'spanish', name: 'Spanish', group: 'languages', icon: '🇪🇸' },
        { id: 'french', name: 'French', group: 'languages', icon: '🇫🇷' },
        { id: 'german', name: 'German', group: 'languages', icon: '🇩🇪' },
        { id: 'chinese', name: 'Chinese', group: 'languages', icon: '🇨🇳' },

        // Arts & Humanities
        { id: 'art', name: 'Art', group: 'arts', icon: '🎨' },
        { id: 'music', name: 'Music', group: 'arts', icon: '🎵' },
        { id: 'drama', name: 'Drama', group: 'arts', icon: '🎭' },
        { id: 'philosophy', name: 'Philosophy', group: 'arts', icon: '🤔' },
        { id: 'psychology', name: 'Psychology', group: 'arts', icon: '🧠' },

        // Practical Skills
        { id: 'business', name: 'Business Studies', group: 'practical', icon: '💼' },
        { id: 'economics', name: 'Economics', group: 'practical', icon: '📈' },
        { id: 'health', name: 'Health & Wellness', group: 'practical', icon: '🏥' },
        { id: 'physical-education', name: 'Physical Education', group: 'practical', icon: '🏃' },
      ],
    },
  }

  // Map UK to a-levels
  if (system === 'uk') {
    return subjectLists['a-levels'] || null
  }

  return subjectLists[system] || null
}

// =============================================================================
// Cache Management
// =============================================================================

export function clearCurriculumCache(): void {
  systemCache.clear()
  subjectCache.clear()
  topicCache.clear()
}

export function getCacheStats(): { systems: number; subjects: number; topics: number } {
  return {
    systems: systemCache.size,
    subjects: subjectCache.size,
    topics: topicCache.size,
  }
}

// =============================================================================
// Preload Common Data
// =============================================================================

export async function preloadSystem(system: StudySystem): Promise<void> {
  await loadSystemOverview(system)
  await loadAvailableSubjects(system)
}

// =============================================================================
// Check Data Availability
// =============================================================================

export async function hasSystemData(system: StudySystem): Promise<boolean> {
  const data = await loadSystemOverview(system)
  return data !== null
}

export async function hasSubjectData(system: StudySystem, subjectId: string): Promise<boolean> {
  const data = await loadSubjectOverview(system, subjectId)
  return data !== null
}

export async function hasTopicData(
  system: StudySystem,
  subjectId: string,
  topicId: string
): Promise<boolean> {
  const data = await loadTopicDetails(system, subjectId, topicId)
  return data !== null
}
