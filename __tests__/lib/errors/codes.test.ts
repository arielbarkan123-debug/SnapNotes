/**
 * Tests for Error Code System
 * lib/errors/codes.ts
 *
 * Validates: format (NS-{AREA}-{NNN}), global uniqueness, per-category prefix,
 * getErrorCategory, isErrorCategory, and spot-checks on combined ErrorCodes.
 */

import {
  AuthErrorCodes,
  CourseErrorCodes,
  HomeworkErrorCodes,
  PracticeErrorCodes,
  ExamErrorCodes,
  UploadErrorCodes,
  DocumentErrorCodes,
  AIErrorCodes,
  DatabaseErrorCodes,
  GamificationErrorCodes,
  AnalyticsErrorCodes,
  UserErrorCodes,
  ClientErrorCodes,
  DeviceErrorCodes,
  PlatformErrorCodes,
  MemoryErrorCodes,
  RateLimitErrorCodes,
  ValidationErrorCodes,
  ExternalErrorCodes,
  MonitoringErrorCodes,
  AdaptiveErrorCodes,
  HelpErrorCodes,
  PerformanceErrorCodes,
  ErrorCodes,
  getErrorCategory,
  isErrorCategory,
  type ErrorCode,
  type ErrorCategory,
} from '@/lib/errors/codes'

// ============================================================================
// Helpers
// ============================================================================

const ERROR_CODE_FORMAT = /^NS-[A-Z]+-\d{3}$/

/** Map of category objects to their expected prefix */
const CATEGORY_MAP: [Record<string, string>, string][] = [
  [AuthErrorCodes, 'NS-AUTH-'],
  [CourseErrorCodes, 'NS-CRS-'],
  [HomeworkErrorCodes, 'NS-HW-'],
  [PracticeErrorCodes, 'NS-PRAC-'],
  [ExamErrorCodes, 'NS-EXAM-'],
  [UploadErrorCodes, 'NS-UPL-'],
  [DocumentErrorCodes, 'NS-DOC-'],
  [AIErrorCodes, 'NS-AI-'],
  [DatabaseErrorCodes, 'NS-DB-'],
  [GamificationErrorCodes, 'NS-GAME-'],
  [AnalyticsErrorCodes, 'NS-ANLYT-'],
  [UserErrorCodes, 'NS-USER-'],
  [ClientErrorCodes, 'NS-CLIENT-'],
  [DeviceErrorCodes, 'NS-DEV-'],
  [PlatformErrorCodes, 'NS-PLAT-'],
  [MemoryErrorCodes, 'NS-MEM-'],
  [RateLimitErrorCodes, 'NS-RATE-'],
  [ValidationErrorCodes, 'NS-VAL-'],
  [ExternalErrorCodes, 'NS-EXT-'],
  [MonitoringErrorCodes, 'NS-MON-'],
  [AdaptiveErrorCodes, 'NS-ADPT-'],
  [HelpErrorCodes, 'NS-HELP-'],
  [PerformanceErrorCodes, 'NS-PERF-'],
]

// ============================================================================
// Tests
// ============================================================================

