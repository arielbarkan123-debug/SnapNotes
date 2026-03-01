/**
 * Exam Prediction Engine
 *
 * Analyzes 3+ past exam papers to predict likely topics for the next exam
 * and generate a targeted study plan.
 */

import Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/ai/claude'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExamAnalysis {
  id: string
  title: string
  subject: string
  topics: string[]
  difficulty: string
  questionTypes: string[]
  totalPoints: number
}

export interface PredictedTopic {
  topic: string
  topicHe: string
  likelihood: number // 0-100
  avgPoints: number
  difficulty: 'easy' | 'medium' | 'hard'
  trend: 'increasing' | 'stable' | 'decreasing'
  appearedIn: number // how many of the analyzed papers
}

export interface StudyPriority {
  topic: string
  topicHe: string
  priority: 'critical' | 'important' | 'recommended'
  reason: string
  reasonHe: string
  studyMinutes: number
}

export interface ExamPrediction {
  predictedTopics: PredictedTopic[]
  studyPriorities: StudyPriority[]
  confidence: number // 0-100
  basedOn: number // number of papers analyzed
  subject: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MIN_PAPERS = 3

const PREDICTION_PROMPT = `You are an expert exam analyst. Given analysis data from multiple past exam papers, predict the most likely topics for the next exam.

Analyze:
1. Topic frequency — topics appearing in all papers are very likely
2. Difficulty trends — are papers getting harder?
3. Topic rotation — some topics alternate between papers
4. Question format patterns — types of questions asked
5. Point distribution — high-value topics are more important

Return JSON (no markdown):
{
  "predictedTopics": [
    {
      "topic": "English topic name",
      "topicHe": "Hebrew topic name",
      "likelihood": 85,
      "avgPoints": 20,
      "difficulty": "medium",
      "trend": "increasing",
      "appearedIn": 3
    }
  ],
  "studyPriorities": [
    {
      "topic": "Topic name",
      "topicHe": "Hebrew name",
      "priority": "critical",
      "reason": "English reason",
      "reasonHe": "Hebrew reason",
      "studyMinutes": 60
    }
  ],
  "confidence": 75,
  "analysis": "Brief overall analysis of exam patterns"
}

Rules:
- Sort predictedTopics by likelihood (highest first)
- Only include topics with likelihood >= 30%
- Limit to 10 predicted topics max
- Study priorities sorted: critical > important > recommended
- studyMinutes should be realistic (15-120 min per topic)
- Confidence should reflect how many papers and how consistent patterns are
- Be specific with topic names, not generic`

// ─── Main Function ───────────────────────────────────────────────────────────

/**
 * Predict exam topics from analyzed past papers.
 *
 * @param analyses - Array of past exam analyses (minimum 3)
 * @returns ExamPrediction with topics, priorities, and confidence
 */
export async function predictExamTopics(
  analyses: ExamAnalysis[],
): Promise<ExamPrediction> {
  if (analyses.length < MIN_PAPERS) {
    throw new Error(`Need at least ${MIN_PAPERS} past papers for prediction. Got ${analyses.length}.`)
  }

  const subject = analyses[0]?.subject || 'General'

  // Format analyses for Claude
  const papersText = analyses.map((a, i) => `
Paper ${i + 1}: "${a.title}"
- Subject: ${a.subject}
- Topics: ${a.topics.join(', ')}
- Difficulty: ${a.difficulty}
- Question Types: ${a.questionTypes.join(', ')}
- Total Points: ${a.totalPoints}
`).join('\n')

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 3000,
    system: PREDICTION_PROMPT,
    messages: [{
      role: 'user',
      content: `Analyze these ${analyses.length} past exam papers and predict the next exam:\n\n${papersText}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse exam prediction')
  }

  const result = JSON.parse(jsonMatch[0])

  return {
    predictedTopics: (result.predictedTopics || []).slice(0, 10),
    studyPriorities: result.studyPriorities || [],
    confidence: result.confidence || 50,
    basedOn: analyses.length,
    subject,
  }
}
