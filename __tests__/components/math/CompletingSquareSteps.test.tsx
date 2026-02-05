import { render } from '@testing-library/react'
import { CompletingSquareSteps } from '@/components/math/CompletingSquareSteps'
import type { CompletingSquareData } from '@/components/math/CompletingSquareSteps'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
    g: ({ children, ...props }: any) => <g {...props}>{children}</g>,
    circle: (props: any) => <circle {...props} />,
    line: (props: any) => <line {...props} />,
    path: (props: any) => <path {...props} />,
    text: ({ children, ...props }: any) => <text {...props}>{children}</text>,
    rect: (props: any) => <rect {...props} />,
  },
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: () => Promise.resolve() }),
}))

jest.mock('@/lib/diagram-animations', () => ({
  prefersReducedMotion: () => true,
  createPathDrawVariants: () => ({ hidden: {}, visible: {} }),
}))

describe('CompletingSquareSteps', () => {
  const baseData: CompletingSquareData = {
    originalEquation: 'x\u00B2 + 6x + 5 = 0',
    a: 1,
    b: 6,
    c: 5,
    halfB: 3,
    squaredHalfB: 9,
    variable: 'x',
    solutions: ['-1', '-5'],
    vertexForm: '(x + 3)\u00B2 = 4',
    steps: [
      { step: 0, type: 'identify', description: 'Identify coefficients', leftSide: 'x\u00B2 + 6x + 5', rightSide: '0' },
      { step: 1, type: 'isolate', description: 'Move constant to right', leftSide: 'x\u00B2 + 6x', rightSide: '-5' },
      { step: 2, type: 'half_b', description: 'Find b/2', leftSide: 'x\u00B2 + 6x', rightSide: '-5', calculation: 'b/2 = 6/2 = 3' },
      { step: 3, type: 'add_both', description: 'Add (b/2)\u00B2 to both sides', leftSide: 'x\u00B2 + 6x + 9', rightSide: '4' },
      { step: 4, type: 'factor_left', description: 'Factor left side', leftSide: '(x + 3)\u00B2', rightSide: '4' },
      { step: 5, type: 'sqrt_both', description: 'Take square root', leftSide: 'x + 3', rightSide: '\u00B12' },
      { step: 6, type: 'solve', description: 'Solve for x', leftSide: 'x', rightSide: '-1 or -5' },
      { step: 7, type: 'complete', description: 'Complete!', leftSide: 'x', rightSide: '-1, -5' },
    ],
    title: 'Completing the Square',
  }

  it('renders without crashing', () => {
    const { container } = render(<CompletingSquareSteps data={baseData} />)
    expect(container.querySelector('.completing-square-steps')).toBeInTheDocument()
  })

  it('accepts subject prop', () => {
    const { container } = render(
      <CompletingSquareSteps data={baseData} subject="physics" />
    )
    expect(container.querySelector('.completing-square-steps')).toBeInTheDocument()
  })

  it('accepts complexity prop without errors', () => {
    const { container } = render(
      <CompletingSquareSteps data={baseData} complexity="elementary" />
    )
    expect(container).toBeInTheDocument()
  })

  it('uses subject color in progress gradient when subject is physics', () => {
    const { container } = render(
      <CompletingSquareSteps data={baseData} subject="physics" />
    )
    const styledElements = container.querySelectorAll('[style]')
    const hasPhysicsColor = Array.from(styledElements).some(
      (el) => (el as HTMLElement).style.cssText.includes('#f97316')
    )
    expect(hasPhysicsColor).toBe(true)
  })

  it('uses default math subject color in progress gradient', () => {
    const { container } = render(<CompletingSquareSteps data={baseData} />)
    const styledElements = container.querySelectorAll('[style]')
    const hasMathColor = Array.from(styledElements).some(
      (el) => (el as HTMLElement).style.cssText.includes('#6366f1')
    )
    expect(hasMathColor).toBe(true)
  })

  it('displays the original equation', () => {
    const { container } = render(<CompletingSquareSteps data={baseData} />)
    expect(container.textContent).toContain('x\u00B2 + 6x + 5 = 0')
  })

  it('displays solutions when complete', () => {
    const { container } = render(
      <CompletingSquareSteps data={baseData} currentStep={7} />
    )
    expect(container.textContent).toContain('-1')
    expect(container.textContent).toContain('-5')
  })
})
