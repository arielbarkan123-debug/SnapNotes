import { render, screen } from '@testing-library/react'
import { MixedNumberModel } from '@/components/math/MixedNumberModel'

// Mutable step state controlled per-test
let mockCurrentStep = 0

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    g: ({ children, ...props }: any) => <g {...props}>{children}</g>,
    text: ({ children, ...props }: any) => <text {...props}>{children}</text>,
    rect: (props: any) => <rect {...props} />,
    circle: (props: any) => <circle {...props} />,
    path: (props: any) => <path {...props} />,
    line: (props: any) => <line {...props} />,
    polygon: (props: any) => <polygon {...props} />,
  },
  AnimatePresence: ({ children }: any) => children,
}))

// Mock useDiagramBase
jest.mock('@/hooks/useDiagramBase', () => ({
  useDiagramBase: (opts: any) => {
    const mockSubjectColors: Record<string, any> = {
      math: { primary: '#6366f1', accent: '#8b5cf6', light: '#c7d2fe', dark: '#4338ca', bg: '#eef2ff', bgDark: '#1e1b4b', curve: '#818cf8', point: '#6366f1', highlight: '#a5b4fc' },
      physics: { primary: '#f97316', accent: '#ef4444', light: '#fed7aa', dark: '#c2410c', bg: '#fff7ed', bgDark: '#431407', curve: '#fb923c', point: '#f97316', highlight: '#fdba74' },
    }
    const mockLineWeights: Record<string, number> = { elementary: 4, middle_school: 3, high_school: 2, advanced: 2 }
    const colors = mockSubjectColors[opts.subject] || mockSubjectColors.math
    return {
      currentStep: mockCurrentStep,
      totalSteps: opts.totalSteps,
      next: jest.fn(),
      prev: jest.fn(),
      goToStep: jest.fn(),
      colors,
      lineWeight: mockLineWeights[opts.complexity] || 3,
      isRTL: opts.language === 'he',
      isFirstStep: mockCurrentStep === 0,
      isLastStep: mockCurrentStep === opts.totalSteps - 1,
      spotlightElement: opts.stepSpotlights?.[mockCurrentStep] ?? null,
      progress: opts.totalSteps > 1 ? mockCurrentStep / (opts.totalSteps - 1) : 1,
      subject: opts.subject || 'math',
      complexity: opts.complexity || 'elementary',
      backgrounds: { light: { fill: '#ffffff', grid: '#e5e7eb' }, dark: { fill: '#1a1a2e', grid: '#2d2d44' } },
    }
  },
}))

// Mock DiagramStepControls
jest.mock('@/components/diagrams/DiagramStepControls', () => ({
  DiagramStepControls: (props: any) => (
    <div
      data-testid="diagram-step-controls"
      data-step={props.currentStep}
      data-total={props.totalSteps}
      data-color={props.subjectColor}
    >
      Step {props.currentStep + 1} / {props.totalSteps}
    </div>
  ),
}))

// Mock diagram-animations
jest.mock('@/lib/diagram-animations', () => ({
  createSpotlightVariants: () => ({
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    spotlight: { opacity: 1 },
  }),
  labelAppearVariants: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
}))

// =============================================================================
// Tests
// =============================================================================

describe('MixedNumberModel', () => {
  const baseData = {
    wholeNumber: 2,
    fraction: { numerator: 3, denominator: 4 },
    showImproper: true,
    modelType: 'circle' as const,
    title: 'Mixed Number: 2 3/4',
  }

  beforeEach(() => {
    mockCurrentStep = 0
  })

  describe('container and structure', () => {
    it('renders with data-testid="mixed-number-model"', () => {
      render(<MixedNumberModel data={baseData} />)
      expect(screen.getByTestId('mixed-number-model')).toBeInTheDocument()
    })

    it('renders SVG element', () => {
      const { container } = render(<MixedNumberModel data={baseData} />)
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('renders title when provided', () => {
      render(<MixedNumberModel data={baseData} />)
      expect(screen.getByTestId('mnm-title')).toBeInTheDocument()
    })

    it('does not render title when not provided', () => {
      const { title: _, ...noTitle } = baseData
      render(<MixedNumberModel data={noTitle} />)
      expect(screen.queryByTestId('mnm-title')).not.toBeInTheDocument()
    })
  })

  describe('progressive reveal', () => {
    it('shows whole circles at step 0', () => {
      mockCurrentStep = 0
      render(<MixedNumberModel data={baseData} />)
      expect(screen.getByTestId('mnm-wholes')).toBeInTheDocument()
    })

    it('hides fraction at step 0', () => {
      mockCurrentStep = 0
      render(<MixedNumberModel data={baseData} />)
      expect(screen.queryByTestId('mnm-fraction')).not.toBeInTheDocument()
    })

    it('shows fractional circle at step 1', () => {
      mockCurrentStep = 1
      render(<MixedNumberModel data={baseData} />)
      expect(screen.getByTestId('mnm-fraction')).toBeInTheDocument()
    })

    it('shows mixed number label at step 2', () => {
      mockCurrentStep = 2
      render(<MixedNumberModel data={baseData} />)
      expect(screen.getByTestId('mnm-mixed-label')).toBeInTheDocument()
    })

    it('shows improper fraction at step 3', () => {
      mockCurrentStep = 3
      render(<MixedNumberModel data={baseData} />)
      expect(screen.getByTestId('mnm-improper')).toBeInTheDocument()
    })

    it('accumulates all previous steps at final step', () => {
      mockCurrentStep = 3
      render(<MixedNumberModel data={baseData} />)
      expect(screen.getByTestId('mnm-wholes')).toBeInTheDocument()
      expect(screen.getByTestId('mnm-fraction')).toBeInTheDocument()
      expect(screen.getByTestId('mnm-mixed-label')).toBeInTheDocument()
      expect(screen.getByTestId('mnm-improper')).toBeInTheDocument()
    })
  })

  describe('improper fraction calculation', () => {
    it('computes correct improper fraction (2 3/4 = 11/4)', () => {
      mockCurrentStep = 3
      render(<MixedNumberModel data={baseData} />)
      const improper = screen.getByTestId('mnm-improper')
      expect(improper.textContent).toContain('11/4')
    })
  })

  describe('step controls', () => {
    it('renders step controls', () => {
      render(<MixedNumberModel data={baseData} />)
      expect(screen.getByTestId('diagram-step-controls')).toBeInTheDocument()
    })

    it('has 4 steps when showImproper is true', () => {
      render(<MixedNumberModel data={baseData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-total')).toBe('4')
    })

    it('has 3 steps when showImproper is false', () => {
      render(<MixedNumberModel data={{ ...baseData, showImproper: false }} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-total')).toBe('3')
    })

    it('passes subject color to controls', () => {
      render(<MixedNumberModel data={baseData} subject="physics" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#f97316')
    })
  })

  describe('bar model', () => {
    it('renders bar model when modelType is bar', () => {
      mockCurrentStep = 1
      const barData = { ...baseData, modelType: 'bar' as const }
      const { container } = render(<MixedNumberModel data={barData} />)
      // bar model uses rects
      const rects = container.querySelectorAll('rect')
      expect(rects.length).toBeGreaterThan(2)
    })
  })
})
