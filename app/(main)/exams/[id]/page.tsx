'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ExamWithQuestions, ExamQuestion, ExamAnswer } from '@/types'
import QuestionRenderer from '@/components/exam/QuestionRenderer'

// Helper to check if a question is answered based on its type
function isQuestionAnswered(answer: ExamAnswer | undefined, questionType: string): boolean {
  if (!answer) return false

  switch (questionType) {
    case 'matching':
      return !!(answer.matchingAnswers && answer.matchingAnswers.length > 0)
    case 'ordering':
      return !!(answer.orderingAnswer && answer.orderingAnswer.length > 0)
    case 'passage_based':
      return !!(answer.subAnswers && answer.subAnswers.length > 0)
    default:
      return !!(answer.answer && answer.answer.trim())
  }
}

// Parse stored user_answer back to ExamAnswer format
function parseStoredAnswer(question: ExamQuestion): ExamAnswer | undefined {
  if (!question.user_answer) return undefined

  const baseAnswer: ExamAnswer = {
    questionId: question.id,
    answer: '',
  }

  switch (question.question_type) {
    case 'matching':
      try {
        const matchingAnswers = JSON.parse(question.user_answer)
        return { ...baseAnswer, matchingAnswers }
      } catch {
        return undefined
      }

    case 'ordering':
      try {
        const orderingAnswer = JSON.parse(question.user_answer)
        return { ...baseAnswer, orderingAnswer }
      } catch {
        return undefined
      }

    case 'passage_based':
      try {
        const subAnswers = JSON.parse(question.user_answer)
        return { ...baseAnswer, subAnswers }
      } catch {
        return undefined
      }

    default:
      return { ...baseAnswer, answer: question.user_answer }
  }
}

