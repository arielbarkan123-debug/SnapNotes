import { render } from '@testing-library/react'
import { LongDivisionDiagram } from '@/components/math/LongDivisionDiagram'
import type { LongDivisionData } from '@/types/math'

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

describe('LongDivisionDiagram', () => {
  const baseData: LongDivisionData = {
    dividend: 156,
    divisor: 12,
    quotient: 13,
    remainder: 0,
    steps: [
      {
        step: 0,
        type: 'setup',
        position: 0,
        explanation: 'Set up the division',
      },
      {
        step: 1,
        type: 'divide',
        position: 1,
        quotientDigit: 1,
        explanation: '12 goes into 15 one time',
      },
      {
        step: 2,
        type: 'multiply',
        position: 1,
        product: 12,
        explanation: '1 x 12 = 12',
        calculation: '1 × 12 = 12',
      },
      {
        step: 3,
        type: 'subtract',
        position: 1,
        difference: 3,
        explanation: '15 - 12 = 3',
      },
      {
        step: 4,
        type: 'bring_down',
        position: 2,
        workingNumber: 36,
        explanation: 'Bring down 6 to get 36',
      },
      {
        step: 5,
        type: 'divide',
        position: 2,
        quotientDigit: 3,
        explanation: '12 goes into 36 three times',
      },
      {
        step: 6,
        type: 'multiply',
        position: 2,
        product: 36,
        explanation: '3 x 12 = 36',
        calculation: '3 × 12 = 36',
      },
      {
        step: 7,
        type: 'subtract',
        position: 2,
        difference: 0,
        explanation: '36 - 36 = 0',
      },
    ],
    title: '156 ÷ 12',
  }

  it('renders without crashing', () => {
    const { container } = render(<LongDivisionDiagram data={baseData} />)
    expect(container.querySelector('.long-division-diagram')).toBeInTheDocument()
  })

  it('accepts subject prop', () => {
    const { container } = render(
      <LongDivisionDiagram data={baseData} subject="physics" />
    )
    expect(container.querySelector('.long-division-diagram')).toBeInTheDocument()
  })

  it('accepts complexity prop', () => {
    const { container } = render(
      <LongDivisionDiagram data={baseData} complexity="elementary" />
    )
    expect(container.querySelector('.long-division-diagram')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    const { container } = render(<LongDivisionDiagram data={baseData} />)
    expect(container.textContent).toContain('156 ÷ 12')
  })

  it('renders step counter by default', () => {
    const { container } = render(<LongDivisionDiagram data={baseData} />)
    expect(container.textContent).toContain('Step 1 of 8')
  })

  it('hides step counter when showStepCounter is false', () => {
    const { container } = render(
      <LongDivisionDiagram data={baseData} showStepCounter={false} />
    )
    expect(container.textContent).not.toContain('Step 1 of 8')
  })

  it('renders multiplication helper table', () => {
    const { container } = render(<LongDivisionDiagram data={baseData} />)
    // Should contain "Helper" label
    expect(container.textContent).toContain('Helper')
  })
})
