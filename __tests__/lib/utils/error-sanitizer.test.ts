/**
 * Tests for error sanitizer utility
 */

import { sanitizeError, createErrorHandler } from '@/lib/utils/error-sanitizer'

describe('sanitizeError', () => {
  describe('with Error objects', () => {
    it('maps Safari JSON parse error to user-friendly message', () => {
      const error = new Error('SyntaxError: The string did not match the expected pattern')
      expect(sanitizeError(error)).toBe('Server error. Please try again.')
    })

    it('maps network error to user-friendly message', () => {
      const error = new Error('Network error')
      expect(sanitizeError(error)).toBe('Connection error. Please check your internet and try again.')
    })

    it('maps abort error to user-friendly message', () => {
      const error = new Error('AbortError: The operation was aborted')
      expect(sanitizeError(error)).toBe('Request timed out. Please try again.')
    })

    it('maps timeout error to user-friendly message', () => {
      const error = new Error('Request timed out')
      expect(sanitizeError(error)).toBe('Request timed out. Please try again.')
    })

    it('maps JSON parse error to user-friendly message', () => {
      const error = new Error('Unexpected token < in JSON')
      expect(sanitizeError(error)).toBe('Server error. Please try again.')
    })

    it('maps CORS error to user-friendly message', () => {
      const error = new Error('Request blocked by CORS policy')
      expect(sanitizeError(error)).toBe('Connection blocked. Please try again.')
    })

    it('maps SSL error to user-friendly message', () => {
      const error = new Error('SSL certificate error')
      expect(sanitizeError(error)).toBe('Secure connection error. Please try again.')
    })
  })

  describe('with string errors', () => {
    it('handles string errors', () => {
      expect(sanitizeError('Network error occurred')).toBe('Connection error. Please check your internet and try again.')
    })

    it('preserves user-friendly strings', () => {
      expect(sanitizeError('Please enter a valid email')).toBe('Please enter a valid email')
    })
  })

  describe('with user-friendly messages', () => {
    it('preserves messages containing "please"', () => {
      const error = new Error('Please log in to continue')
      expect(sanitizeError(error)).toBe('Please log in to continue')
    })

    it('preserves messages containing "try again"', () => {
      const error = new Error('Something failed. Try again later.')
      expect(sanitizeError(error)).toBe('Something failed. Try again later.')
    })

    it('preserves messages containing "not found"', () => {
      const error = new Error('Course not found')
      expect(sanitizeError(error)).toBe('Course not found')
    })

    it('preserves messages containing "invalid"', () => {
      const error = new Error('Invalid email format')
      expect(sanitizeError(error)).toBe('Invalid email format')
    })

    it('preserves messages containing "unauthorized"', () => {
      const error = new Error('Unauthorized access')
      expect(sanitizeError(error)).toBe('Unauthorized access')
    })
  })

  describe('with unknown error types', () => {
    it('returns fallback for null', () => {
      expect(sanitizeError(null)).toBe('Something went wrong. Please try again.')
    })

    it('returns fallback for undefined', () => {
      expect(sanitizeError(undefined)).toBe('Something went wrong. Please try again.')
    })

    it('returns fallback for numbers', () => {
      expect(sanitizeError(404)).toBe('Something went wrong. Please try again.')
    })

    it('handles objects with message property', () => {
      const error = { message: 'Load failed' }
      expect(sanitizeError(error)).toBe('Connection error. Please check your internet and try again.')
    })

    it('uses custom fallback when provided', () => {
      expect(sanitizeError(null, 'Custom error message')).toBe('Custom error message')
    })
  })

  describe('unmapped errors', () => {
    it('returns fallback for unmapped error messages', () => {
      const error = new Error('some random technical error xyz123')
      expect(sanitizeError(error)).toBe('Something went wrong. Please try again.')
    })
  })

  describe('Safari/iOS specific errors', () => {
    it('maps Safari "Load failed" error', () => {
      const error = new Error('Load failed')
      expect(sanitizeError(error)).toBe('Connection error. Please check your internet and try again.')
    })

    it('maps Safari "The network connection was lost" error', () => {
      const error = new Error('The network connection was lost')
      expect(sanitizeError(error)).toBe('Connection error. Please check your internet and try again.')
    })

    it('maps Safari DNS error', () => {
      const error = new Error('A server with the specified hostname could not be found')
      expect(sanitizeError(error)).toBe('Connection error. Please check your internet and try again.')
    })

    it('maps Safari offline message', () => {
      const error = new Error('The Internet connection appears to be offline')
      expect(sanitizeError(error)).toBe('You appear to be offline. Please check your connection.')
    })

    it('maps Safari cancelled request (British spelling)', () => {
      const error = new Error('The request was cancelled')
      expect(sanitizeError(error)).toBe('Request timed out. Please try again.')
    })

    it('maps Safari JSON parse error pattern', () => {
      const error = new Error('The string did not match the expected pattern')
      expect(sanitizeError(error)).toBe('Server error. Please try again.')
    })

    it('maps iOS SSL certificate error', () => {
      const error = new Error('Cannot verify server identity')
      expect(sanitizeError(error)).toBe('Secure connection error. Please try again.')
    })

    it('maps Safari connection error', () => {
      const error = new Error('Could not connect to the server')
      expect(sanitizeError(error)).toBe('Connection error. Please check your internet and try again.')
    })

    it('maps Safari generic operation error', () => {
      const error = new Error("The operation couldn't be completed")
      expect(sanitizeError(error)).toBe('Connection error. Please check your internet and try again.')
    })
  })
})

describe('createErrorHandler', () => {
  it('creates a handler function that sanitizes errors', () => {
    const setError = jest.fn()
    const handler = createErrorHandler(setError)

    handler(new Error('Load failed'))

    expect(setError).toHaveBeenCalledWith('Connection error. Please check your internet and try again.')
  })

  it('uses custom fallback when provided', () => {
    const setError = jest.fn()
    const handler = createErrorHandler(setError, 'Custom fallback')

    handler('some unmapped error')

    expect(setError).toHaveBeenCalledWith('Custom fallback')
  })
})
