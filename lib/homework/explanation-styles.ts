/**
 * Explanation Style Definitions
 *
 * Each style modifies the tutor's behavior through:
 * - systemPromptModifier: appended to the base system prompt
 * - diagramMode: controls diagram generation behavior
 * - forceLanguageLevel: overrides response complexity
 */

export type ExplanationStyleId =
  | 'step_by_step'
  | 'eli5'
  | 'visual_builder'
  | 'worked_example'
  | 'socratic'

export type DiagramMode = 'single' | 'step_sequence' | 'none'

export interface ExplanationStyle {
  id: ExplanationStyleId
  icon: string
  labelKey: string        // i18n key under 'explanationStyles'
  descriptionKey: string  // i18n key under 'explanationStyles'
  systemPromptModifier: string
  diagramMode: DiagramMode
  forceLanguageLevel?: 'simple' | 'standard' | 'advanced'
}

export const EXPLANATION_STYLES: ExplanationStyle[] = [
  {
    id: 'step_by_step',
    icon: '📋',
    labelKey: 'stepByStep.label',
    descriptionKey: 'stepByStep.description',
    diagramMode: 'single',
    systemPromptModifier: `
EXPLANATION STYLE: Step-by-Step
- Break down the solution into clear numbered steps
- Each step should build logically on the previous one
- Use transitional phrases: "First...", "Next...", "Therefore..."
- Show intermediate calculations clearly
- Conclude with the final answer clearly stated`,
  },
  {
    id: 'eli5',
    icon: '🧒',
    labelKey: 'eli5.label',
    descriptionKey: 'eli5.description',
    diagramMode: 'single',
    forceLanguageLevel: 'simple',
    systemPromptModifier: `
EXPLANATION STYLE: Explain Like I'm 5 (ELI5)
- Use simple, everyday analogies to explain concepts
- Avoid ALL technical jargon — if you must use a term, define it immediately
- Use comparisons to real-world objects the student knows
- Keep sentences short (max 15 words)
- Use concrete examples, not abstract definitions
- Example: "Think of a fraction like cutting a pizza into slices"
- Be enthusiastic and encouraging`,
  },
  {
    id: 'visual_builder',
    icon: '🎨',
    labelKey: 'visualBuilder.label',
    descriptionKey: 'visualBuilder.description',
    diagramMode: 'step_sequence',
    systemPromptModifier: `
EXPLANATION STYLE: Visual Builder
- Every step of the explanation should be accompanied by a visual diagram
- Focus on building up the visual understanding piece by piece
- Describe what the student should see in each diagram
- Use spatial language: "on the left", "above", "next to"
- Connect visual elements to mathematical concepts
- The system will generate a step-by-step diagram sequence automatically`,
  },
  {
    id: 'worked_example',
    icon: '📝',
    labelKey: 'workedExample.label',
    descriptionKey: 'workedExample.description',
    diagramMode: 'single',
    systemPromptModifier: `
EXPLANATION STYLE: Worked Example
- Before solving the student's problem, show 1-2 SIMILAR but DIFFERENT solved examples
- Label them clearly: "Example 1:", "Example 2:"
- Solve each example step by step
- Then say: "Now let's apply the same approach to your problem:"
- Show the parallels between the examples and the student's problem
- This helps the student see the pattern before applying it`,
  },
  {
    id: 'socratic',
    icon: '🤔',
    labelKey: 'socratic.label',
    descriptionKey: 'socratic.description',
    diagramMode: 'none',
    systemPromptModifier: `
EXPLANATION STYLE: Socratic Method
- NEVER give direct answers or solutions
- ONLY ask guiding questions that lead the student to discover the answer
- Start with broad questions, then narrow down based on responses
- If the student is stuck, rephrase or give a simpler guiding question
- Celebrate when the student discovers something: "Exactly! You got it!"
- Example questions: "What do you think would happen if...?", "Can you see a pattern?", "What's the first thing you notice?"
- Maximum 2 questions per response
- Be patient and encouraging`,
  },
]

/**
 * Get a style by ID. Returns step_by_step as default.
 */
export function getExplanationStyle(id?: string): ExplanationStyle {
  if (!id) return EXPLANATION_STYLES[0]
  return EXPLANATION_STYLES.find(s => s.id === id) || EXPLANATION_STYLES[0]
}

/**
 * Get all available style IDs for validation.
 */
export function getValidStyleIds(): string[] {
  return EXPLANATION_STYLES.map(s => s.id)
}
