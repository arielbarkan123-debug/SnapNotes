import { uploadStepImages, generateDiagramHash } from '@/lib/diagram-engine/step-capture/upload-steps'

// Mock Supabase
const mockUpload = jest.fn()
const mockGetPublicUrl = jest.fn()
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    storage: {
      from: jest.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })),
    },
  }),
}))

beforeEach(() => {
  mockUpload.mockReset()
  mockGetPublicUrl.mockReset()
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('generateDiagramHash', () => {
  it('returns a short hex string', () => {
    const hash = generateDiagramHash('some question', 'tikz')
    expect(hash).toMatch(/^[a-f0-9]{12}$/)
  })

  it('same input produces same hash', () => {
    const a = generateDiagramHash('force diagram', 'tikz')
    const b = generateDiagramHash('force diagram', 'tikz')
    expect(a).toBe(b)
  })

  it('different input produces different hash', () => {
    const a = generateDiagramHash('force diagram', 'tikz')
    const b = generateDiagramHash('graph y=x^2', 'e2b')
    expect(a).not.toBe(b)
  })
})

describe('uploadStepImages', () => {
  it('uploads N buffers and returns N URLs', async () => {
    mockUpload.mockResolvedValue({ data: { path: 'test/path' }, error: null })
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://storage.example.com/test/path' },
    })

    const buffers = [
      Buffer.from('fake-png-1'),
      Buffer.from('fake-png-2'),
      Buffer.from('fake-png-3'),
    ]

    const urls = await uploadStepImages(buffers, 'user_123', 'abc123')
    expect(urls).toHaveLength(3)
    expect(urls[0]).toBe('https://storage.example.com/test/path')
    expect(mockUpload).toHaveBeenCalledTimes(3)
  })

  it('returns null for failed uploads', async () => {
    mockUpload
      .mockResolvedValueOnce({ data: { path: 'ok' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'quota exceeded' } })

    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://storage.example.com/ok' },
    })

    const buffers = [Buffer.from('a'), Buffer.from('b')]
    const urls = await uploadStepImages(buffers, 'user_123', 'abc123')
    expect(urls).toHaveLength(2)
    expect(urls[0]).toBe('https://storage.example.com/ok')
    expect(urls[1]).toBeNull()
  })

  it('returns all null on complete failure', async () => {
    mockUpload.mockResolvedValue({ data: null, error: { message: 'down' } })

    const urls = await uploadStepImages([Buffer.from('a')], 'user_123', 'hash')
    expect(urls).toEqual([null])
  })
})
