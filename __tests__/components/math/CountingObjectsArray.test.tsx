import { render, screen } from '@testing-library/react'
import { CountingObjectsArray } from '@/components/math/CountingObjectsArray'

// Mutable step state controlled per-test
let mockCurrentStep = 0

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
    g: ({ children, ...props }: any) => <g {...props}>{children}</g>,
    circle: (props: any) => <circle {...props} />,
    text: ({ children, ...props }: any) => <text {...props}>{children}</text>,
    path: (props: any) => <path {...props} />,
    polygon: (props: any) => <polygon {...props} />,
    line: (props: any) => <line {...props} />,
    rect: (props: any) => <rect {...props} />,
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
      lineWeight: mockLineWeights[opts.complexity] || 4,
      isRTL: opts.language === 'he',
      isFirstStep: mockCurrentStep === 0,
      isLastStep: mockCurrentStep === opts.totalSteps - 1,
      spotlightElement: opts.stepSpotlights?.[mockCurrentStep] ?? null,
      progress: opts.totalSteps > 1 ? mockCurrentStep / (opts.totalSteps - 1) : 1,
      subject: opts.subject || 'math',
      complexity: opts.complexity || 'elementary',
      backgrounds: {
        light: { fill: '#ffffff', grid: '#e5e7eb' },
        dark: { fill: '#1a1a2e', grid: '#2d2d44' },
      },
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
  lineDrawVariants: { hidden: { pathLength: 0 }, visible: { pathLength: 1 } },
  labelAppearVariants: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
}))

// =============================================================================
// Tests
// =============================================================================

describe('CountingObjectsArray', () => {
  const defaultData = {
    objects: [
      { type: 'circle', count: 3, color: '#6366f1' },
      { type: 'star', count: 5, color: '#f59e0b' },
    ],
    operation: 'add' as const,
    total: 8,
    title: 'Addition with Objects',
  }

  beforeEach(() => {
    mockCurrentStep = 0
  })

  // ---------------------------------------------------------------------------
  // Container & Structure
  // ---------------------------------------------------------------------------

  describe('container and structure', () => {
    it('renders with data-testid="counting-objects-array"', () => {
      render(<CountingObjectsArray data={defaultData} />)
      expect(screen.getByTestId('counting-objects-array')).toBeInTheDocument()
    })

    it('renders an SVG element', () => {
      const { container } = render(<CountingObjectsArray data={defaultData} />)
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('renders background rect', () => {
      render(<CountingObjectsArray data={defaultData} />)
      expect(screen.getByTestId('coa-background')).toBeInTheDocument()
    })

    it('renders the title', () => {
      render(<CountingObjectsArray data={defaultData} />)
      expect(screen.getByTestId('coa-title')).toBeInTheDocument()
      expect(screen.getByText('Addition with Objects')).toBeInTheDocument()
    })

    it('does not render title when not provided', () => {
      const { objects, operation, total } = defaultData
      render(<CountingObjectsArray data={{ objects, operation, total }} />)
      expect(screen.queryByTestId('coa-title')).not.toBeInTheDocument()
    })

    it('has responsive width', () => {
      render(<CountingObjectsArray data={defaultData} width={500} />)
      const container = screen.getByTestId('counting-objects-array')
      expect(container.style.width).toBe('100%')
      expect(container.style.maxWidth).toBe('500px')
    })
  })

  // ---------------------------------------------------------------------------
  // Progressive Reveal
  // ---------------------------------------------------------------------------

  describe('progressive reveal', () => {
    it('shows grid at step 0', () => {
      mockCurrentStep = 0
      render(<CountingObjectsArray data={defaultData} />)
      expect(screen.getByTestId('coa-grid')).toBeInTheDocument()
    })

    it('hides objects at step 0', () => {
      mockCurrentStep = 0
      render(<CountingObjectsArray data={defaultData} />)
      expect(screen.queryByTestId('coa-objects')).not.toBeInTheDocument()
    })

    it('shows objects at step 1', () => {
      mockCurrentStep = 1
      render(<CountingObjectsArray data={defaultData} />)
      expect(screen.getByTestId('coa-objects')).toBeInTheDocument()
    })

    it('shows result at step 2', () => {
      mockCurrentStep = 2
      render(<CountingObjectsArray data={defaultData} />)
      expect(screen.getByTestId('coa-result')).toBeInTheDocument()
      expect(screen.getByTestId('coa-result-label')).toBeInTheDocument()
    })

    it('shows operation label (3 + 5 = 8)', () => {
      mockCurrentStep = 2
      render(<CountingObjectsArray data={defaultData} />)
      expect(screen.getByText('3 + 5 = 8')).toBeInTheDocument()
    })

    it('accumulates all previous steps', () => {
      mockCurrentStep = 2
      render(<CountingObjectsArray data={defaultData} />)
      expect(screen.getByTestId('coa-grid')).toBeInTheDocument()
      expect(screen.getByTestId('coa-objects')).toBeInTheDocument()
      expect(screen.getByTestId('coa-result')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Subject Colors & Line Weight
  // ---------------------------------------------------------------------------

  describe('subject colors', () => {
    it('uses elementary line weight by default', () => {
      mockCurrentStep = 0
      render(<CountingObjectsArray data={defaultData} complexity="elementary" />)
      const cell = screen.getByTestId('coa-cell-0')
      // Grid cells use lineWeight / 2 = 4 / 2 = 2
      expect(cell.getAttribute('stroke-width')).toBe('2')
    })

    it('passes subject color to step controls', () => {
      render(<CountingObjectsArray data={defaultData} subject="physics" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#f97316')
    })
  })

  // ---------------------------------------------------------------------------
  // Step Controls
  // ---------------------------------------------------------------------------

  describe('DiagramStepControls', () => {
    it('renders step controls', () => {
      render(<CountingObjectsArray data={defaultData} />)
      expect(screen.getByTestId('diagram-step-controls')).toBeInTheDocument()
    })

    it('has 3 total steps', () => {
      render(<CountingObjectsArray data={defaultData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-total')).toBe('3')
    })
  })

  // ---------------------------------------------------------------------------
  // Object rendering
  // ---------------------------------------------------------------------------

  describe('object rendering', () => {
    it('renders correct number of objects', () => {
      mockCurrentStep = 1
      render(<CountingObjectsArray data={defaultData} />)
      // 3 + 5 = 8 objects
      for (let i = 0; i < 8; i++) {
        expect(screen.getByTestId(`coa-object-${i}`)).toBeInTheDocument()
      }
    })

    it('handles count operation', () => {
      mockCurrentStep = 2
      const countData = {
        objects: [{ type: 'circle', count: 5 }],
        operation: 'count' as const,
        total: 5,
      }
      render(<CountingObjectsArray data={countData} />)
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('handles subtract operation', () => {
      mockCurrentStep = 2
      const subData = {
        objects: [
          { type: 'circle', count: 7 },
          { type: 'circle', count: 3 },
        ],
        operation: 'subtract' as const,
        total: 4,
      }
      render(<CountingObjectsArray data={subData} />)
      expect(screen.getByText('7 - 3 = 4')).toBeInTheDocument()
    })
  })
})
