import { render } from '@testing-library/react'
import { EquationSteps } from '@/components/math/EquationSteps'
import type { EquationData } from '@/types/math'

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

describe('EquationSteps', () => {
  const baseData: EquationData = {
    originalEquation: '2x + 3 = 7',
    variable: 'x',
    solution: '2',
    steps: [
      {
        step: 0,
        equation: '2x + 3 = 7',
        operation: 'initial',
        leftSide: '2x + 3',
        rightSide: '7',
        description: 'Start with the equation',
      },
      {
        step: 1,
        equation: '2x = 4',
        operation: 'subtract',
        leftSide: '2x',
        rightSide: '4',
        description: 'Subtract 3 from both sides',
        calculation: '-3',
      },
      {
        step: 2,
        equation: 'x = 2',
        operation: 'divide',
        leftSide: 'x',
        rightSide: '2',
        description: 'Divide both sides by 2',
        calculation: '÷2',
      },
    ],
    title: 'Solve for x',
  }

  it('renders without crashing', () => {
    const { container } = render(<EquationSteps data={baseData} />)
    expect(container.querySelector('.equation-steps')).toBeInTheDocument()
  })

  it('accepts subject prop', () => {
    const { container } = render(
      <EquationSteps data={baseData} subject="physics" />
    )
    expect(container.querySelector('.equation-steps')).toBeInTheDocument()
  })

  it('accepts complexity prop without errors', () => {
    // EquationSteps accepts complexity for interface compatibility but does not use it for rendering
    const { container } = render(
      <EquationSteps data={baseData} complexity="elementary" />
    )
    expect(container.querySelector('.equation-steps')).toBeInTheDocument()
  })

  it('uses subject color in progress bar when subject is physics', () => {
    const { container } = render(
      <EquationSteps data={baseData} subject="physics" />
    )
    // Physics primary is #f97316 — should appear in progress gradient inline style
    const styledElements = container.querySelectorAll('[style]')
    const hasPhysicsColor = Array.from(styledElements).some(
      (el) => (el as HTMLElement).style.cssText.includes('#f97316')
    )
    expect(hasPhysicsColor).toBe(true)
  })

  it('uses default math subject color in progress bar', () => {
    const { container } = render(<EquationSteps data={baseData} />)
    // Math primary is #6366f1 — default subject color
    const styledElements = container.querySelectorAll('[style]')
    const hasMathColor = Array.from(styledElements).some(
      (el) => (el as HTMLElement).style.cssText.includes('#6366f1')
    )
    expect(hasMathColor).toBe(true)
  })

  it('renders title when provided', () => {
    const { container } = render(<EquationSteps data={baseData} />)
    expect(container.textContent).toContain('Solve for x')
  })

  it('renders step counter by default', () => {
    const { container } = render(<EquationSteps data={baseData} />)
    expect(container.textContent).toContain('Step 1 of 3')
  })

  it('hides step counter when showStepCounter is false', () => {
    const { container } = render(
      <EquationSteps data={baseData} showStepCounter={false} />
    )
    expect(container.textContent).not.toContain('Step 1 of 3')
  })
})
