import { render, screen } from '@testing-library/react'
import { TreeDiagram, ProbabilityTree, CountingTree } from '@/components/math/TreeDiagram'

// Mutable step state controlled per-test
let mockCurrentStep = 0

// Mock framer-motion -- all SVG motion elements render as plain SVG
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

// Mock useDiagramBase -- returns subject-coded colors and controlled step
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
      data-label={props.stepLabel}
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
// Test data
// =============================================================================

const baseData = {
  root: {
    id: 'root',
    label: 'Start',
    children: [
      {
        id: 'a',
        label: 'A',
        value: '1/2',
        children: [
          { id: 'a1', label: 'A1', value: '1/3' },
          { id: 'a2', label: 'A2', value: '2/3' },
        ],
      },
      {
        id: 'b',
        label: 'B',
        value: '1/2',
        children: [
          { id: 'b1', label: 'B1', value: '1/3' },
          { id: 'b2', label: 'B2', value: '2/3' },
        ],
      },
    ],
  },
  showProbabilities: true,
  title: 'Test Tree',
}

// No probabilities variant
const noProbData = {
  root: {
    id: 'root',
    label: 'Start',
    children: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ],
  },
  showProbabilities: false,
}

// =============================================================================
// Tests
// =============================================================================

describe('TreeDiagram', () => {
  beforeEach(() => {
    mockCurrentStep = 0
  })

  // ---------------------------------------------------------------------------
  // Container & Structure
  // ---------------------------------------------------------------------------

  describe('container and structure', () => {
    it('renders with data-testid="tree-diagram"', () => {
      render(<TreeDiagram data={baseData} />)
      expect(screen.getByTestId('tree-diagram')).toBeInTheDocument()
    })

    it('renders background rect', () => {
      render(<TreeDiagram data={baseData} />)
      expect(screen.getByTestId('td-background')).toBeInTheDocument()
    })

    it('has responsive width container', () => {
      render(<TreeDiagram data={baseData} width={600} />)
      const container = screen.getByTestId('tree-diagram')
      expect(container.style.width).toBe('100%')
      expect(container.style.maxWidth).toBe('600px')
    })

    it('has accessible SVG with role and aria-label', () => {
      const { container } = render(<TreeDiagram data={baseData} />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('role')).toBe('img')
      expect(svg?.getAttribute('aria-label')).toContain('Tree diagram')
      expect(svg?.getAttribute('aria-label')).toContain('Test Tree')
    })

    it('renders title when provided', () => {
      const { container } = render(<TreeDiagram data={baseData} />)
      const texts = container.querySelectorAll('text')
      const titleText = Array.from(texts).find((t) => t.textContent === 'Test Tree')
      expect(titleText).toBeInTheDocument()
    })

    it('does not render title when not provided', () => {
      const { container } = render(<TreeDiagram data={noProbData} />)
      const texts = container.querySelectorAll('text')
      const titleText = Array.from(texts).find((t) => t.textContent === 'Test Tree')
      expect(titleText).toBeUndefined()
    })
  })

  // ---------------------------------------------------------------------------
  // Step-based Progressive Reveal
  // ---------------------------------------------------------------------------

  describe('progressive reveal', () => {
    it('shows root at step 0', () => {
      mockCurrentStep = 0
      render(<TreeDiagram data={baseData} />)
      expect(screen.getByTestId('td-root')).toBeInTheDocument()
      expect(screen.getByTestId('td-node-root')).toBeInTheDocument()
    })

    it('hides level 1 at step 0', () => {
      mockCurrentStep = 0
      render(<TreeDiagram data={baseData} />)
      expect(screen.queryByTestId('td-level-1')).not.toBeInTheDocument()
    })

    it('shows level 1 at step 1', () => {
      mockCurrentStep = 1
      render(<TreeDiagram data={baseData} />)
      expect(screen.getByTestId('td-level-1')).toBeInTheDocument()
      expect(screen.getByTestId('td-node-a')).toBeInTheDocument()
      expect(screen.getByTestId('td-node-b')).toBeInTheDocument()
    })

    it('shows edges at level 1', () => {
      mockCurrentStep = 1
      render(<TreeDiagram data={baseData} />)
      expect(screen.getByTestId('td-edge-a')).toBeInTheDocument()
      expect(screen.getByTestId('td-edge-b')).toBeInTheDocument()
    })

    it('hides level 2 at step 1', () => {
      mockCurrentStep = 1
      render(<TreeDiagram data={baseData} />)
      expect(screen.queryByTestId('td-level-2')).not.toBeInTheDocument()
    })

    it('shows level 2 at step 2', () => {
      mockCurrentStep = 2
      render(<TreeDiagram data={baseData} />)
      expect(screen.getByTestId('td-level-2')).toBeInTheDocument()
      expect(screen.getByTestId('td-node-a1')).toBeInTheDocument()
      expect(screen.getByTestId('td-node-a2')).toBeInTheDocument()
      expect(screen.getByTestId('td-node-b1')).toBeInTheDocument()
      expect(screen.getByTestId('td-node-b2')).toBeInTheDocument()
    })

    it('accumulates all previous steps', () => {
      mockCurrentStep = 2
      render(<TreeDiagram data={baseData} />)
      expect(screen.getByTestId('td-root')).toBeInTheDocument()
      expect(screen.getByTestId('td-level-1')).toBeInTheDocument()
      expect(screen.getByTestId('td-level-2')).toBeInTheDocument()
    })

    it('hides probabilities before their step', () => {
      // baseData has 3 depth levels + probabilities = steps: root(0), level1(1), level2(2), probabilities(3)
      mockCurrentStep = 2
      render(<TreeDiagram data={baseData} />)
      expect(screen.queryByTestId('td-probabilities')).not.toBeInTheDocument()
    })

    it('shows probabilities at their step', () => {
      // Step 3 = probabilities for this tree (depth 3: root, level 1, level 2)
      mockCurrentStep = 3
      render(<TreeDiagram data={baseData} />)
      expect(screen.getByTestId('td-probabilities')).toBeInTheDocument()
      expect(screen.getByTestId('td-probability-a')).toBeInTheDocument()
      expect(screen.getByTestId('td-probability-b')).toBeInTheDocument()
      expect(screen.getByTestId('td-probability-a1')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // DiagramStepControls
  // ---------------------------------------------------------------------------

  describe('DiagramStepControls', () => {
    it('renders step controls', () => {
      render(<TreeDiagram data={baseData} />)
      expect(screen.getByTestId('diagram-step-controls')).toBeInTheDocument()
    })

    it('passes correct total steps (root + level1 + level2 + probabilities = 4)', () => {
      render(<TreeDiagram data={baseData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-total')).toBe('4')
    })

    it('passes subject color to controls', () => {
      render(<TreeDiagram data={baseData} subject="physics" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#f97316')
    })

    it('has correct total without probabilities', () => {
      // noProbData: depth 2 (root + 1 level), showProbabilities=false => root(0) + level1(1) = 2
      render(<TreeDiagram data={noProbData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-total')).toBe('2')
    })

    it('includes error step when errors present', () => {
      const errorData = {
        ...baseData,
        errorHighlight: {
          wrongNodes: ['a1'],
          correctPath: ['root', 'b', 'b1'],
        },
      }
      render(<TreeDiagram data={errorData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      // root + level1 + level2 + probabilities + errors = 5
      expect(controls.getAttribute('data-total')).toBe('5')
    })
  })

  // ---------------------------------------------------------------------------
  // Subject Colors
  // ---------------------------------------------------------------------------

  describe('subject colors', () => {
    it('uses math colors by default', () => {
      mockCurrentStep = 3
      render(<TreeDiagram data={baseData} />)
      const prob = screen.getByTestId('td-probability-a')
      expect(prob.getAttribute('style')).toContain('#6366f1')
    })

    it('uses physics colors when subject="physics"', () => {
      mockCurrentStep = 3
      render(<TreeDiagram data={baseData} subject="physics" />)
      const prob = screen.getByTestId('td-probability-a')
      expect(prob.getAttribute('style')).toContain('#f97316')
    })

    it('uses geometry colors when subject="geometry"', () => {
      mockCurrentStep = 3
      render(<TreeDiagram data={baseData} subject="geometry" />)
      const prob = screen.getByTestId('td-probability-a')
      expect(prob.getAttribute('style')).toContain('#ec4899')
    })

    it('passes subject color to step controls', () => {
      render(<TreeDiagram data={baseData} subject="geometry" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#ec4899')
    })
  })

  // ---------------------------------------------------------------------------
  // data-testid coverage
  // ---------------------------------------------------------------------------

  describe('data-testid attributes', () => {
    it('has td-background', () => {
      render(<TreeDiagram data={baseData} />)
      expect(screen.getByTestId('td-background')).toBeInTheDocument()
    })

    it('has td-root', () => {
      mockCurrentStep = 0
      render(<TreeDiagram data={baseData} />)
      expect(screen.getByTestId('td-root')).toBeInTheDocument()
    })

    it('has td-node-{id} for each node', () => {
      mockCurrentStep = 2
      render(<TreeDiagram data={baseData} />)
      expect(screen.getByTestId('td-node-root')).toBeInTheDocument()
      expect(screen.getByTestId('td-node-a')).toBeInTheDocument()
      expect(screen.getByTestId('td-node-b')).toBeInTheDocument()
      expect(screen.getByTestId('td-node-a1')).toBeInTheDocument()
      expect(screen.getByTestId('td-node-b2')).toBeInTheDocument()
    })

    it('has td-edge-{id} for child nodes', () => {
      mockCurrentStep = 2
      render(<TreeDiagram data={baseData} />)
      expect(screen.getByTestId('td-edge-a')).toBeInTheDocument()
      expect(screen.getByTestId('td-edge-b')).toBeInTheDocument()
      expect(screen.getByTestId('td-edge-a1')).toBeInTheDocument()
      expect(screen.getByTestId('td-edge-b2')).toBeInTheDocument()
    })

    it('has td-probability-{id} at probability step', () => {
      mockCurrentStep = 3
      render(<TreeDiagram data={baseData} />)
      expect(screen.getByTestId('td-probability-a')).toBeInTheDocument()
      expect(screen.getByTestId('td-probability-b')).toBeInTheDocument()
      expect(screen.getByTestId('td-probability-a1')).toBeInTheDocument()
    })

    it('has td-level-{n} for each depth level', () => {
      mockCurrentStep = 2
      render(<TreeDiagram data={baseData} />)
      expect(screen.getByTestId('td-level-1')).toBeInTheDocument()
      expect(screen.getByTestId('td-level-2')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Error Highlights
  // ---------------------------------------------------------------------------

  describe('error highlights', () => {
    const errorData = {
      ...baseData,
      errorHighlight: {
        wrongNodes: ['a1'],
        correctPath: ['root', 'b', 'b1'],
        corrections: { a1: 'Should be 1/6' },
      },
    }

    it('renders error group at correct step', () => {
      // root(0) + level1(1) + level2(2) + probabilities(3) + errors(4)
      mockCurrentStep = 4
      render(<TreeDiagram data={errorData} />)
      expect(screen.getByTestId('td-errors')).toBeInTheDocument()
    })

    it('renders wrong node marker', () => {
      mockCurrentStep = 4
      render(<TreeDiagram data={errorData} />)
      expect(screen.getByTestId('td-wrong-a1')).toBeInTheDocument()
    })

    it('renders correct path markers', () => {
      mockCurrentStep = 4
      render(<TreeDiagram data={errorData} />)
      expect(screen.getByTestId('td-correct-root')).toBeInTheDocument()
      expect(screen.getByTestId('td-correct-b')).toBeInTheDocument()
      expect(screen.getByTestId('td-correct-b1')).toBeInTheDocument()
    })

    it('hides errors before their step', () => {
      mockCurrentStep = 3
      render(<TreeDiagram data={errorData} />)
      expect(screen.queryByTestId('td-errors')).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Bilingual step labels
  // ---------------------------------------------------------------------------

  describe('bilingual step labels', () => {
    it('passes English label by default', () => {
      mockCurrentStep = 0
      render(<TreeDiagram data={baseData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-label')).toBe('Draw the root')
    })

    it('passes Hebrew label when language="he"', () => {
      mockCurrentStep = 0
      render(<TreeDiagram data={baseData} language="he" />)
      const controls = screen.getByTestId('diagram-step-controls')
      // Hebrew for "Draw the root"
      expect(controls.getAttribute('data-label')).toContain('\u05E6\u05D9\u05D5\u05E8')
    })

    it('shows level labels at step 1', () => {
      mockCurrentStep = 1
      render(<TreeDiagram data={baseData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-label')).toBe('Show level 1')
    })
  })

  // ---------------------------------------------------------------------------
  // Wrapper components
  // ---------------------------------------------------------------------------

  describe('ProbabilityTree wrapper', () => {
    it('renders tree diagram', () => {
      const events = [
        { name: 'H', probability: '1/2', children: [{ name: 'HH', probability: '1/2' }] },
        { name: 'T', probability: '1/2', children: [{ name: 'TH', probability: '1/2' }] },
      ]
      render(<ProbabilityTree events={events} />)
      expect(screen.getByTestId('tree-diagram')).toBeInTheDocument()
    })

    it('passes through subject prop', () => {
      const events = [{ name: 'H', probability: '1/2' }]
      render(<ProbabilityTree events={events} subject="physics" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#f97316')
    })
  })

  describe('CountingTree wrapper', () => {
    it('renders tree diagram', () => {
      render(<CountingTree levels={[['A', 'B'], ['1', '2']]} />)
      expect(screen.getByTestId('tree-diagram')).toBeInTheDocument()
    })

    it('passes through subject prop', () => {
      render(<CountingTree levels={[['A', 'B']]} subject="geometry" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#ec4899')
    })
  })
})
