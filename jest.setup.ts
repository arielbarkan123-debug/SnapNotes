import '@testing-library/jest-dom'

// Polyfill for Request/Response in Node environment
import { TextEncoder, TextDecoder } from 'util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as typeof global.TextDecoder

// Mock Request and Response for Next.js API route testing
// These are needed because Next.js server components use these globals
if (typeof global.Request === 'undefined') {
  // @ts-ignore
  global.Request = class Request {
    private _url: string
    private _method: string
    private _headers: Headers
    private _body: any

    constructor(input: string | Request, init?: RequestInit) {
      if (typeof input === 'string') {
        this._url = input
      } else {
        this._url = input.url
      }
      this._method = init?.method || 'GET'
      this._headers = new Headers(init?.headers)
      this._body = init?.body
    }

    get url(): string {
      return this._url
    }

    get method(): string {
      return this._method
    }

    get headers(): Headers {
      return this._headers
    }

    get body(): any {
      return this._body
    }

    async json() {
      if (typeof this._body === 'string') {
        return JSON.parse(this._body)
      }
      return this._body
    }

    async text() {
      if (typeof this._body === 'string') {
        return this._body
      }
      return JSON.stringify(this._body)
    }

    clone() {
      return new Request(this._url, {
        method: this._method,
        headers: this._headers,
        body: this._body,
      })
    }
  }
}

if (typeof global.Response === 'undefined') {
  // @ts-ignore
  global.Response = class Response {
    body: any
    status: number
    headers: Headers
    ok: boolean

    constructor(body?: BodyInit | null, init?: ResponseInit) {
      this.body = body
      this.status = init?.status || 200
      this.headers = new Headers(init?.headers)
      this.ok = this.status >= 200 && this.status < 300
    }

    async json() {
      if (typeof this.body === 'string') {
        return JSON.parse(this.body)
      }
      return this.body
    }

    async text() {
      if (typeof this.body === 'string') {
        return this.body
      }
      return JSON.stringify(this.body)
    }

    // Static json method needed by NextResponse.json()
    static json(data: unknown, init?: ResponseInit) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers instanceof Headers
            ? Object.fromEntries(init.headers.entries())
            : init?.headers),
        },
      })
    }
  }
}

if (typeof global.Headers === 'undefined') {
  // @ts-ignore
  global.Headers = class Headers {
    private headers: Map<string, string> = new Map()

    constructor(init?: HeadersInit) {
      if (init) {
        if (Array.isArray(init)) {
          init.forEach(([key, value]) => this.set(key, value))
        } else if (init instanceof Headers) {
          init.forEach((value, key) => this.set(key, value))
        } else {
          Object.entries(init).forEach(([key, value]) => this.set(key, value))
        }
      }
    }

    get(name: string) {
      return this.headers.get(name.toLowerCase()) || null
    }

    set(name: string, value: string) {
      this.headers.set(name.toLowerCase(), value)
    }

    has(name: string) {
      return this.headers.has(name.toLowerCase())
    }

    delete(name: string) {
      this.headers.delete(name.toLowerCase())
    }

    forEach(callback: (value: string, key: string, parent: Headers) => void) {
      this.headers.forEach((value, key) => callback(value, key, this))
    }
  }
}

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'

// Suppress console errors during tests (optional)
// const originalError = console.error
// beforeAll(() => {
//   console.error = jest.fn()
// })
// afterAll(() => {
//   console.error = originalError
// })
