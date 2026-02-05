import { render } from '@testing-library/react'
import { RadicalSimplification } from '@/components/math/RadicalSimplification'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: () => Promise.resolve() }),
}))

jest.mock('@/lib/diagram-animations', () => ({
  prefersReducedMotion: () => true,
  createPathDrawVariants: () => ({ hidden: {}, visible: {} }),
}))

describe('RadicalSimplification', () => {
  const baseData = {
    originalExpression: '\u221a72',
    radicand: 72,
    index: 2,
    primeFactors: [
      { base: 2, exponent: 3 },
      { base: 3, exponent: 2 },
    ],
    extracted: 6,
    remaining: 2,
    simplifiedForm: '6\u221a2',
    steps: [
      {
        step: 0,
        type: 'identify' as const,
        description: 'Identify the radicand',
        expression: '\u221a72',
      },
      {
        step: 1,
        type: 'factor' as const,
        description: 'Find prime factorization',
        expression: '\u221a(2\u00b3 \u00d7 3\u00b2)',
      },
      {
        step: 2,
        type: 'group' as const,
        description: 'Group pairs',
        expression: '2 \u00d7 3\u221a2',
      },
      {
        step: 3,
        type: 'extract' as const,
        description: 'Extract from radical',
        expression: '6\u221a2',
      },
      {
        step: 4,
        type: 'complete' as const,
        description: 'Simplified form',
        expression: '6\u221a2',
      },
    ],
    method: 'prime_factorization' as const,
    title: 'Simplify \u221a72',
  }

  it('renders without crashing', () => {
    const { container } = render(<RadicalSimplification data={baseData} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('accepts subject prop', () => {
    const { container } = render(
      <RadicalSimplification data={baseData} subject="physics" />
    )
    expect(container.firstChild).toBeInTheDocument()
  })

  it('accepts complexity prop without errors', () => {
    const { container } = render(
      <RadicalSimplification data={baseData} complexity="elementary" />
    )
    expect(container).toBeInTheDocument()
  })

  it('uses subject color in progress gradient when subject is physics', () => {
    const { container } = render(
      <RadicalSimplification data={baseData} subject="physics" />
    )
    const styledElements = container.querySelectorAll('[style]')
    const hasPhysicsColor = Array.from(styledElements).some(
      (el) => (el as HTMLElement).style.cssText.includes('#f97316')
    )
    expect(hasPhysicsColor).toBe(true)
  })

  it('uses default math subject color in progress gradient', () => {
    const { container } = render(<RadicalSimplification data={baseData} />)
    const styledElements = container.querySelectorAll('[style]')
    const hasMathColor = Array.from(styledElements).some(
      (el) => (el as HTMLElement).style.cssText.includes('#6366f1')
    )
    expect(hasMathColor).toBe(true)
  })

  it('renders title when provided', () => {
    const { container } = render(<RadicalSimplification data={baseData} />)
    expect(container.textContent).toContain('Simplify')
  })

  it('renders method name', () => {
    const { container } = render(<RadicalSimplification data={baseData} />)
    expect(container.textContent).toContain('Prime Factorization')
  })

  it('renders step counter by default', () => {
    const { container } = render(<RadicalSimplification data={baseData} currentStep={0} />)
    expect(container.textContent).toContain('Step 1 of 5')
  })

  it('renders in Hebrew when language is he', () => {
    const { container } = render(
      <RadicalSimplification data={baseData} language="he" />
    )
    expect(container.textContent).toContain('\u05E4\u05D9\u05E8\u05D5\u05E7 \u05DC\u05D2\u05D5\u05E8\u05DE\u05D9\u05DD \u05E8\u05D0\u05E9\u05D5\u05E0\u05D9\u05D9\u05DD')
  })
})
