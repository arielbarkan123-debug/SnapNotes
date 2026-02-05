import { render } from '@testing-library/react'
import { InequalityDiagram } from '@/components/math/InequalityDiagram'

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
    polygon: (props: any) => <polygon {...props} />,
  },
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: () => Promise.resolve() }),
}))

jest.mock('@/lib/diagram-animations', () => ({
  prefersReducedMotion: () => true,
  createPathDrawVariants: () => ({ hidden: {}, visible: {} }),
}))

describe('InequalityDiagram', () => {
  const baseData = {
    originalInequality: '2x + 3 < 7',
    variable: 'x',
    solution: 'x < 2',
    boundaryValue: 2,
    finalOperator: '<' as const,
    intervalNotation: '(-\u221e, 2)',
    setBuilderNotation: '{x | x < 2}',
    steps: [
      {
        step: 0,
        type: 'setup' as const,
        description: 'Write the inequality',
        leftSide: '2x + 3',
        operator: '<' as const,
        rightSide: '7',
      },
      {
        step: 1,
        type: 'isolate' as const,
        description: 'Subtract 3 from both sides',
        leftSide: '2x',
        operator: '<' as const,
        rightSide: '4',
        operation: 'subtract' as const,
        operationValue: '3',
        calculation: '2x + 3 - 3 < 7 - 3',
      },
      {
        step: 2,
        type: 'simplify' as const,
        description: 'Divide both sides by 2',
        leftSide: 'x',
        operator: '<' as const,
        rightSide: '2',
        operation: 'divide' as const,
        operationValue: '2',
        calculation: '2x / 2 < 4 / 2',
      },
      {
        step: 3,
        type: 'graph' as const,
        description: 'Graph on number line',
        leftSide: 'x',
        operator: '<' as const,
        rightSide: '2',
      },
      {
        step: 4,
        type: 'complete' as const,
        description: 'Solution complete',
        leftSide: 'x',
        operator: '<' as const,
        rightSide: '2',
      },
    ],
    numberLineBounds: { min: -3, max: 7 },
    title: 'Solve the inequality',
  }

  it('renders without crashing', () => {
    const { container } = render(<InequalityDiagram data={baseData} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('accepts subject prop', () => {
    const { container } = render(
      <InequalityDiagram data={baseData} subject="physics" />
    )
    expect(container.firstChild).toBeInTheDocument()
  })

  it('accepts complexity prop', () => {
    const { container } = render(
      <InequalityDiagram data={baseData} complexity="advanced" />
    )
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    const { container } = render(<InequalityDiagram data={baseData} />)
    expect(container.textContent).toContain('Solve the inequality')
  })

  it('renders original inequality', () => {
    const { container } = render(<InequalityDiagram data={baseData} />)
    expect(container.textContent).toContain('2x + 3 < 7')
  })

  it('renders step counter by default', () => {
    const { container } = render(<InequalityDiagram data={baseData} currentStep={0} />)
    expect(container.textContent).toContain('Step 1 of 5')
  })

  it('shows number line at graph step', () => {
    const { container } = render(
      <InequalityDiagram data={baseData} currentStep={3} />
    )
    expect(container.textContent).toContain('Graph on Number Line')
  })

  it('renders in Hebrew when language is he', () => {
    const { container } = render(
      <InequalityDiagram data={baseData} language="he" />
    )
    expect(container.textContent).toContain('\u05E4\u05EA\u05E8\u05D5\u05DF \u05D0\u05D9-\u05E9\u05D5\u05D5\u05D9\u05D5\u05DF')
  })
})
