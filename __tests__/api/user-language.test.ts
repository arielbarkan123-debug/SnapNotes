/**
 * Tests for User Language API
 * PATCH /api/user/language - Update user language preference
 */

import { PATCH } from '@/app/api/user/language/route'
import { NextRequest } from 'next/server'

// Mock Supabase
const mockGetUser = jest.fn()
const mockUpdate = jest.fn()
const mockEq = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
    from: () => ({
      update: (data: Record<string, unknown>) => {
        mockUpdate(data)
        return { eq: mockEq }
      },
    }),
  }),
}))

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/user/language', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/user/language', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const response = await PATCH(makeRequest({ language: 'he' }))
    expect(response.status).toBe(401)

    const json = await response.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 400 for invalid language', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })

    const response = await PATCH(makeRequest({ language: 'fr' }))
    expect(response.status).toBe(400)

    const json = await response.json()
    expect(json.error).toBe('Invalid language')
  })

  it('updates language to "he" and returns 200', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
    mockEq.mockResolvedValue({ error: null })

    const response = await PATCH(makeRequest({ language: 'he' }))
    expect(response.status).toBe(200)

    const json = await response.json()
    expect(json.ok).toBe(true)

    expect(mockUpdate).toHaveBeenCalledWith({ language: 'he' })
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123')
  })

  it('updates language to "en" and returns 200', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-456' } },
    })
    mockEq.mockResolvedValue({ error: null })

    const response = await PATCH(makeRequest({ language: 'en' }))
    expect(response.status).toBe(200)

    const json = await response.json()
    expect(json.ok).toBe(true)

    expect(mockUpdate).toHaveBeenCalledWith({ language: 'en' })
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-456')
  })
})
