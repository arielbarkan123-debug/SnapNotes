/**
 * Mock Anthropic Client for Testing
 * Provides configurable AI responses for content generation
 */

export type MockAnthropicConfig = {
  shouldFail?: boolean
  errorType?: 'rate_limit' | 'timeout' | 'api_error' | 'invalid_response'
  responseDelay?: number
  customResponse?: string
}

export type AnthropicMessageCall = {
  model: string
  max_tokens: number
  messages: Array<{ role: string; content: string }>
  system?: string
}

/**
 * Sample AI responses for different content types
 */
export const sampleResponses = {
  course: {
    title: 'Cell Biology Fundamentals',
    overview: 'This course covers the fundamental concepts of cell biology.',
    lessons: [
      {
        title: 'Introduction to Cells',
        steps: [
          { type: 'explanation', content: 'Cells are the basic units of life.' },
          { type: 'key_point', content: 'All living organisms are made of cells.' },
          {
            type: 'question',
            question: 'What is the basic unit of life?',
            options: ['Cell', 'Atom', 'Molecule', 'Tissue'],
            correctIndex: 0,
            explanation: 'The cell is the basic unit of life.',
          },
        ],
      },
    ],
    keyConcepts: ['cell', 'organelle', 'membrane'],
    summary: 'This course covered cell biology basics.',
    furtherStudy: ['Cell division', 'Cellular respiration'],
  },

  exam: {
    questions: [
      {
        type: 'multiple_choice',
        question: 'Which organelle is responsible for protein synthesis?',
        options: ['Mitochondria', 'Ribosome', 'Golgi apparatus', 'Lysosome'],
        correctIndex: 1,
        points: 2,
        difficulty: 'easy',
        explanation: 'Ribosomes are the sites of protein synthesis.',
      },
      {
        type: 'short_answer',
        question: 'Explain the process of osmosis.',
        sampleAnswer: 'Osmosis is the movement of water molecules through a selectively permeable membrane.',
        points: 4,
        difficulty: 'medium',
        rubric: ['Mentions water movement', 'Mentions membrane', 'Mentions concentration gradient'],
      },
      {
        type: 'essay',
        question: 'Evaluate the importance of biodiversity.',
        sampleAnswer: 'Biodiversity is crucial for ecosystem stability...',
        points: 8,
        difficulty: 'hard',
        rubric: ['Defines biodiversity', 'Discusses ecosystem services', 'Provides examples'],
      },
    ],
  },

  practiceQuestions: [
    {
      type: 'multiple_choice',
      question: 'What is the function of mitochondria?',
      options: ['Protein synthesis', 'Energy production', 'Cell division', 'Waste removal'],
      correctIndex: 1,
      explanation: 'Mitochondria produce ATP through cellular respiration.',
    },
    {
      type: 'multiple_choice',
      question: 'Which structure contains genetic material?',
      options: ['Ribosome', 'Golgi body', 'Nucleus', 'Lysosome'],
      correctIndex: 2,
      explanation: 'The nucleus contains DNA.',
    },
  ],

  hebrewCourse: {
    title: 'יסודות ביולוגיה של התא',
    overview: 'קורס זה מכסה את המושגים הבסיסיים של ביולוגיה של התא.',
    lessons: [
      {
        title: 'מבוא לתאים',
        steps: [
          { type: 'explanation', content: 'תאים הם יחידות הבסיס של החיים.' },
          { type: 'key_point', content: 'כל היצורים החיים מורכבים מתאים.' },
        ],
      },
    ],
  },
}

/**
 * Creates a mock Anthropic client
 */
