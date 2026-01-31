export interface StudyPlan {
  id: string
  user_id: string
  title: string
  exam_date: string
  course_ids: string[]
  status: 'active' | 'completed' | 'abandoned'
  config: PlanConfig
  created_at: string
  updated_at: string
}

export interface PlanConfig {
  daily_time_minutes: number
  skip_days: string[] // ISO date strings
  skipped_lessons: { courseId: string; lessonIndex: number }[]
}

export interface StudyPlanTask {
  id: string
  plan_id: string
  scheduled_date: string
  task_type: 'learn_lesson' | 'review_lesson' | 'practice_test' | 'review_weak' | 'light_review' | 'mock_exam'
  course_id?: string
  lesson_index?: number
  lesson_title?: string
  description?: string
  estimated_minutes: number
  status: 'pending' | 'completed' | 'skipped'
  completed_at?: string
  sort_order: number
  metadata: Record<string, unknown>
}

export interface StudyPlanWithTasks extends StudyPlan {
  tasks: StudyPlanTask[]
}

export interface CourseLesson {
  courseId: string
  courseTitle: string
  lessonIndex: number
  lessonTitle: string
}

export interface MasteryData {
  courseId: string
  lessonIndex: number
  mastery: number // 0-1
}

export interface GeneratePlanInput {
  title: string
  examDate: string
  courseIds: string[]
  dailyTimeMinutes: number
  skipDays: string[]
  skippedLessons: { courseId: string; lessonIndex: number }[]
  lessons: CourseLesson[]
  masteryData: MasteryData[]
}
