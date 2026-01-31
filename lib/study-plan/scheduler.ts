import { type StudyPlanTask, type CourseLesson, type GeneratePlanInput } from './types'

/**
 * Generate a study plan with tasks distributed across available days.
 *
 * Scheduling strategy (research-backed):
 * - Phase 1 (0-40% of days): Introduce new material, interleaved across courses
 * - Phase 2 (40-80%): Review + practice tests + weakness targeting
 * - Phase 3 (80-95%): Mock exams + drilling weak areas
 * - Phase 4 (final 5%): Light review only
 *
 * Spaced review intervals: +1d, +3d, +7d, +14d from first learn
 * Weak areas (mastery < 0.6) get 2-3x more review slots
 */
export function generateStudyPlan(input: GeneratePlanInput): Omit<StudyPlanTask, 'id' | 'plan_id'>[] {
  const {
    examDate,
    dailyTimeMinutes,
    skipDays,
    skippedLessons,
    lessons,
    masteryData,
  } = input

  const skipDaysSet = new Set(skipDays)
  const skippedSet = new Set(
    skippedLessons.map(s => `${s.courseId}:${s.lessonIndex}`)
  )

  // Filter out skipped lessons
  const activeLessons = lessons.filter(
    l => !skippedSet.has(`${l.courseId}:${l.lessonIndex}`)
  )

  // Build mastery map
  const masteryMap = new Map<string, number>()
  for (const m of masteryData) {
    masteryMap.set(`${m.courseId}:${m.lessonIndex}`, m.mastery)
  }

  // Determine which lessons are new (not yet learned) vs already learned
  const newLessons: CourseLesson[] = []
  const learnedLessons: CourseLesson[] = []
  const weakLessons: CourseLesson[] = []

  for (const lesson of activeLessons) {
    const key = `${lesson.courseId}:${lesson.lessonIndex}`
    const mastery = masteryMap.get(key)
    if (mastery === undefined || mastery < 0.1) {
      newLessons.push(lesson)
    } else {
      learnedLessons.push(lesson)
      if (mastery < 0.6) {
        weakLessons.push(lesson)
      }
    }
  }

  // Get available study days
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exam = new Date(examDate)
  exam.setHours(0, 0, 0, 0)

  const availableDays: string[] = []
  const current = new Date(today)
  // Start from tomorrow
  current.setDate(current.getDate() + 1)

  while (current < exam) {
    const dateStr = current.toISOString().split('T')[0]
    if (!skipDaysSet.has(dateStr)) {
      availableDays.push(dateStr)
    }
    current.setDate(current.getDate() + 1)
  }

  if (availableDays.length === 0) {
    return []
  }

  const totalDays = availableDays.length
  const maxNewPerDay = Math.max(1, Math.floor(dailyTimeMinutes / 15))
  const tasks: Omit<StudyPlanTask, 'id' | 'plan_id'>[] = []

  // Phase boundaries
  const phase1End = Math.floor(totalDays * 0.4)
  const phase2End = Math.floor(totalDays * 0.8)
  const phase3End = Math.floor(totalDays * 0.95)

  // Track when lessons are first learned for spaced review
  const learnDayMap = new Map<string, number>() // lesson key -> day index

  // Schedule new lessons across phase 1 using round-robin across courses
  let newLessonQueue = [...newLessons]
  let newLessonIdx = 0

  // Interleave by course: sort so we alternate courses
  const courseOrder = [...new Set(newLessonQueue.map(l => l.courseId))]
  if (courseOrder.length > 1) {
    const byCourse = new Map<string, CourseLesson[]>()
    for (const l of newLessonQueue) {
      if (!byCourse.has(l.courseId)) byCourse.set(l.courseId, [])
      byCourse.get(l.courseId)!.push(l)
    }
    const interleaved: CourseLesson[] = []
    let maxLen = 0
    for (const arr of byCourse.values()) maxLen = Math.max(maxLen, arr.length)
    for (let i = 0; i < maxLen; i++) {
      for (const cid of courseOrder) {
        const arr = byCourse.get(cid)!
        if (i < arr.length) interleaved.push(arr[i])
      }
    }
    newLessonQueue = interleaved
  }

  // Phase 1: Introduce new material
  for (let dayIdx = 0; dayIdx < phase1End && newLessonIdx < newLessonQueue.length; dayIdx++) {
    let dayMinutes = 0
    let sortOrder = 0

    while (
      newLessonIdx < newLessonQueue.length &&
      dayMinutes + 15 <= dailyTimeMinutes &&
      sortOrder < maxNewPerDay
    ) {
      const lesson = newLessonQueue[newLessonIdx]
      const key = `${lesson.courseId}:${lesson.lessonIndex}`
      learnDayMap.set(key, dayIdx)

      tasks.push({
        scheduled_date: availableDays[dayIdx],
        task_type: 'learn_lesson',
        course_id: lesson.courseId,
        lesson_index: lesson.lessonIndex,
        lesson_title: lesson.lessonTitle,
        description: `Learn: ${lesson.lessonTitle} (${lesson.courseTitle})`,
        estimated_minutes: 15,
        status: 'pending',
        sort_order: sortOrder,
        metadata: { courseTitle: lesson.courseTitle },
      })

      dayMinutes += 15
      sortOrder++
      newLessonIdx++
    }
  }

  // Any remaining new lessons spill into phase 2
  for (
    let dayIdx = phase1End;
    dayIdx < phase2End && newLessonIdx < newLessonQueue.length;
    dayIdx++
  ) {
    const lesson = newLessonQueue[newLessonIdx]
    const key = `${lesson.courseId}:${lesson.lessonIndex}`
    learnDayMap.set(key, dayIdx)

    tasks.push({
      scheduled_date: availableDays[dayIdx],
      task_type: 'learn_lesson',
      course_id: lesson.courseId,
      lesson_index: lesson.lessonIndex,
      lesson_title: lesson.lessonTitle,
      description: `Learn: ${lesson.lessonTitle} (${lesson.courseTitle})`,
      estimated_minutes: 15,
      status: 'pending',
      sort_order: 0,
      metadata: { courseTitle: lesson.courseTitle },
    })

    newLessonIdx++
  }

  // Schedule spaced reviews for learned lessons
  const reviewIntervals = [1, 3, 7, 14]
  const _allLessonsToReview = [...learnedLessons]

  // Add newly scheduled lessons to review pool
  for (const [key, dayIdx] of learnDayMap.entries()) {
    const [courseId, lessonIndexStr] = key.split(':')
    const lessonIndex = parseInt(lessonIndexStr)
    const lesson = activeLessons.find(
      l => l.courseId === courseId && l.lessonIndex === lessonIndex
    )
    if (!lesson) continue

    for (const interval of reviewIntervals) {
      const reviewDayIdx = dayIdx + interval
      if (reviewDayIdx >= totalDays) continue

      const isWeak = weakLessons.some(
        w => w.courseId === courseId && w.lessonIndex === lessonIndex
      )

      tasks.push({
        scheduled_date: availableDays[Math.min(reviewDayIdx, totalDays - 1)],
        task_type: 'review_lesson',
        course_id: courseId,
        lesson_index: lessonIndex,
        lesson_title: lesson.lessonTitle,
        description: `Review: ${lesson.lessonTitle}`,
        estimated_minutes: isWeak ? 15 : 10,
        status: 'pending',
        sort_order: 10,
        metadata: { reviewInterval: interval, isWeak },
      })
    }
  }

  // Also add reviews for previously learned lessons
  for (const lesson of learnedLessons) {
    const key = `${lesson.courseId}:${lesson.lessonIndex}`
    const mastery = masteryMap.get(key) || 0
    const isWeak = mastery < 0.6

    // Schedule reviews in phase 2
    const reviewCount = isWeak ? 3 : 1
    for (let r = 0; r < reviewCount; r++) {
      const dayIdx = phase1End + Math.floor(Math.random() * (phase2End - phase1End))
      if (dayIdx < totalDays) {
        tasks.push({
          scheduled_date: availableDays[dayIdx],
          task_type: isWeak ? 'review_weak' : 'review_lesson',
          course_id: lesson.courseId,
          lesson_index: lesson.lessonIndex,
          lesson_title: lesson.lessonTitle,
          description: isWeak
            ? `Strengthen weak area: ${lesson.lessonTitle}`
            : `Review: ${lesson.lessonTitle}`,
          estimated_minutes: isWeak ? 20 : 10,
          status: 'pending',
          sort_order: isWeak ? 5 : 10,
          metadata: { mastery, isWeak },
        })
      }
    }
  }

  // Phase 2: Add practice tests
  const practiceTestDays = Math.max(1, Math.floor((phase2End - phase1End) / 4))
  for (let i = 0; i < practiceTestDays; i++) {
    const dayIdx = phase1End + Math.floor((i + 1) * (phase2End - phase1End) / (practiceTestDays + 1))
    if (dayIdx < totalDays) {
      tasks.push({
        scheduled_date: availableDays[dayIdx],
        task_type: 'practice_test',
        description: 'Practice test - mixed questions',
        estimated_minutes: Math.min(30, dailyTimeMinutes),
        status: 'pending',
        sort_order: 20,
        metadata: {},
      })
    }
  }

  // Phase 3: Mock exams + weak area drilling
  for (let dayIdx = phase2End; dayIdx < phase3End; dayIdx++) {
    if (dayIdx >= totalDays) break

    if ((dayIdx - phase2End) % 3 === 0) {
      tasks.push({
        scheduled_date: availableDays[dayIdx],
        task_type: 'mock_exam',
        description: 'Mock exam - full simulation',
        estimated_minutes: Math.min(45, dailyTimeMinutes),
        status: 'pending',
        sort_order: 0,
        metadata: {},
      })
    } else {
      // Drill weak areas
      for (const wl of weakLessons.slice(0, 2)) {
        tasks.push({
          scheduled_date: availableDays[dayIdx],
          task_type: 'review_weak',
          course_id: wl.courseId,
          lesson_index: wl.lessonIndex,
          lesson_title: wl.lessonTitle,
          description: `Drill weak area: ${wl.lessonTitle}`,
          estimated_minutes: 15,
          status: 'pending',
          sort_order: 5,
          metadata: {},
        })
      }
    }
  }

  // Phase 4: Light review only
  for (let dayIdx = phase3End; dayIdx < totalDays; dayIdx++) {
    tasks.push({
      scheduled_date: availableDays[dayIdx],
      task_type: 'light_review',
      description: 'Light review - skim key concepts and formulas',
      estimated_minutes: Math.min(20, dailyTimeMinutes),
      status: 'pending',
      sort_order: 0,
      metadata: { phase: 'final' },
    })
  }

  // Sort tasks by date, then sort_order
  tasks.sort((a, b) => {
    const dateCompare = a.scheduled_date.localeCompare(b.scheduled_date)
    if (dateCompare !== 0) return dateCompare
    return a.sort_order - b.sort_order
  })

  return tasks
}

/**
 * Recalculate plan from today onwards, preserving completed tasks.
 */
export function recalculatePlan(
  completedTasks: StudyPlanTask[],
  input: GeneratePlanInput
): Omit<StudyPlanTask, 'id' | 'plan_id'>[] {
  // Figure out which lessons have been learned
  const learnedKeys = new Set(
    completedTasks
      .filter(t => t.task_type === 'learn_lesson' && t.status === 'completed')
      .map(t => `${t.course_id}:${t.lesson_index}`)
  )

  // Update mastery data with completion info
  const updatedMastery = [...input.masteryData]
  for (const key of learnedKeys) {
    const [courseId, lessonIndex] = key.split(':')
    const existing = updatedMastery.find(
      m => m.courseId === courseId && m.lessonIndex === parseInt(lessonIndex)
    )
    if (existing) {
      existing.mastery = Math.max(existing.mastery, 0.3) // At least 0.3 if completed
    } else {
      updatedMastery.push({
        courseId,
        lessonIndex: parseInt(lessonIndex),
        mastery: 0.3,
      })
    }
  }

  return generateStudyPlan({
    ...input,
    masteryData: updatedMastery,
  })
}
