import { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PracticeSessionContent from './PracticeSessionContent'

export const metadata: Metadata = {
  title: 'Practice Session - NoteSnap',
  description: 'Practice with targeted questions',
}

interface PageProps {
  params: Promise<{ sessionId: string }>
}

export default async function PracticeSessionPage({ params }: PageProps) {
  const { sessionId } = await params
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Get session
  const { data: session, error: sessionError } = await supabase
    .from('practice_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    notFound()
  }

  // Verify ownership
  if (session.user_id !== user.id) {
    redirect('/practice')
  }

  // Get questions for the session
  const { data: questions } = await supabase
    .from('practice_questions')
    .select('*')
    .in('id', session.question_order)

  // Sort questions by session order
  const questionMap = new Map(questions?.map((q) => [q.id, q]) || [])
  const orderedQuestions = session.question_order
    .map((id: string) => questionMap.get(id))
    .filter(Boolean)

  // Get answered questions
  const { data: answers } = await supabase
    .from('practice_session_questions')
    .select('*')
    .eq('session_id', sessionId)

  return (
    <PracticeSessionContent
      session={session}
      questions={orderedQuestions}
      answers={answers || []}
    />
  )
}