export default function TakeExamPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params.id as string

  const [exam, setExam] = useState<ExamWithQuestions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, ExamAnswer>>({})
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set())
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showNav, setShowNav] = useState(false)
  const [retaking, setRetaking] = useState(false)

  const submitRef = useRef<(auto: boolean) => Promise<void>>()

  const fetchExam = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch(`/api/exams/${examId}`)
      const data = await res.json()

      if (data.success && data.exam) {
        setExam(data.exam)

        if (data.exam.status === 'in_progress') {
          const existingAnswers: Record<string, ExamAnswer> = {}
          ;(data.exam.questions || []).forEach((q: ExamQuestion) => {
            const parsed = parseStoredAnswer(q)
            if (parsed) {
              existingAnswers[q.id] = parsed
            }
          })
          setAnswers(existingAnswers)
        }
      } else {
        setError(data.error || 'Failed to load exam')
      }
    } catch (err) {
      console.error('Failed to fetch exam:', err)
      setError('Connection error. Please refresh.')
    } finally {
      setLoading(false)
    }
  }, [examId])

  useEffect(() => {
    fetchExam()
  }, [fetchExam])

  const handleSubmit = useCallback(async (autoSubmit = false) => {
    if (submitting || !exam) return

    if (!autoSubmit) {
      const questions = exam.questions || []
      const unanswered = questions.filter(
        q => !isQuestionAnswered(answers[q.id], q.question_type)
      ).length

      if (unanswered > 0) {
        const confirm = window.confirm(`You have ${unanswered} unanswered questions. Submit anyway?`)
        if (!confirm) return
      }
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/exams/${examId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: Object.values(answers),
        }),
      })

      const data = await res.json()
      if (data.success) {
        fetchExam()
      } else {
        setError(data.error || 'Failed to submit')
      }
    } catch (err) {
      console.error('Failed to submit exam:', err)
      setError('Connection error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [examId, answers, exam, submitting, fetchExam])

  submitRef.current = handleSubmit

  useEffect(() => {
    if (!exam || exam.status !== 'in_progress' || !exam.started_at) return

    const startTime = new Date(exam.started_at).getTime()
    const endTime = startTime + exam.time_limit_minutes * 60 * 1000

    const updateTimer = () => {
      const now = Date.now()
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000))
      setTimeLeft(remaining)

      if (remaining === 0 && submitRef.current) {
        submitRef.current(true)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [exam?.started_at, exam?.status, exam?.time_limit_minutes])

  const handleStart = async () => {
    try {
      setError(null)
      const res = await fetch(`/api/exams/${examId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      })

      const data = await res.json()
      if (data.success) {
        fetchExam()
      } else {
        setError(data.error || 'Failed to start exam')
      }
    } catch (err) {
      console.error('Failed to start exam:', err)
      setError('Connection error. Please try again.')
    }
  }

  const handleRetake = async () => {
    if (!exam || retaking) return

    setRetaking(true)
    setError(null)

    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: exam.course_id,
          questionCount: exam.question_count,
          timeLimitMinutes: exam.time_limit_minutes,
        }),
      })

      const data = await res.json()
      if (data.success && data.examId) {
        router.push(`/exams/${data.examId}`)
      } else {
        setError(data.error || 'Failed to create new exam')
        setRetaking(false)
      }
    } catch (err) {
      console.error('Failed to retake exam:', err)
      setError('Connection error. Please try again.')
      setRetaking(false)
    }
  }

  const handleAnswer = (answer: ExamAnswer) => {
    setAnswers(prev => ({ ...prev, [answer.questionId]: answer }))
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getGradeColor = (grade: string | null) => {
    switch (grade) {
      case 'A': return 'text-green-600'
      case 'B': return 'text-blue-600'
      case 'C': return 'text-yellow-600'
      case 'D': return 'text-orange-600'
      case 'F': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (error && !exam) {
    return (
      <div className="max-w-2xl mx-auto p-4 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={() => router.push('/exams')} className="text-indigo-600">← Back to Exams</button>
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="max-w-2xl mx-auto p-4 text-center">
        <p className="text-gray-500">Exam not found</p>
        <button onClick={() => router.push('/exams')} className="mt-4 text-indigo-600">← Back to Exams</button>
      </div>
    )
  }

  // Pending state - show start screen
  if (exam.status === 'pending') {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{exam.title}</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{exam.course_title}</p>

          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{exam.question_count}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Questions</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{exam.time_limit_minutes}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Minutes</div>
            </div>
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Once you start, the timer begins. You cannot pause.
          </div>

          <button
            onClick={handleStart}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition"
          >
            Start Exam
          </button>
        </div>
      </div>
    )
  }

  // Completed/Expired state - show results
  if (exam.status === 'completed' || exam.status === 'expired') {
    const questions = exam.questions || []
    const weakLessons: Record<string, { title: string; incorrect: number }> = {}
    questions.forEach(q => {
      if (q.is_correct === false && q.lesson_title) {
        const key = q.lesson_index?.toString() || q.lesson_title
        if (!weakLessons[key]) {
          weakLessons[key] = { title: q.lesson_title, incorrect: 0 }
        }
        weakLessons[key].incorrect++
      }
    })

    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{exam.title}</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Results</p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl text-center">
              <div className={`text-4xl font-bold ${getGradeColor(exam.grade)}`}>{exam.grade || '-'}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Grade</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{exam.score}/{exam.total_points}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Score</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{exam.percentage ?? 0}%</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Percentage</div>
            </div>
          </div>

          {Object.keys(weakLessons).length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Areas to Review</h3>
              <div className="space-y-2">
                {Object.values(weakLessons).map((lesson, i) => (
                  <div key={i} className="flex justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-300">{lesson.title}</span>
                    <span className="text-red-600 dark:text-red-400">{lesson.incorrect} incorrect</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{error}</div>}

          <div className="flex gap-3">
            <button onClick={() => router.push('/exams')} className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              ← Back to Exams
            </button>
            <button
              onClick={handleRetake}
              disabled={retaking}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {retaking ? 'Creating...' : 'Retake Exam'}
            </button>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Question Review</h2>
        <div className="space-y-6">
          {questions.map((q, i) => {
            // Parse the stored answer for display
            const storedAnswer = parseStoredAnswer(q)

            return (
              <div
                key={q.id}
                className={`p-6 rounded-xl border ${
                  q.is_correct
                    ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                }`}
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300">
                      Q{i + 1}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                      {q.question_type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {q.points} point{q.points > 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className={`font-medium ${q.is_correct ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {q.is_correct ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                </div>

                <QuestionRenderer
                  question={q}
                  answer={storedAnswer}
                  onAnswer={() => {}} // No-op in results view
                  showResults={true}
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // In-progress state - show question taking UI
  const questions = exam.questions || []
  const question = questions[currentQuestion]

  if (!question) {
    return (
      <div className="max-w-2xl mx-auto p-4 text-center">
        <p className="text-red-500">No questions found</p>
        <button onClick={() => router.push('/exams')} className="mt-4 text-indigo-600">← Back to Exams</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with timer */}
      <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
          <button onClick={() => setShowNav(!showNav)} className="text-sm text-gray-600 dark:text-gray-400">
            Q{currentQuestion + 1}/{questions.length}
          </button>
          <div className={`font-mono text-lg font-bold ${timeLeft !== null && timeLeft < 60 ? 'text-red-600 animate-pulse' : 'text-gray-900 dark:text-white'}`}>
            {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
          </div>
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="px-4 py-1 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
        {error && (
          <div className="max-w-3xl mx-auto px-4 pb-2">
            <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-sm">{error}</div>
          </div>
        )}
      </div>

      {/* Question navigation panel */}
      {showNav && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-wrap gap-2">
              {questions.map((q, i) => {
                const qAnswer = answers[q.id]
                const qAnswered = isQuestionAnswered(qAnswer, q.question_type)
                const isMarked = markedForReview.has(q.id)
                const isCurrent = i === currentQuestion
                return (
                  <button
                    key={q.id}
                    onClick={() => { setCurrentQuestion(i); setShowNav(false) }}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition
                      ${isCurrent ? 'ring-2 ring-indigo-600' : ''}
                      ${isMarked ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        qAnswered ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}
                    `}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 dark:bg-green-900/30 rounded" /> Answered</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-100 dark:bg-yellow-900/30 rounded" /> Marked</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-100 dark:bg-gray-700 rounded" /> Unanswered</span>
            </div>
          </div>
        </div>
      )}

      {/* Question content */}
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">{question.lesson_title || 'General'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                {question.question_type.replace('_', ' ')}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                ({question.points} pt{question.points > 1 ? 's' : ''})
              </span>
            </div>
            <button
              onClick={() => {
                const newMarked = new Set(markedForReview)
                if (newMarked.has(question.id)) newMarked.delete(question.id)
                else newMarked.add(question.id)
                setMarkedForReview(newMarked)
              }}
              className={`text-sm ${markedForReview.has(question.id) ? 'text-yellow-600' : 'text-gray-400 hover:text-yellow-600'}`}
            >
              {markedForReview.has(question.id) ? '★ Marked' : '☆ Mark for review'}
            </button>
          </div>

          <QuestionRenderer
            question={question}
            answer={answers[question.id]}
            onAnswer={handleAnswer}
            showResults={false}
          />
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
          >
            ← Previous
          </button>
          {currentQuestion === questions.length - 1 ? (
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="px-6 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Finish Exam'}
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
