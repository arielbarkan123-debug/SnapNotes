/**
 * Tests for Cheatsheets API
 * GET /api/cheatsheets - List user's cheatsheets
 * POST /api/cheatsheets - Generate cheatsheet from course
 */

import { GET, POST } from '@/app/api/cheatsheets/route'
import { NextRequest } from 'next/server'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/cheatsheet/generator', () => ({
  generateCheatsheet: jest.fn(),
}))

describe('Cheatsheets API', () => {
  let mockSupabase: any

  const mockCheatsheetList = [
    { id: 'cs-1', title: 'Biology Cheatsheet', title_he: 'דף נוסחאות ביולוגיה', course_id: 'course-1', exam_mode: false, created_at: '2026-01-01', updated_at: '2026-01-01' },
    { id: 'cs-2', title: 'Physics Cheatsheet', title_he: 'דף נוסחאות פיזיקה', course_id: 'course-2', exam_mode: true, created_at: '2026-01-02', updated_at: '2026-01-02' },
  ]

  const mockGeneratedCheatsheet = {
    title: 'Biology Study Sheet',
    titleHe: 'דף לימוד ביולוגיה',
    blocks: [
      { type: 'section_header', title: 'Cell Biology', titleHe: 'ביולוגיה תאית', content: '', contentHe: '' },
      { type: 'definition', title: 'Mitochondria', titleHe: 'מיטוכונדריה', content: 'Powerhouse of the cell', contentHe: 'תחנת הכוח של התא' },
      { type: 'example', title: 'ATP Production', titleHe: 'ייצור ATP', content: 'Example of ATP synthesis', contentHe: 'דוגמה לסינתזה של ATP' },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: jest.fn().mockImplementation((table: string) => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          single: jest.fn(),
        }

        if (table === 'cheatsheets') {
          // Default: list returns mockCheatsheetList
          builder.order.mockResolvedValue({ data: mockCheatsheetList, error: null })
          // For insert().select().single()
          builder.single.mockResolvedValue({ data: { id: 'cs-new' }, error: null })
        } else if (table === 'courses') {
          builder.single.mockResolvedValue({
            data: {
              title: 'Biology 101',
              generated_course: {
                lessons: [
                  { title: 'Cell Biology', content: 'Cells are the building blocks...' },
                  { title: 'Genetics', content: 'DNA is the genetic material...' },
                ],
              },
            },
            error: null,
          })
        }

        return builder
      }),
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)

    const { generateCheatsheet } = require('@/lib/cheatsheet/generator')
    generateCheatsheet.mockResolvedValue(mockGeneratedCheatsheet)
  })

  describe('GET /api/cheatsheets', () => {
    describe('Authentication', () => {
      it('returns 401 for unauthenticated users', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Unauthorized' },
        })

        const response = await GET()
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.success).toBe(false)
      })
    })

    describe('Happy Path', () => {
      it('returns list of cheatsheets', async () => {
        const response = await GET()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.cheatsheets).toHaveLength(2)
        expect(data.cheatsheets[0].id).toBe('cs-1')
      })

      it('returns empty array when no cheatsheets exist', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          const builder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
          }
          if (table === 'cheatsheets') {
            builder.order.mockResolvedValue({ data: [], error: null })
          }
          return builder
        })

        const response = await GET()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.cheatsheets).toEqual([])
      })
    })

    describe('Error Handling', () => {
      it('returns 500 when database query fails', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          const builder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
          }
          if (table === 'cheatsheets') {
            builder.order.mockResolvedValue({ data: null, error: { message: 'DB error' } })
          }
          return builder
        })

        const response = await GET()
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
      })
    })
  })

  describe('POST /api/cheatsheets', () => {
    describe('Authentication', () => {
      it('returns 401 for unauthenticated users', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Unauthorized' },
        })

        const request = new NextRequest('http://localhost/api/cheatsheets', {
          method: 'POST',
          body: JSON.stringify({ courseId: 'course-1' }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.success).toBe(false)
      })
    })

    describe('Validation', () => {
      it('returns 400 if courseId is missing', async () => {
        const request = new NextRequest('http://localhost/api/cheatsheets', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error.message).toContain('courseId')
      })
    })

    describe('Happy Path', () => {
      it('generates and saves a cheatsheet', async () => {
        const { generateCheatsheet } = require('@/lib/cheatsheet/generator')

        const request = new NextRequest('http://localhost/api/cheatsheets', {
          method: 'POST',
          body: JSON.stringify({ courseId: 'course-1' }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.cheatsheetId).toBe('cs-new')
        expect(data.cheatsheet).toBeDefined()
        expect(data.cheatsheet.blocks).toHaveLength(3)
        expect(generateCheatsheet).toHaveBeenCalledWith('Biology 101', expect.any(Array))
      })

      it('filters example blocks in exam mode', async () => {
        const request = new NextRequest('http://localhost/api/cheatsheets', {
          method: 'POST',
          body: JSON.stringify({ courseId: 'course-1', examMode: true }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        // The example block should be filtered out in exam mode
        const exampleBlocks = data.cheatsheet.blocks.filter((b: any) => b.type === 'example')
        expect(exampleBlocks).toHaveLength(0)
      })
    })

    describe('Error Handling', () => {
      it('returns 400 when course not found', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          const builder = {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            single: jest.fn(),
          }
          if (table === 'courses') {
            builder.single.mockResolvedValue({ data: null, error: { message: 'Not found' } })
          }
          return builder
        })

        const request = new NextRequest('http://localhost/api/cheatsheets', {
          method: 'POST',
          body: JSON.stringify({ courseId: 'nonexistent' }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error.message).toContain('Course not found')
      })

      it('returns 400 when course has no lessons', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
          const builder = {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            single: jest.fn(),
          }
          if (table === 'courses') {
            builder.single.mockResolvedValue({
              data: { title: 'Empty Course', generated_course: { lessons: [] } },
              error: null,
            })
          }
          return builder
        })

        const request = new NextRequest('http://localhost/api/cheatsheets', {
          method: 'POST',
          body: JSON.stringify({ courseId: 'course-empty' }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error.message).toContain('no lessons')
      })
    })
  })
})
