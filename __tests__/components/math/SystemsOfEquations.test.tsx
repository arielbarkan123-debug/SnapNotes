import { render } from '@testing-library/react'
import { SystemsOfEquations } from '@/components/math/SystemsOfEquations'

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

// Mock MathRenderer (uses katex not available in JSDOM)
jest.mock('@/components/ui/MathRenderer', () => ({
  MathText: ({ children }: any) => <span data-testid="math-text">{children}</span>,
  InlineMath: ({ children }: any) => <span data-testid="inline-math">{children}</span>,
  BlockMath: ({ children }: any) => <div data-testid="block-math">{children}</div>,
  MathRenderer: ({ latex }: any) => <span data-testid="math-renderer">{latex}</span>,
}))

describe('SystemsOfEquations', () => {
  const baseData = {
    equation1: '2x + y = 7',
    equation2: 'x - y = 2',
    variables: ['x', 'y'],
    method: 'elimination' as const,
    solutions: { x: '3', y: '1' },
    steps: [
      {
        step: 0,
        type: 'setup' as const,
        description: 'Write both equations',
        equations: [
          { leftSide: '2x + y', rightSide: '7' },
          { leftSide: 'x - y', rightSide: '2' },
        ],
      },
      {
        step: 1,
        type: 'add' as const,
        description: 'Add equations to eliminate y',
        equations: [
          { leftSide: '3x', rightSide: '9' },
        ],
        calculation: '(2x + y) + (x - y) = 7 + 2',
      },
      {
        step: 2,
        type: 'solve_variable' as const,
        description: 'Solve for x',
        equations: [
          { leftSide: 'x', rightSide: '3' },
        ],
        found: { variable: 'x', value: '3' },
        solvingFor: 'x',
      },
      {
        step: 3,
        type: 'back_substitute' as const,
        description: 'Substitute x = 3 into equation 2',
        equations: [
          { leftSide: '3 - y', rightSide: '2' },
        ],
        found: { variable: 'y', value: '1' },
      },
      {
        step: 4,
        type: 'complete' as const,
        description: 'Solution found',
        equations: [
          { leftSide: 'x', rightSide: '3' },
          { leftSide: 'y', rightSide: '1' },
        ],
      },
    ],
    title: 'Solve the system',
  }

  it('renders without crashing', () => {
    const { container } = render(<SystemsOfEquations data={baseData} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('accepts subject prop', () => {
    const { container } = render(
      <SystemsOfEquations data={baseData} subject="physics" />
    )
    expect(container.firstChild).toBeInTheDocument()
  })

  it('accepts complexity prop without errors', () => {
    const { container } = render(
      <SystemsOfEquations data={baseData} complexity="high_school" />
    )
    expect(container).toBeInTheDocument()
  })

  it('uses subject color in progress gradient when subject is physics', () => {
    const { container } = render(
      <SystemsOfEquations data={baseData} subject="physics" />
    )
    const styledElements = container.querySelectorAll('[style]')
    const hasPhysicsColor = Array.from(styledElements).some(
      (el) => (el as HTMLElement).style.cssText.includes('#f97316')
    )
    expect(hasPhysicsColor).toBe(true)
  })

  it('uses default math subject color in progress gradient', () => {
    const { container } = render(<SystemsOfEquations data={baseData} />)
    const styledElements = container.querySelectorAll('[style]')
    const hasMathColor = Array.from(styledElements).some(
      (el) => (el as HTMLElement).style.cssText.includes('#6366f1')
    )
    expect(hasMathColor).toBe(true)
  })

  it('renders title when provided', () => {
    const { container } = render(<SystemsOfEquations data={baseData} />)
    expect(container.textContent).toContain('Solve the system')
  })

  it('renders method name', () => {
    const { container } = render(<SystemsOfEquations data={baseData} />)
    expect(container.textContent).toContain('Elimination Method')
  })

  it('renders both equations', () => {
    const { container } = render(<SystemsOfEquations data={baseData} />)
    expect(container.textContent).toContain('2x + y = 7')
    expect(container.textContent).toContain('x - y = 2')
  })

  it('renders step counter by default', () => {
    const { container } = render(<SystemsOfEquations data={baseData} currentStep={0} />)
    expect(container.textContent).toContain('Step 1 of 5')
  })

  it('renders in Hebrew when language is he', () => {
    const { container } = render(
      <SystemsOfEquations data={baseData} language="he" />
    )
    expect(container.textContent).toContain('\u05E9\u05D9\u05D8\u05EA \u05D4\u05D7\u05D9\u05E1\u05D5\u05E8')
  })
})
