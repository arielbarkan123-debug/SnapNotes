/**
 * useUserSubjects Hook
 *
 * Fetches the user's configured subjects from their learning profile.
 * Falls back to a comprehensive default subject list when user hasn't
 * configured subjects yet.
 *
 * @example
 * ```tsx
 * const { subjects, groups, isLoading } = useUserSubjects()
 * // If user has subjects: subjects = [{id, label}], groups = []
 * // If user has NO subjects: subjects = all defaults flat, groups = categorized
 * ```
 */

'use client'

import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { formatSubjectLabel } from '@/lib/past-exams/utils'

export interface UserSubject {
  id: string
  label: string
}

export interface UserSubjectGroup {
  category: string
  subjects: UserSubject[]
}

export interface UseUserSubjectsReturn {
  subjects: UserSubject[]
  groups: UserSubjectGroup[]
  isLoading: boolean
  error: string | null
}

// Comprehensive default subjects organized by category
// Used when user hasn't configured their learning profile
const DEFAULT_SUBJECT_GROUPS: UserSubjectGroup[] = [
  {
    category: 'Sciences',
    subjects: [
      { id: 'biology', label: 'Biology' },
      { id: 'chemistry', label: 'Chemistry' },
      { id: 'physics', label: 'Physics' },
      { id: 'computer-science', label: 'Computer Science' },
      { id: 'environmental-science', label: 'Environmental Science' },
      { id: 'earth-science', label: 'Earth Science' },
    ],
  },
  {
    category: 'Mathematics',
    subjects: [
      { id: 'mathematics', label: 'Mathematics' },
      { id: 'algebra', label: 'Algebra' },
      { id: 'geometry', label: 'Geometry' },
      { id: 'calculus', label: 'Calculus' },
      { id: 'statistics', label: 'Statistics' },
      { id: 'trigonometry', label: 'Trigonometry' },
    ],
  },
  {
    category: 'Languages',
    subjects: [
      { id: 'english', label: 'English' },
      { id: 'hebrew', label: 'Hebrew' },
      { id: 'arabic', label: 'Arabic' },
      { id: 'spanish', label: 'Spanish' },
      { id: 'french', label: 'French' },
      { id: 'german', label: 'German' },
      { id: 'chinese', label: 'Chinese' },
      { id: 'japanese', label: 'Japanese' },
      { id: 'russian', label: 'Russian' },
    ],
  },
  {
    category: 'Humanities',
    subjects: [
      { id: 'history', label: 'History' },
      { id: 'geography', label: 'Geography' },
      { id: 'philosophy', label: 'Philosophy' },
      { id: 'literature', label: 'Literature' },
      { id: 'psychology', label: 'Psychology' },
      { id: 'bible', label: 'Bible Studies' },
    ],
  },
  {
    category: 'Arts',
    subjects: [
      { id: 'art', label: 'Art' },
      { id: 'music', label: 'Music' },
      { id: 'theatre', label: 'Theatre' },
      { id: 'dance', label: 'Dance' },
      { id: 'film', label: 'Film' },
    ],
  },
  {
    category: 'Business & Social',
    subjects: [
      { id: 'economics', label: 'Economics' },
      { id: 'business', label: 'Business Studies' },
      { id: 'sociology', label: 'Sociology' },
      { id: 'political-science', label: 'Political Science' },
      { id: 'communication', label: 'Communication' },
    ],
  },
]

// Flat list of all default subjects
const ALL_DEFAULT_SUBJECTS: UserSubject[] = DEFAULT_SUBJECT_GROUPS.flatMap(g => g.subjects)

const USER_SUBJECTS_CACHE_KEY = '/api/user-subjects'

async function fetcher(): Promise<UserSubject[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('user_learning_profile')
    .select('subjects')
    .eq('user_id', user.id)
    .single()

  const subjectIds = (profile?.subjects || []) as string[]
  return subjectIds.map(id => ({
    id,
    label: formatSubjectLabel(id),
  }))
}

export function useUserSubjects(): UseUserSubjectsReturn {
  const { data, error: swrError, isLoading } = useSWR<UserSubject[]>(
    USER_SUBJECTS_CACHE_KEY,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  const userSubjects = data || []
  const hasUserSubjects = userSubjects.length > 0

  return {
    subjects: hasUserSubjects ? userSubjects : ALL_DEFAULT_SUBJECTS,
    groups: hasUserSubjects ? [] : DEFAULT_SUBJECT_GROUPS,
    isLoading,
    error: swrError ? 'Failed to load subjects' : null,
  }
}
