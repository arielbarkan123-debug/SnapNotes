import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import KnowledgeMapContent from './KnowledgeMapContent'

export const metadata: Metadata = {
  title: 'Knowledge Map - NoteSnap',
  description: 'Visualize your concept mastery and learning progress',
}

export default async function KnowledgeMapPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Get user's courses
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title')
    .eq('user_id', user.id)
    .order('title', { ascending: true })

  // Get concepts with mastery
  const { data: conceptsWithMastery } = await supabase
    .from('concepts')
    .select(`
      id,
      name,
      description,
      subject,
      topic,
      subtopic,
      difficulty_level,
      user_concept_mastery!left (
        mastery_level,
        total_exposures,
        successful_recalls,
        last_reviewed_at
      )
    `)
    .order('subject', { ascending: true })
    .order('topic', { ascending: true })

  // Get concept prerequisites
  const { data: prerequisites } = await supabase
    .from('concept_prerequisites')
    .select('concept_id, prerequisite_id, dependency_strength')

  // Get knowledge gaps
  const { data: gaps } = await supabase
    .from('user_knowledge_gaps')
    .select('concept_id, gap_type, severity, resolved')
    .eq('user_id', user.id)
    .eq('resolved', false)

  // Transform data for the client
  const concepts = (conceptsWithMastery || []).map((c) => {
    const mastery = c.user_concept_mastery?.[0]
    const gap = (gaps || []).find((g) => g.concept_id === c.id)

    return {
      id: c.id,
      name: c.name,
      description: c.description,
      subject: c.subject,
      topic: c.topic,
      subtopic: c.subtopic,
      difficultyLevel: c.difficulty_level,
      masteryLevel: mastery?.mastery_level || 0,
      totalExposures: mastery?.total_exposures || 0,
      successfulRecalls: mastery?.successful_recalls || 0,
      lastReviewedAt: mastery?.last_reviewed_at || null,
      hasGap: !!gap,
      gapType: gap?.gap_type || null,
      gapSeverity: gap?.severity || null,
    }
  })

  const edges = (prerequisites || []).map((p) => ({
    from: p.prerequisite_id,
    to: p.concept_id,
    strength: p.dependency_strength,
  }))

  return (
    <KnowledgeMapContent
      concepts={concepts}
      edges={edges}
      courses={courses || []}
    />
  )
}
