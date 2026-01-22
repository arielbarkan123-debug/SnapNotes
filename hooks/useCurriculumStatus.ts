/**
 * useCurriculumStatus Hook
 *
 * Fetches the user's curriculum setup status including selected
 * study system, grade level, and subjects.
 *
 * @example
 * ```tsx
 * const { status, loading, refetch } = useCurriculumStatus()
 *
 * if (status && !status.isComplete) {
 *   // Redirect to curriculum setup
 * }
 * ```
 */

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CURRICULUM_SYSTEMS } from '@/lib/curriculum/grades'
import type { StudySystem, CurriculumSetupStatus } from '@/lib/curriculum/types'

interface UseCurriculumStatusResult {
  status: CurriculumSetupStatus | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook for fetching user's curriculum setup status
 *
 * @returns Object containing curriculum status, loading state, and refetch function
 */
export function useCurriculumStatus(): UseCurriculumStatusResult {
  const [status, setStatus] = useState<CurriculumSetupStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setStatus(null)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_learning_profile')
        .select('study_system, grade, subjects, subject_levels')
        .eq('user_id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine for new users
        throw profileError
      }

      const studySystem = profile?.study_system as StudySystem | null
      const grade = profile?.grade as string | null
      const subjects = (profile?.subjects || []) as string[]

      // Only curriculum systems need subjects
      const needsSubjects = studySystem && CURRICULUM_SYSTEMS.includes(studySystem)

      const curriculumStatus: CurriculumSetupStatus = {
        hasSelectedSystem: !!studySystem,
        hasSelectedGrade: !!grade,
        hasSelectedSubjects: subjects.length > 0,
        isComplete: !!studySystem && !!grade && (!needsSubjects || subjects.length > 0),
        subjectCount: subjects.length,
      }

      setStatus(curriculumStatus)
    } catch (err) {
      console.error('Error fetching curriculum status:', err)
      setError('Failed to load curriculum status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  return {
    status,
    loading,
    error,
    refetch: fetchStatus,
  }
}
