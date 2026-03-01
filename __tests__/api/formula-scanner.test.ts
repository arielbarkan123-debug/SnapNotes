/**
 * Tests for Formula Scanner Analyze API
 * POST /api/formula-scanner/analyze
 */

import { POST } from '@/app/api/formula-scanner/analyze/route'
import { NextRequest } from 'next/server'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/formula-scanner/analyzer', () => ({
  analyzeFormulaFromText: jest.fn(),
  analyzeFormulaFromImage: jest.fn(),
}))

describe('Formula Scanner API - POST /api/formula-scanner/analyze', () => {
  let mockSupabase: any

  const mockAnalysis = {
    latex: 'E = mc^2',
    name: 'Mass-energy equivalence',
    nameHe: 'שקילות מסה-אנרגיה',
    subject: 'Physics',
    symbols: [
      { symbol: 'E', latex: 'E', name: 'Energy', nameHe: 'אנרגיה', meaning: 'Energy', meaningHe: 'אנרגיה', units: 'Joules (J)' },
    ],
    derivation: 'Derived from special relativity',
    derivationHe: 'נגזר מתורת היחסות הפרטית',
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
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)

    const { analyzeFormulaFromText, analyzeFormulaFromImage } = require('@/lib/formula-scanner/analyzer')
    analyzeFormulaFromText.mockResolvedValue(mockAnalysis)
    analyzeFormulaFromImage.mockResolvedValue(mockAnalysis)
  })

  describe('Authentication', () => {
    it('returns 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const request = new NextRequest('http://localhost/api/formula-scanner/analyze', {
        method: 'POST',
        body: JSON.stringify({ latexText: 'E = mc^2' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })

  describe('Validation', () => {
    it('returns 400 if neither imageUrl nor latexText provided', async () => {
      const request = new NextRequest('http://localhost/api/formula-scanner/analyze', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.message).toContain('imageUrl or latexText')
    })
  })

  describe('Happy Path - latexText', () => {
    it('analyzes formula from latexText', async () => {
      const { analyzeFormulaFromText } = require('@/lib/formula-scanner/analyzer')

      const request = new NextRequest('http://localhost/api/formula-scanner/analyze', {
        method: 'POST',
        body: JSON.stringify({ latexText: 'E = mc^2' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.analysis).toEqual(mockAnalysis)
      expect(analyzeFormulaFromText).toHaveBeenCalledWith('E = mc^2')
    })
  })

  describe('Happy Path - imageUrl', () => {
    it('analyzes formula from imageUrl', async () => {
      const { analyzeFormulaFromImage } = require('@/lib/formula-scanner/analyzer')

      const request = new NextRequest('http://localhost/api/formula-scanner/analyze', {
        method: 'POST',
        body: JSON.stringify({ imageUrl: 'https://example.com/formula.png' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.analysis).toEqual(mockAnalysis)
      expect(analyzeFormulaFromImage).toHaveBeenCalledWith('https://example.com/formula.png')
    })
  })

  describe('Priority', () => {
    it('prefers latexText over imageUrl when both provided', async () => {
      const { analyzeFormulaFromText, analyzeFormulaFromImage } = require('@/lib/formula-scanner/analyzer')

      const request = new NextRequest('http://localhost/api/formula-scanner/analyze', {
        method: 'POST',
        body: JSON.stringify({
          latexText: 'E = mc^2',
          imageUrl: 'https://example.com/formula.png',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(analyzeFormulaFromText).toHaveBeenCalledWith('E = mc^2')
      expect(analyzeFormulaFromImage).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('returns 500 when analyzer throws', async () => {
      const { analyzeFormulaFromText } = require('@/lib/formula-scanner/analyzer')
      analyzeFormulaFromText.mockRejectedValue(new Error('Analysis failed'))

      const request = new NextRequest('http://localhost/api/formula-scanner/analyze', {
        method: 'POST',
        body: JSON.stringify({ latexText: 'invalid' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.message).toContain('Analysis failed')
    })
  })
})
