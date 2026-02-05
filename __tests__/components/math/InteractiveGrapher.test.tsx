import { render, screen } from '@testing-library/react'
import { InteractiveGrapher } from '@/components/math/InteractiveGrapher'

// Mutable step state controlled per-test
let mockCurrentStep = 0

// Mock framer-motion — all SVG motion elements render as plain SVG
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

// Mock mathjs
jest.mock('mathjs', () => ({
  parse: (expr: string) => ({
    compile: () => ({
      evaluate: ({ x }: { x: number }) => {
        if (expr === 'x^2') return x * x
        if (expr === 'x') return x
        if (expr === 'sin(x)') return Math.sin(x)
        return 0
      },
    }),
  }),
  evaluate: (val: any) => val,
}))

// Mock useDiagramBase — returns subject-coded colors and controlled step
jest.mock('@/hooks/useDiagramBase', () => ({
  useDiagramBase: (opts: any) => {
    const mockSubjectColors: Record<string, any> = {
      math: { primary: '#6366f1', accent: '#8b5cf6', light: '#c7d2fe', dark: '#4338ca', bg: '#eef2ff', bgDark: '#1e1b4b', curve: '#818cf8', point: '#6366f1', highlight: '#a5b4fc' },
      physics: { primary: '#f97316', accent: '#ef4444', light: '#fed7aa', dark: '#c2410c', bg: '#fff7ed', bgDark: '#431407', curve: '#fb923c', point: '#f97316', highlight: '#fdba74' },
      geometry: { primary: '#ec4899', accent: '#d946ef', light: '#fbcfe8', dark: '#be185d', bg: '#fdf2f8', bgDark: '#500724', curve: '#f472b6', point: '#ec4899', highlight: '#f9a8d4' },
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
      complexity: opts.complexity || 'middle_school',
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

describe('InteractiveGrapher', () => {
  beforeEach(() => {
    mockCurrentStep = 0
  })

  // ---------------------------------------------------------------------------
  // Container & Structure
  // ---------------------------------------------------------------------------

  describe('container and structure', () => {
    it('renders with data-testid="interactive-grapher"', () => {
      render(<InteractiveGrapher />)
      expect(screen.getByTestId('interactive-grapher')).toBeInTheDocument()
    })

    it('renders background rect', () => {
      render(<InteractiveGrapher />)
      expect(screen.getByTestId('ig-background')).toBeInTheDocument()
    })

    it('has responsive width container', () => {
      render(<InteractiveGrapher width={800} />)
      const container = screen.getByTestId('interactive-grapher')
      expect(container.style.width).toBe('100%')
      expect(container.style.maxWidth).toBe('800px')
    })

    it('has accessible SVG with role and aria-label', () => {
      const { container } = render(<InteractiveGrapher />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('role')).toBe('img')
      expect(svg?.getAttribute('aria-label')).toContain('Interactive graph')
    })
  })

  // ---------------------------------------------------------------------------
  // Step-based Progressive Reveal
  // ---------------------------------------------------------------------------

  describe('progressive reveal', () => {
    it('shows grid at step 0', () => {
      mockCurrentStep = 0
      render(<InteractiveGrapher />)
      expect(screen.getByTestId('ig-grid')).toBeInTheDocument()
    })

    it('hides axes at step 0', () => {
      mockCurrentStep = 0
      render(<InteractiveGrapher />)
      expect(screen.queryByTestId('ig-axes')).not.toBeInTheDocument()
    })

    it('shows axes at step 1', () => {
      mockCurrentStep = 1
      render(<InteractiveGrapher />)
      expect(screen.getByTestId('ig-axes')).toBeInTheDocument()
    })

    it('hides equations at step 1', () => {
      mockCurrentStep = 1
      render(<InteractiveGrapher initialEquations={[{ expression: 'x^2' }]} />)
      expect(screen.queryByTestId('ig-equations')).not.toBeInTheDocument()
    })

    it('shows equations at step 2', () => {
      mockCurrentStep = 2
      render(<InteractiveGrapher initialEquations={[{ expression: 'x^2' }]} />)
      expect(screen.getByTestId('ig-equations')).toBeInTheDocument()
    })

    it('hides controls at step 2', () => {
      mockCurrentStep = 2
      render(<InteractiveGrapher />)
      expect(screen.queryByTestId('ig-controls')).not.toBeInTheDocument()
    })

    it('shows controls at step 3', () => {
      mockCurrentStep = 3
      render(<InteractiveGrapher />)
      expect(screen.getByTestId('ig-controls')).toBeInTheDocument()
    })

    it('accumulates all previous steps', () => {
      mockCurrentStep = 3
      render(<InteractiveGrapher initialEquations={[{ expression: 'x^2' }]} />)
      expect(screen.getByTestId('ig-grid')).toBeInTheDocument()
      expect(screen.getByTestId('ig-axes')).toBeInTheDocument()
      expect(screen.getByTestId('ig-equations')).toBeInTheDocument()
      expect(screen.getByTestId('ig-controls')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // DiagramStepControls
  // ---------------------------------------------------------------------------

  describe('DiagramStepControls', () => {
    it('renders step controls', () => {
      render(<InteractiveGrapher />)
      expect(screen.getByTestId('diagram-step-controls')).toBeInTheDocument()
    })

    it('passes correct total steps (grid + axes + equations + controls = 4)', () => {
      render(<InteractiveGrapher />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-total')).toBe('4')
    })

    it('passes subject color to controls', () => {
      render(<InteractiveGrapher subject="physics" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#f97316')
    })
  })

  // ---------------------------------------------------------------------------
  // Subject Colors
  // ---------------------------------------------------------------------------

  describe('subject colors', () => {
    it('uses math colors by default for add button', () => {
      mockCurrentStep = 3
      render(<InteractiveGrapher />)
      const btn = screen.getByTestId('ig-add-btn')
      expect(btn.style.backgroundColor).toBe('rgb(99, 102, 241)')
    })

    it('uses physics colors when subject="physics" for add button', () => {
      mockCurrentStep = 3
      render(<InteractiveGrapher subject="physics" />)
      const btn = screen.getByTestId('ig-add-btn')
      expect(btn.style.backgroundColor).toBe('rgb(249, 115, 22)')
    })
  })

  // ---------------------------------------------------------------------------
  // Equation rendering
  // ---------------------------------------------------------------------------

  describe('equations', () => {
    it('renders equation paths at step 2', () => {
      mockCurrentStep = 2
      render(<InteractiveGrapher initialEquations={[{ expression: 'x^2' }]} />)
      expect(screen.getByTestId('ig-eq-eq-0')).toBeInTheDocument()
    })

    it('hides equation paths before step 2', () => {
      mockCurrentStep = 1
      render(<InteractiveGrapher initialEquations={[{ expression: 'x^2' }]} />)
      expect(screen.queryByTestId('ig-eq-eq-0')).not.toBeInTheDocument()
    })

    it('shows equation input only at controls step', () => {
      mockCurrentStep = 2
      render(<InteractiveGrapher />)
      expect(screen.queryByTestId('ig-equation-input')).not.toBeInTheDocument()

      mockCurrentStep = 3
      const { rerender } = render(<InteractiveGrapher />)
      // Re-render needed since mockCurrentStep changed before render
      rerender(<InteractiveGrapher />)
      expect(screen.getByTestId('ig-equation-input')).toBeInTheDocument()
    })
  })
})
