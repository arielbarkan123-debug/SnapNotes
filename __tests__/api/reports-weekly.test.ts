/**
 * Tests for Weekly Reports API
 * GET /api/reports/weekly - Preview report (returns HTML)
 * POST /api/reports/weekly - Send report to parent email
 */

import { GET, POST } from '@/app/api/reports/weekly/route'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/email/report-generator', () => ({
  generateWeeklyReport: jest.fn(),
}))

jest.mock('@/lib/email/templates/WeeklyProgressReport', () => ({
  generateReportHtml: jest.fn(),
}))

jest.mock('@/lib/email/resend-client', () => ({
  sendEmail: jest.fn(),
}))

describe('Reports Weekly API', () => {
  let mockSupabase: any

  const mockReportData = {
    studentName: 'Test Student',
    periodStart: '2026-02-22',
    periodEnd: '2026-03-01',
    stats: {
      totalSessions: 5,
      questionsAnswered: 80,
      accuracy: 75,
      currentStreak: 3,
      studyMinutes: 120,
    },
    masteryChanges: [],
  }

  const mockHtml = '<html><body><h1>Weekly Report</h1></body></html>'

  function createMockSupabase(profileData: any = { parent_email: 'parent@example.com', reports_enabled: true }) {
    return {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'user_learning_profile') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: profileData,
                  error: null,
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }
      }),
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = createMockSupabase()

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)

    const { generateWeeklyReport } = require('@/lib/email/report-generator')
    generateWeeklyReport.mockResolvedValue(mockReportData)

    const { generateReportHtml } = require('@/lib/email/templates/WeeklyProgressReport')
    generateReportHtml.mockReturnValue(mockHtml)

    const { sendEmail } = require('@/lib/email/resend-client')
    sendEmail.mockResolvedValue({ success: true, id: 'email-123' })
  })

  describe('GET /api/reports/weekly', () => {
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
      it('returns HTML report preview', async () => {
        const { generateWeeklyReport } = require('@/lib/email/report-generator')
        const { generateReportHtml } = require('@/lib/email/templates/WeeklyProgressReport')

        const response = await GET()
        const html = await response.text()

        expect(response.status).toBe(200)
        expect(response.headers.get('Content-Type')).toContain('text/html')
        expect(html).toContain('Weekly Report')
        expect(generateWeeklyReport).toHaveBeenCalledWith('user-123')
        expect(generateReportHtml).toHaveBeenCalledWith(mockReportData, expect.any(String))
      })
    })

    describe('Error Handling', () => {
      it('returns 500 when report generation fails', async () => {
        const { generateWeeklyReport } = require('@/lib/email/report-generator')
        generateWeeklyReport.mockRejectedValue(new Error('Generation failed'))

        const response = await GET()
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
      })
    })
  })

  describe('POST /api/reports/weekly', () => {
    describe('Authentication', () => {
      it('returns 401 for unauthenticated users', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Unauthorized' },
        })

        const response = await POST()
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.success).toBe(false)
      })
    })

    describe('Validation', () => {
      it('returns 400 if parent_email not configured', async () => {
        const { createClient } = require('@/lib/supabase/server')
        const noEmailMock = createMockSupabase({ parent_email: null, reports_enabled: false })
        noEmailMock.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        })
        createClient.mockResolvedValue(noEmailMock)

        const response = await POST()
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error.message).toContain('not configured')
      })

      it('returns 400 if reports_enabled is false', async () => {
        const { createClient } = require('@/lib/supabase/server')
        const disabledMock = createMockSupabase({ parent_email: 'parent@example.com', reports_enabled: false })
        disabledMock.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        })
        createClient.mockResolvedValue(disabledMock)

        const response = await POST()
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error.message).toContain('not configured')
      })
    })

    describe('Happy Path', () => {
      it('sends email and returns emailId', async () => {
        const { sendEmail } = require('@/lib/email/resend-client')

        const response = await POST()
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.emailId).toBe('email-123')
        expect(sendEmail).toHaveBeenCalledWith({
          to: 'parent@example.com',
          subject: expect.stringContaining('Test Student'),
          html: mockHtml,
        })
      })
    })

    describe('Error Handling', () => {
      it('returns 500 when email send fails', async () => {
        const { sendEmail } = require('@/lib/email/resend-client')
        sendEmail.mockResolvedValue({ success: false, error: 'SMTP error' })

        const response = await POST()
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
      })
    })
  })
})