describe('Error Code System', () => {
  describe('Format validation (NS-{AREA}-{NNN})', () => {
    it.each(CATEGORY_MAP)(
      'all codes in category %# match NS-{AREA}-{NNN} format',
      (categoryObj) => {
        const codes = Object.values(categoryObj)
        for (const code of codes) {
          expect(code).toMatch(ERROR_CODE_FORMAT)
        }
      }
    )
  })

  describe('Per-category prefix validation', () => {
    it.each(CATEGORY_MAP)(
      'all codes in category %# share the expected prefix',
      (categoryObj, expectedPrefix) => {
        const codes = Object.values(categoryObj)
        for (const code of codes) {
          expect(code.startsWith(expectedPrefix)).toBe(true)
        }
      }
    )
  })

  describe('Global uniqueness', () => {
    it('all error code values are globally unique', () => {
      const allCodes = Object.values(ErrorCodes)
      const uniqueCodes = new Set(allCodes)
      expect(uniqueCodes.size).toBe(allCodes.length)
    })

    it('all error code keys are unique across categories', () => {
      const allKeys: string[] = []
      for (const [categoryObj] of CATEGORY_MAP) {
        allKeys.push(...Object.keys(categoryObj))
      }
      const uniqueKeys = new Set(allKeys)
      expect(uniqueKeys.size).toBe(allKeys.length)
    })
  })

  describe('Combined ErrorCodes object', () => {
    it('contains all auth error codes', () => {
      for (const [key, value] of Object.entries(AuthErrorCodes)) {
        expect((ErrorCodes as Record<string, string>)[key]).toBe(value)
      }
    })

    it('contains all course error codes', () => {
      for (const [key, value] of Object.entries(CourseErrorCodes)) {
        expect((ErrorCodes as Record<string, string>)[key]).toBe(value)
      }
    })

    it('contains all homework error codes', () => {
      for (const [key, value] of Object.entries(HomeworkErrorCodes)) {
        expect((ErrorCodes as Record<string, string>)[key]).toBe(value)
      }
    })

    it('contains all practice error codes', () => {
      for (const [key, value] of Object.entries(PracticeErrorCodes)) {
        expect((ErrorCodes as Record<string, string>)[key]).toBe(value)
      }
    })

    it('contains all exam error codes', () => {
      for (const [key, value] of Object.entries(ExamErrorCodes)) {
        expect((ErrorCodes as Record<string, string>)[key]).toBe(value)
      }
    })

    it('contains all upload error codes', () => {
      for (const [key, value] of Object.entries(UploadErrorCodes)) {
        expect((ErrorCodes as Record<string, string>)[key]).toBe(value)
      }
    })

    it('contains all document error codes', () => {
      for (const [key, value] of Object.entries(DocumentErrorCodes)) {
        expect((ErrorCodes as Record<string, string>)[key]).toBe(value)
      }
    })

    it('contains all AI error codes', () => {
      for (const [key, value] of Object.entries(AIErrorCodes)) {
        expect((ErrorCodes as Record<string, string>)[key]).toBe(value)
      }
    })

    it('contains all database error codes', () => {
      for (const [key, value] of Object.entries(DatabaseErrorCodes)) {
        expect((ErrorCodes as Record<string, string>)[key]).toBe(value)
      }
    })

    it('contains all gamification error codes', () => {
      for (const [key, value] of Object.entries(GamificationErrorCodes)) {
        expect((ErrorCodes as Record<string, string>)[key]).toBe(value)
      }
    })

    it('contains all analytics error codes', () => {
      for (const [key, value] of Object.entries(AnalyticsErrorCodes)) {
        expect((ErrorCodes as Record<string, string>)[key]).toBe(value)
      }
    })

    it('contains all user error codes', () => {
      for (const [key, value] of Object.entries(UserErrorCodes)) {
        expect((ErrorCodes as Record<string, string>)[key]).toBe(value)
      }
    })

    it('contains all client error codes', () => {
      for (const [key, value] of Object.entries(ClientErrorCodes)) {
        expect((ErrorCodes as Record<string, string>)[key]).toBe(value)
      }
    })

    it('contains all device error codes', () => {
      for (const [key, value] of Object.entries(DeviceErrorCodes)) {
        expect((ErrorCodes as Record<string, string>)[key]).toBe(value)
      }
    })

    it('contains all platform error codes', () => {
      for (const [key, value] of Object.entries(PlatformErrorCodes)) {
        expect((ErrorCodes as Record<string, string>)[key]).toBe(value)
      }
    })

    it('contains all memory error codes', () => {
      for (const [key, value] of Object.entries(MemoryErrorCodes)) {
        expect((ErrorCodes as Record<string, string>)[key]).toBe(value)
      }
    })

    it('contains all rate limit error codes', () => {
      for (const [key, value] of Object.entries(RateLimitErrorCodes)) {
        expect((ErrorCodes as Record<string, string>)[key]).toBe(value)
      }
    })

    it('contains all validation error codes', () => {
      for (const [key, value] of Object.entries(ValidationErrorCodes)) {
        expect((ErrorCodes as Record<string, string>)[key]).toBe(value)
      }
    })

    it('contains all external error codes', () => {
      for (const [key, value] of Object.entries(ExternalErrorCodes)) {
        expect((ErrorCodes as Record<string, string>)[key]).toBe(value)
      }
    })

    it('contains all monitoring error codes', () => {
      for (const [key, value] of Object.entries(MonitoringErrorCodes)) {
        expect((ErrorCodes as Record<string, string>)[key]).toBe(value)
      }
    })

    it('contains all adaptive error codes', () => {
      for (const [key, value] of Object.entries(AdaptiveErrorCodes)) {
        expect((ErrorCodes as Record<string, string>)[key]).toBe(value)
      }
    })

    it('contains all help error codes', () => {
      for (const [key, value] of Object.entries(HelpErrorCodes)) {
        expect((ErrorCodes as Record<string, string>)[key]).toBe(value)
      }
    })

    it('contains all performance error codes', () => {
      for (const [key, value] of Object.entries(PerformanceErrorCodes)) {
        expect((ErrorCodes as Record<string, string>)[key]).toBe(value)
      }
    })
  })

  describe('Spot checks', () => {
    it('UNAUTHORIZED is NS-AUTH-090', () => {
      expect(ErrorCodes.UNAUTHORIZED).toBe('NS-AUTH-090')
    })

    it('FORBIDDEN is NS-AUTH-091', () => {
      expect(ErrorCodes.FORBIDDEN).toBe('NS-AUTH-091')
    })

    it('COURSE_NOT_FOUND is NS-CRS-001', () => {
      expect(ErrorCodes.COURSE_NOT_FOUND).toBe('NS-CRS-001')
    })

    it('QUERY_FAILED is NS-DB-001', () => {
      expect(ErrorCodes.QUERY_FAILED).toBe('NS-DB-001')
    })

    it('DATABASE_UNKNOWN is NS-DB-099', () => {
      expect(ErrorCodes.DATABASE_UNKNOWN).toBe('NS-DB-099')
    })

    it('FILE_TOO_LARGE is NS-UPL-001', () => {
      expect(ErrorCodes.FILE_TOO_LARGE).toBe('NS-UPL-001')
    })

    it('API_UNAVAILABLE is NS-AI-001', () => {
      expect(ErrorCodes.API_UNAVAILABLE).toBe('NS-AI-001')
    })

    it('FIELD_REQUIRED is NS-VAL-010', () => {
      expect(ErrorCodes.FIELD_REQUIRED).toBe('NS-VAL-010')
    })

    it('NETWORK_REQUEST_FAILED is NS-CLIENT-001', () => {
      expect(ErrorCodes.NETWORK_REQUEST_FAILED).toBe('NS-CLIENT-001')
    })

    it('CAMERA_PERMISSION_DENIED is NS-DEV-001', () => {
      expect(ErrorCodes.CAMERA_PERMISSION_DENIED).toBe('NS-DEV-001')
    })
  })

  describe('getErrorCategory', () => {
    it('extracts AUTH from auth codes', () => {
      expect(getErrorCategory('NS-AUTH-001' as ErrorCode)).toBe('AUTH')
    })

    it('extracts CRS from course codes', () => {
      expect(getErrorCategory('NS-CRS-050' as ErrorCode)).toBe('CRS')
    })

    it('extracts DB from database codes', () => {
      expect(getErrorCategory('NS-DB-099' as ErrorCode)).toBe('DB')
    })

    it('extracts CLIENT from client codes', () => {
      expect(getErrorCategory('NS-CLIENT-020' as ErrorCode)).toBe('CLIENT')
    })

    it('extracts ANLYT from analytics codes', () => {
      expect(getErrorCategory('NS-ANLYT-001' as ErrorCode)).toBe('ANLYT')
    })

    it('extracts PLAT from platform codes', () => {
      expect(getErrorCategory('NS-PLAT-001' as ErrorCode)).toBe('PLAT')
    })

    it('throws for invalid format', () => {
      expect(() => getErrorCategory('INVALID' as ErrorCode)).toThrow('Invalid error code format')
    })
  })

  describe('isErrorCategory', () => {
    it('returns true for matching category', () => {
      expect(isErrorCategory('NS-AUTH-001' as ErrorCode, 'AUTH')).toBe(true)
    })

    it('returns false for non-matching category', () => {
      expect(isErrorCategory('NS-AUTH-001' as ErrorCode, 'DB')).toBe(false)
    })

    it('works with multi-letter categories', () => {
      expect(isErrorCategory('NS-CLIENT-020' as ErrorCode, 'CLIENT')).toBe(true)
      expect(isErrorCategory('NS-ANLYT-001' as ErrorCode, 'ANLYT')).toBe(true)
      expect(isErrorCategory('NS-PRAC-010' as ErrorCode, 'PRAC')).toBe(true)
    })

    it('returns false for partial prefix match', () => {
      // NS-AUTH-001 should not match category 'A'
      expect(isErrorCategory('NS-AUTH-001' as ErrorCode, 'A' as ErrorCategory)).toBe(false)
    })
  })

  describe('Category count validation', () => {
    it('has 23 error code categories', () => {
      expect(CATEGORY_MAP).toHaveLength(23)
    })

    it('total error codes exceed 200', () => {
      const totalCodes = Object.values(ErrorCodes).length
      expect(totalCodes).toBeGreaterThan(200)
    })
  })
})
