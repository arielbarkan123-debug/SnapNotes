import { render } from '@testing-library/react'
import { FactoringDiagram } from '@/components/math/FactoringDiagram'
import type { FactoringData } from '@/components/math/FactoringDiagram'

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
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  },
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: () => Promise.resolve() }),
}))

jest.mock('@/lib/diagram-animations', () => ({
  prefersReducedMotion: () => true,
  createPathDrawVariants: () => ({ hidden: {}, visible: {} }),
}))

describe('FactoringDiagram', () => {
  const baseData: FactoringData = {
    expression: 'x\u00B2 + 5x + 6',
    a: 1,
    b: 5,
    c: 6,
    product: 6,
    sum: 5,
    factor1: '(x + 2)',
    factor2: '(x + 3)',
    factoredForm: '(x + 2)(x + 3)',
    steps: [
      { step: 0, type: 'identify', description: 'Identify the expression' },
      { step: 1, type: 'find_factors', description: 'Find factor pairs' },
      { step: 2, type: 'complete', description: 'Complete' },
    ],
    method: 'simple',
  }

  it('renders without crashing', () => {
    const { container } = render(<FactoringDiagram data={baseData} />)
    expect(container.querySelector('.factoring-diagram')).toBeInTheDocument()
  })

  it('accepts subject prop', () => {
    const { container } = render(
      <FactoringDiagram data={baseData} subject="physics" />
    )
    expect(container.querySelector('.factoring-diagram')).toBeInTheDocument()
  })

  it('accepts complexity prop without errors', () => {
    const { container } = render(
      <FactoringDiagram data={baseData} complexity="elementary" />
    )
    expect(container).toBeInTheDocument()
  })

  it('uses subject color in progress gradient when subject is physics', () => {
    const { container } = render(
      <FactoringDiagram data={baseData} subject="physics" />
    )
    const styledElements = container.querySelectorAll('[style]')
    const hasPhysicsColor = Array.from(styledElements).some(
      (el) => (el as HTMLElement).style.cssText.includes('#f97316')
    )
    expect(hasPhysicsColor).toBe(true)
  })

  it('uses default math subject color in progress gradient', () => {
    const { container } = render(<FactoringDiagram data={baseData} />)
    const styledElements = container.querySelectorAll('[style]')
    const hasMathColor = Array.from(styledElements).some(
      (el) => (el as HTMLElement).style.cssText.includes('#6366f1')
    )
    expect(hasMathColor).toBe(true)
  })

  it('displays the expression', () => {
    const { container } = render(<FactoringDiagram data={baseData} />)
    expect(container.textContent).toContain('x\u00B2 + 5x + 6')
  })

  it('displays factored form when complete', () => {
    const { container } = render(
      <FactoringDiagram data={baseData} currentStep={2} />
    )
    expect(container.textContent).toContain('(x + 2)(x + 3)')
  })
})
