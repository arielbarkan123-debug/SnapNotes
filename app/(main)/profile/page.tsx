import { type Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileContent from './ProfileContent'

export const metadata: Metadata = {
  title: 'Profile',
  description: 'View your learning progress and achievements',
}

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's gamification data
  const { data: gamification } = await supabase
    .from('user_gamification')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Get earned achievements
  const { data: achievements } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', user.id)
    .order('earned_at', { ascending: false })

  // Get recent step performance for activity data (last 90 days)
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data: recentActivity } = await supabase
    .from('step_performance')
    .select('created_at, was_correct')
    .eq('user_id', user.id)
    .gte('created_at', ninetyDaysAgo.toISOString())
    .order('created_at', { ascending: false })

  // Get review logs for activity data
  const { data: reviewLogs } = await supabase
    .from('review_logs')
    .select('reviewed_at, rating')
    .eq('user_id', user.id)
    .gte('reviewed_at', ninetyDaysAgo.toISOString())

  // Get course count
  const { count: courseCount } = await supabase
    .from('courses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Combine activity data
  const activityByDate: Record<string, { lessons: number; cards: number }> = {}

  // Process step performance (lessons)
  recentActivity?.forEach((item) => {
    const date = item.created_at.split('T')[0]
    if (!activityByDate[date]) {
      activityByDate[date] = { lessons: 0, cards: 0 }
    }
    activityByDate[date].lessons++
  })

  // Process review logs (cards)
  reviewLogs?.forEach((item) => {
    const date = item.reviewed_at.split('T')[0]
    if (!activityByDate[date]) {
      activityByDate[date] = { lessons: 0, cards: 0 }
    }
    activityByDate[date].cards++
  })

  return (
    <ProfileContent
      user={{
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Learner',
        createdAt: user.created_at,
      }}
      gamification={
        gamification || {
          total_xp: 0,
          current_level: 1,
          current_streak: 0,
          longest_streak: 0,
          last_activity_date: null,
          total_lessons_completed: 0,
          total_courses_completed: 0,
          total_cards_reviewed: 0,
          perfect_lessons: 0,
        }
      }
      achievements={achievements || []}
      activityByDate={activityByDate}
      courseCount={courseCount || 0}
    />
  )
}
