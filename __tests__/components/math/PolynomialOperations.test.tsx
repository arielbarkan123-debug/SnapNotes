import { render } from '@testing-library/react'
import { PolynomialOperations } from '@/components/math/PolynomialOperations'
import type { PolynomialOperationsData } from '@/components/math/PolynomialOperations'

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

describe('PolynomialOperations', () => {
  const baseData: PolynomialOperationsData = {
    polynomial1: '3x\u00B2 + 2x - 5',
    polynomial2: 'x\u00B2 - 4x + 1',
    operation: 'add',
    result: '4x\u00B2 - 2x - 4',
    terms1: [
      { coefficient: 3, exponent: 2 },
      { coefficient: 2, exponent: 1 },
      { coefficient: -5, exponent: 0 },
    ],
    terms2: [
      { coefficient: 1, exponent: 2 },
      { coefficient: -4, exponent: 1 },
      { coefficient: 1, exponent: 0 },
    ],
    resultTerms: [
      { coefficient: 4, exponent: 2 },
      { coefficient: -2, exponent: 1 },
      { coefficient: -4, exponent: 0 },
    ],
    steps: [
      { step: 0, type: 'setup', description: 'Set up the addition' },
      { step: 1, type: 'align', description: 'Align like terms' },
      { step: 2, type: 'combine', description: 'Combine like terms' },
      { step: 3, type: 'complete', description: 'Done!' },
    ],
    title: 'Add Polynomials',
  }

  it('renders without crashing', () => {
    const { container } = render(<PolynomialOperations data={baseData} />)
    expect(container.querySelector('.polynomial-operations')).toBeInTheDocument()
  })

  it('accepts subject prop', () => {
    const { container } = render(
      <PolynomialOperations data={baseData} subject="physics" />
    )
    expect(container.querySelector('.polynomial-operations')).toBeInTheDocument()
  })

  it('accepts complexity prop', () => {
    const { container } = render(
      <PolynomialOperations data={baseData} complexity="elementary" />
    )
    expect(container.querySelector('.polynomial-operations')).toBeInTheDocument()
  })

  it('displays the operation name', () => {
    const { container } = render(<PolynomialOperations data={baseData} />)
    expect(container.textContent).toContain('Addition')
  })

  it('displays result when complete', () => {
    const { container } = render(
      <PolynomialOperations data={baseData} currentStep={3} />
    )
    expect(container.textContent).toContain('4x\u00B2 - 2x - 4')
  })
})
