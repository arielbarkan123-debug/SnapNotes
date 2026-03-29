/**
 * useUserSubjects Hook
 *
 * Fetches the user's configured subjects from their learning profile.
 * Used by PastExamUploadModal and other components that need subject selection.
 *
 * @example
 * ```tsx
 * const { subjects, isLoading } = useUserSubjects()
 * // subjects = [{ id: 'biology-hl', label: 'Biology HL' }, ...]
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

export interface UseUserSubjectsReturn {
  subjects: UserSubject[]
  isLoading: boolean
  error: string | null
}

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
      dedupingInterval: 30000, // Subjects rarely change, cache for 30s
    }
  )

  return {
    subjects: data || [],
    isLoading,
    error: swrError ? 'Failed to load subjects' : null,
  }
}
