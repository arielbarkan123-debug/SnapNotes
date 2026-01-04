/**
 * Mock Supabase Client for Testing
 * Provides configurable responses for database queries
 */

import { mockDatabaseProfiles } from '../fixtures/mock-user-profiles'
import { mockPastExamTemplates, emptyPastExamTemplates } from '../fixtures/mock-past-exams'
import { mockCourseFromDB } from '../fixtures/mock-courses'

export type MockQueryResponse<T> = {
  data: T | null
  error: { message: string; code: string } | null
}

export type MockSupabaseConfig = {
  user?: { id: string; email: string } | null
  profile?: typeof mockDatabaseProfiles[keyof typeof mockDatabaseProfiles]
  pastExamTemplates?: typeof mockPastExamTemplates
  course?: typeof mockCourseFromDB | null
  lessonProgress?: Array<{ lesson_index: number; completed: boolean }>
  shouldFailAuth?: boolean
  shouldFailProfileFetch?: boolean
  shouldFailPastExamsFetch?: boolean
  shouldFailCourseFetch?: boolean
}

/**
 * Creates a mock Supabase client with configurable responses
 */
export function createMockSupabaseClient(config: MockSupabaseConfig = {}) {
  const {
    user = { id: 'user-123', email: 'test@example.com' },
    profile = mockDatabaseProfiles.ibBiologyHL,
    pastExamTemplates = mockPastExamTemplates,
    course = mockCourseFromDB,
    lessonProgress = [],
    shouldFailAuth = false,
    shouldFailProfileFetch = false,
    shouldFailPastExamsFetch = false,
    shouldFailCourseFetch = false,
  } = config

  // Track calls for assertions
  const calls: {
    from: string[]
    auth: string[]
    select: string[]
    insert: string[]
    update: string[]
  } = {
    from: [],
    auth: [],
    select: [],
    insert: [],
    update: [],
  }

  // Create chainable query builder
  const createQueryBuilder = (table: string) => {
    calls.from.push(table)

    let response: MockQueryResponse<unknown> = { data: null, error: null }

    // Determine response based on table and config
    switch (table) {
      case 'user_learning_profile':
        if (shouldFailProfileFetch) {
          response = { data: null, error: { message: 'Failed to fetch profile', code: 'PGRST000' } }
        } else {
          response = { data: profile, error: null }
        }
        break

      case 'past_exam_templates':
        if (shouldFailPastExamsFetch) {
          response = { data: null, error: { message: 'Failed to fetch templates', code: 'PGRST000' } }
        } else {
          response = { data: pastExamTemplates, error: null }
        }
        break

      case 'courses':
        if (shouldFailCourseFetch) {
          response = { data: null, error: { message: 'Course not found', code: 'PGRST116' } }
        } else {
          response = { data: course, error: null }
        }
        break

      case 'lesson_progress':
        response = { data: lessonProgress, error: null }
        break

      default:
        response = { data: null, error: null }
    }

    const builder = {
      select: jest.fn((columns?: string) => {
        calls.select.push(columns || '*')
        return builder
      }),
      insert: jest.fn((data: unknown) => {
        calls.insert.push(JSON.stringify(data))
        return builder
      }),
      update: jest.fn((data: unknown) => {
        calls.update.push(JSON.stringify(data))
        return builder
      }),
      upsert: jest.fn(() => builder),
      delete: jest.fn(() => builder),
      eq: jest.fn(() => builder),
      neq: jest.fn(() => builder),
      gt: jest.fn(() => builder),
      gte: jest.fn(() => builder),
      lt: jest.fn(() => builder),
      lte: jest.fn(() => builder),
      like: jest.fn(() => builder),
      ilike: jest.fn(() => builder),
      is: jest.fn(() => builder),
      in: jest.fn(() => builder),
      contains: jest.fn(() => builder),
      containedBy: jest.fn(() => builder),
      order: jest.fn(() => builder),
      limit: jest.fn(() => builder),
      range: jest.fn(() => builder),
      single: jest.fn(() => Promise.resolve(response)),
      maybeSingle: jest.fn(() => Promise.resolve(response)),
      then: (resolve: (value: typeof response) => void) => {
        resolve(response)
        return Promise.resolve(response)
      },
    }

    return builder
  }

  const mockClient = {
    from: jest.fn((table: string) => createQueryBuilder(table)),

    auth: {
      getUser: jest.fn(() => {
        calls.auth.push('getUser')
        if (shouldFailAuth || !user) {
          return Promise.resolve({
            data: { user: null },
            error: shouldFailAuth ? { message: 'Unauthorized' } : null,
          })
        }
        return Promise.resolve({
          data: { user },
          error: null,
        })
      }),
      getSession: jest.fn(() => {
        calls.auth.push('getSession')
        if (shouldFailAuth || !user) {
          return Promise.resolve({
            data: { session: null },
            error: null,
          })
        }
        return Promise.resolve({
          data: {
            session: {
              user,
              access_token: 'mock-access-token',
              refresh_token: 'mock-refresh-token',
            },
          },
          error: null,
        })
      }),
    },

    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ data: { path: 'mock/path' }, error: null })),
        download: jest.fn(() => Promise.resolve({ data: new Blob(), error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://mock.url/file' } })),
      })),
    },

    // For test assertions
    _calls: calls,
  }

  return mockClient
}

/**
 * Mock for createClient (browser client)
 */
export const mockCreateClient = jest.fn(() => createMockSupabaseClient())

/**
 * Mock for createServerClient
 */
export const mockCreateServerClient = jest.fn((config?: MockSupabaseConfig) =>
  createMockSupabaseClient(config)
)

/**
 * Helper to create mock with specific scenario
 */
export function getMockSupabaseForScenario(
  scenario:
    | 'authenticated'
    | 'unauthenticated'
    | 'noProfile'
    | 'noPastExams'
    | 'profileError'
    | 'pastExamsError'
) {
  switch (scenario) {
    case 'authenticated':
      return createMockSupabaseClient()

    case 'unauthenticated':
      return createMockSupabaseClient({ user: null, shouldFailAuth: true })

    case 'noProfile':
      return createMockSupabaseClient({ profile: null })

    case 'noPastExams':
      return createMockSupabaseClient({ pastExamTemplates: emptyPastExamTemplates })

    case 'profileError':
      return createMockSupabaseClient({ shouldFailProfileFetch: true })

    case 'pastExamsError':
      return createMockSupabaseClient({ shouldFailPastExamsFetch: true })

    default:
      return createMockSupabaseClient()
  }
}

/**
 * Reset all mocks
 */
export function resetSupabaseMocks() {
  mockCreateClient.mockClear()
  mockCreateServerClient.mockClear()
}
