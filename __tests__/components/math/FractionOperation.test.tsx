import { render } from '@testing-library/react'
import { FractionOperation } from '@/components/math/FractionOperation'
import type { FractionOperationData } from '@/types/math'

// No framer-motion usage in FractionOperation, but mock just in case
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

describe('FractionOperation', () => {
  const baseData: FractionOperationData = {
    operationType: 'add',
    fraction1: { numerator: 1, denominator: 4 },
    fraction2: { numerator: 1, denominator: 4 },
    result: { numerator: 2, denominator: 4 },
    steps: [
      {
        step: 0,
        type: 'initial',
        fractions: [
          { numerator: 1, denominator: 4 },
          { numerator: 1, denominator: 4 },
        ],
        description: 'Start with two fractions',
      },
      {
        step: 1,
        type: 'operate',
        fractions: [
          { numerator: 1, denominator: 4 },
          { numerator: 1, denominator: 4 },
        ],
        result: { numerator: 2, denominator: 4 },
        description: 'Add the numerators',
        calculation: '1 + 1 = 2',
      },
      {
        step: 2,
        type: 'simplify',
        fractions: [{ numerator: 2, denominator: 4 }],
        result: { numerator: 1, denominator: 2 },
        description: 'Simplify the fraction',
      },
    ],
    title: 'Add Fractions',
  }

  it('renders without crashing', () => {
    const { container } = render(<FractionOperation data={baseData} />)
    expect(container.querySelector('.fraction-operation')).toBeInTheDocument()
  })

  it('accepts subject prop', () => {
    const { container } = render(
      <FractionOperation data={baseData} subject="physics" />
    )
    expect(container.querySelector('.fraction-operation')).toBeInTheDocument()
  })

  it('accepts complexity prop', () => {
    const { container } = render(
      <FractionOperation data={baseData} complexity="elementary" />
    )
    expect(container.querySelector('.fraction-operation')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    const { container } = render(<FractionOperation data={baseData} />)
    expect(container.textContent).toContain('Add Fractions')
  })

  it('renders step counter by default', () => {
    const { container } = render(<FractionOperation data={baseData} />)
    expect(container.textContent).toContain('Step 1 of 3')
  })

  it('hides step counter when showStepCounter is false', () => {
    const { container } = render(
      <FractionOperation data={baseData} showStepCounter={false} />
    )
    expect(container.textContent).not.toContain('Step 1 of 3')
  })
})
