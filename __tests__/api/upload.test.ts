/**
 * Tests for Upload APIs
 * POST /api/upload - Single file upload
 * POST /api/upload-images - Multi-image upload
 * POST /api/upload-document - Document upload
 */

import { NextRequest } from 'next/server'

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/api/errors', () => ({
  createErrorResponse: jest.fn().mockImplementation((code: string, message?: string, status?: number) => {
    const { NextResponse } = require('next/server')
    const statusMap: Record<string, number> = {
      'NS-AUTH-090': 401,
      'NS-VAL-014': 400,
      'NS-VAL-010': 400,
      'NS-UPL-001': 400,
      'NS-UPL-002': 400,
      'NS-UPL-010': 500,
      'NS-UPL-011': 500,
      'NS-VAL-099': status || 400,
      'NS-DB-099': 500,
    }
    return NextResponse.json(
      { success: false, error: { code, message: message || code } },
      { status: status || statusMap[code] || 500 }
    )
  }),
  ErrorCodes: {
    UNAUTHORIZED: 'NS-AUTH-090',
    INVALID_INPUT: 'NS-VAL-014',
    MISSING_FIELD: 'NS-VAL-010',
    FILE_TOO_LARGE: 'NS-UPL-001',
    INVALID_FILE_TYPE: 'NS-UPL-002',
    UPLOAD_FAILED: 'NS-UPL-010',
    STORAGE_QUOTA_EXCEEDED: 'NS-UPL-011',
    VALIDATION_ERROR: 'NS-VAL-099',
    INTERNAL_ERROR: 'NS-DB-099',
  },
  logError: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}))

jest.mock('@/lib/documents', () => ({
  processDocument: jest.fn(),
  getFileType: jest.fn(),
  getFileTypeFromExtension: jest.fn(),
}))

describe('Upload API - /api/upload', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
      storage: {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({
            data: { path: 'user-123/12345-abc.jpg' },
            error: null,
          }),
          getPublicUrl: jest.fn().mockReturnValue({
            data: { publicUrl: 'https://storage.example.com/notebook-images/user-123/12345-abc.jpg' },
          }),
          createSignedUrl: jest.fn().mockResolvedValue({
            data: { signedUrl: 'https://storage.example.com/signed/user-123/12345-abc.jpg' },
            error: null,
          }),
        }),
      },
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)
  })

  describe('POST /api/upload', () => {
    let POST: typeof import('@/app/api/upload/route').POST

    beforeEach(async () => {
      const mod = await import('@/app/api/upload/route')
      POST = mod.POST
    })

    it('returns 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const formData = new FormData()
      formData.append('file', new File(['data'], 'test.jpg', { type: 'image/jpeg' }))

      const request = new NextRequest('http://localhost/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    it('returns error when no file provided', async () => {
      const formData = new FormData()
      const request = new NextRequest('http://localhost/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()
      expect(data.success).toBe(false)
    })

    it('returns error for invalid file type', async () => {
      const formData = new FormData()
      formData.append('file', new File(['data'], 'test.txt', { type: 'text/plain' }))

      const request = new NextRequest('http://localhost/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()
      expect(data.success).toBe(false)
    })

    it('returns error for oversized file', async () => {
      const bigData = new Uint8Array(11 * 1024 * 1024) // 11MB
      const formData = new FormData()
      formData.append('file', new File([bigData], 'big.jpg', { type: 'image/jpeg' }))

      const request = new NextRequest('http://localhost/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()
      expect(data.success).toBe(false)
    })

    it('uploads valid file successfully', async () => {
      // Create a mock file with working arrayBuffer
      const fileContent = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]) // JPEG header
      const mockFile = {
        name: 'photo.jpg',
        type: 'image/jpeg',
        size: fileContent.length,
        arrayBuffer: () => Promise.resolve(fileContent.buffer),
      } as unknown as File

      const mockFormData = new FormData()
      // We can't append our mock File to real FormData, so mock the whole thing
      const fakeFormData = {
        get: (key: string) => key === 'file' ? mockFile : null,
      } as unknown as FormData

      const request = new NextRequest('http://localhost/api/upload', {
        method: 'POST',
      })
      Object.defineProperty(request, 'formData', {
        value: () => Promise.resolve(fakeFormData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.imageUrl).toBeDefined()
      expect(data.fileName).toBe('photo.jpg')
      expect(data.storagePath).toBeDefined()
    })

    it('returns error when storage upload fails', async () => {
      mockSupabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Upload failed' },
        }),
        getPublicUrl: jest.fn(),
        createSignedUrl: jest.fn(),
      })

      const formData = new FormData()
      formData.append('file', new File(['data'], 'photo.jpg', { type: 'image/jpeg' }))

      const request = new NextRequest('http://localhost/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()
      expect(data.success).toBe(false)
    })

    it('returns 405 for GET requests', async () => {
      const { GET } = await import('@/app/api/upload/route')
      const response = await GET()
      expect(response.status).toBe(405)
    })

    it('falls back to public URL when signed URL fails', async () => {
      mockSupabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'user-123/12345-abc.jpg' },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.example.com/public/photo.jpg' },
        }),
        createSignedUrl: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Signed URL failed' },
        }),
      })

      const fileContent = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0])
      const mockFile = {
        name: 'photo.jpg',
        type: 'image/jpeg',
        size: fileContent.length,
        arrayBuffer: () => Promise.resolve(fileContent.buffer),
      } as unknown as File

      const fakeFormData = {
        get: (key: string) => key === 'file' ? mockFile : null,
      } as unknown as FormData

      const request = new NextRequest('http://localhost/api/upload', {
        method: 'POST',
      })
      Object.defineProperty(request, 'formData', {
        value: () => Promise.resolve(fakeFormData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.imageUrl).toBe('https://storage.example.com/public/photo.jpg')
    })
  })
})