export function createMockAnthropicClient(config: MockAnthropicConfig = {}) {
  const { shouldFail = false, errorType = 'api_error', responseDelay = 0, customResponse } = config

  // Track all API calls for assertions
  const calls: AnthropicMessageCall[] = []

  const mockClient = {
    messages: {
      create: jest.fn(async (params: AnthropicMessageCall) => {
        // Record the call
        calls.push(params)

        // Simulate delay if configured
        if (responseDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, responseDelay))
        }

        // Handle failure scenarios
        if (shouldFail) {
          switch (errorType) {
            case 'rate_limit':
              throw new Error('Rate limit exceeded. Please retry after 60 seconds.')
            case 'timeout':
              throw new Error('Request timeout')
            case 'api_error':
              throw new Error('API error: Internal server error')
            case 'invalid_response':
              return {
                content: [{ type: 'text', text: 'invalid json {{{' }],
                model: params.model,
                usage: { input_tokens: 100, output_tokens: 50 },
              }
          }
        }

        // Return custom response if provided
        if (customResponse) {
          return {
            content: [{ type: 'text', text: customResponse }],
            model: params.model,
            usage: { input_tokens: 100, output_tokens: 200 },
          }
        }

        // Determine response based on prompt content
        const systemPrompt = params.system || ''
        const userMessage = params.messages[0]?.content || ''
        const combinedContent = systemPrompt + userMessage

        let responseContent: string

        if (combinedContent.includes('Hebrew') || combinedContent.includes('עברית')) {
          responseContent = JSON.stringify(sampleResponses.hebrewCourse)
        } else if (
          combinedContent.includes('exam') ||
          combinedContent.includes('test') ||
          combinedContent.includes('assessment')
        ) {
          responseContent = JSON.stringify(sampleResponses.exam)
        } else if (
          combinedContent.includes('practice') ||
          combinedContent.includes('question')
        ) {
          responseContent = JSON.stringify(sampleResponses.practiceQuestions)
        } else {
          responseContent = JSON.stringify(sampleResponses.course)
        }

        return {
          content: [{ type: 'text', text: responseContent }],
          model: params.model,
          usage: { input_tokens: 500, output_tokens: 1000 },
          stop_reason: 'end_turn',
        }
      }),
    },

    // Expose calls for assertions
    _calls: calls,
    _getCalls: () => calls,
    _getLastCall: () => calls[calls.length - 1],
    _reset: () => {
      calls.length = 0
    },
  }

  return mockClient
}

/**
 * Mock for the Anthropic constructor
 */
export const MockAnthropic = jest.fn((config?: MockAnthropicConfig) =>
  createMockAnthropicClient(config)
)

/**
 * Helper to verify prompt contains expected content
 */
export function assertPromptContains(
  calls: AnthropicMessageCall[],
  expectedContent: string[]
): boolean {
  const allContent = calls
    .map((call) => {
      const system = call.system || ''
      const messages = call.messages.map((m) => m.content).join(' ')
      return system + ' ' + messages
    })
    .join(' ')

  return expectedContent.every((content) =>
    allContent.toLowerCase().includes(content.toLowerCase())
  )
}

/**
 * Helper to extract system prompt from calls
 */
export function getSystemPrompt(calls: AnthropicMessageCall[]): string {
  return calls.map((call) => call.system || '').join('\n')
}

/**
 * Helper to extract user messages from calls
 */
export function getUserMessages(calls: AnthropicMessageCall[]): string[] {
  return calls.flatMap((call) =>
    call.messages.filter((m) => m.role === 'user').map((m) => m.content)
  )
}

/**
 * Get mock client for specific scenario
 */
export function getMockAnthropicForScenario(
  scenario: 'success' | 'rate_limit' | 'timeout' | 'api_error' | 'invalid_json'
) {
  switch (scenario) {
    case 'success':
      return createMockAnthropicClient()
    case 'rate_limit':
      return createMockAnthropicClient({ shouldFail: true, errorType: 'rate_limit' })
    case 'timeout':
      return createMockAnthropicClient({ shouldFail: true, errorType: 'timeout' })
    case 'api_error':
      return createMockAnthropicClient({ shouldFail: true, errorType: 'api_error' })
    case 'invalid_json':
      return createMockAnthropicClient({ shouldFail: true, errorType: 'invalid_response' })
    default:
      return createMockAnthropicClient()
  }
}

/**
 * Reset all mocks
 */
export function resetAnthropicMocks() {
  MockAnthropic.mockClear()
}
