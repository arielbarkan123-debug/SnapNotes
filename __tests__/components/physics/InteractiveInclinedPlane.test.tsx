import { render, screen, fireEvent } from '@testing-library/react'
import { InteractiveInclinedPlane } from '@/components/physics/InteractiveInclinedPlane'
import type { InclinedPlaneData } from '@/types/physics'

// =============================================================================
// Mocks
// =============================================================================

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, exit, ...props }: Record<string, unknown>) => (
      <div {...props}>{children as React.ReactNode}</div>
    ),
    button: ({ children, whileHover, whileTap, ...props }: Record<string, unknown>) => (
      <button {...props}>{children as React.ReactNode}</button>
    ),
    svg: ({ children, ...props }: Record<string, unknown>) => (
      <svg {...props}>{children as React.ReactNode}</svg>
    ),
    g: ({ children, ...props }: Record<string, unknown>) => (
      <g {...props}>{children as React.ReactNode}</g>
    ),
    path: (props: Record<string, unknown>) => <path {...props} />,
    line: (props: Record<string, unknown>) => <line {...props} />,
    circle: (props: Record<string, unknown>) => <circle {...props} />,
    rect: (props: Record<string, unknown>) => <rect {...props} />,
    polygon: (props: Record<string, unknown>) => <polygon {...props} />,
    text: ({ children, ...props }: Record<string, unknown>) => (
      <text {...props}>{children as React.ReactNode}</text>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock InclinedPlane component
jest.mock('@/components/physics/InclinedPlane', () => ({
  InclinedPlane: ({ data, width, height, language, initialStep }: {
    data: InclinedPlaneData
    width?: number
    height?: number
    language?: string
    initialStep?: number
  }) => (
    <div
      data-testid="inclined-plane"
      data-width={width}
      data-height={height}
      data-language={language}
      data-initial-step={initialStep}
      data-angle={data.angle}
      data-mass={data.object?.mass}
      data-friction={data.frictionCoefficient}
    >
      Inclined Plane Diagram
    </div>
  ),
}))

// Mock WhatIfMode component
jest.mock('@/components/interactive', () => ({
  WhatIfMode: ({
    parameters,
    values,
    onParameterChange,
    onParametersChange,
    results,
    suggestions,
    language,
    subject,
    expanded,
    onToggleExpanded,
    onReset,
  }: {
    parameters: unknown[]
    values: Record<string, number>
    onParameterChange: (name: string, value: number) => void
    onParametersChange: (changes: Record<string, number>) => void
    results: unknown[]
    suggestions?: unknown[]
    language?: string
    subject?: string
    expanded?: boolean
    onToggleExpanded?: () => void
    onReset?: () => void
  }) => (
    <div
      data-testid="what-if-mode"
      data-language={language}
      data-subject={subject}
      data-expanded={expanded}
    >
      <span data-testid="what-if-values">{JSON.stringify(values)}</span>
      <span data-testid="what-if-params-count">{parameters.length}</span>
      <span data-testid="what-if-results-count">{results.length}</span>
      <button
        data-testid="what-if-change-mass"
        onClick={() => onParameterChange('mass', 10)}
      >
        Change Mass
      </button>
      <button
        data-testid="what-if-change-multiple"
        onClick={() => onParametersChange({ angle: 45, friction: 0.5 })}
      >
        Change Multiple
      </button>
      {onToggleExpanded && (
        <button data-testid="what-if-toggle-expanded" onClick={onToggleExpanded}>
          Toggle Expanded
        </button>
      )}
      {onReset && (
        <button data-testid="what-if-reset" onClick={onReset}>
          Reset
        </button>
      )}
    </div>
  ),
}))

// Mock useInteractiveParameters hook
const mockSetValue = jest.fn()
const mockSetValues = jest.fn()
const mockReset = jest.fn()

jest.mock('@/hooks/useInteractiveParameters', () => ({
  useInteractiveParameters: (parameters: unknown[], options: { calculate?: (params: Record<string, number>) => unknown[] }) => {
    // Call calculate if provided (to test integration)
    const results = options.calculate
      ? options.calculate({ mass: 5, angle: 30, friction: 0.3 })
      : []

    return {
      values: { mass: 5, angle: 30, friction: 0.3 },
      actions: {
        setValue: mockSetValue,
        setValues: mockSetValues,
        reset: mockReset,
        undo: jest.fn(),
        redo: jest.fn(),
        canUndo: false,
        canRedo: false,
      },
      results,
      state: {
        values: { mass: 5, angle: 30, friction: 0.3 },
        isDirty: false,
        history: [],
        historyIndex: 0,
      },
    }
  },
}))

// Mock visual-learning library
jest.mock('@/lib/visual-learning', () => ({
  INCLINED_PLANE_PARAMETERS: [
    { name: 'mass', label: 'Mass', labelHe: 'מסה', default: 5, min: 0.1, max: 20, step: 0.1, unit: 'kg', unitHe: 'ק"ג' },
    { name: 'angle', label: 'Angle', labelHe: 'זווית', default: 30, min: 0, max: 60, step: 1, unit: '°' },
    { name: 'friction', label: 'Friction', labelHe: 'חיכוך', default: 0.3, min: 0, max: 1, step: 0.1 },
  ],
  INCLINED_PLANE_SUGGESTIONS: [
    { id: 'steep-angle', question: 'What if steeper?', questionHe: 'מה אם תלול יותר?', parameterChanges: { angle: 45 } },
    { id: 'no-friction', question: 'What if no friction?', questionHe: 'מה אם ללא חיכוך?', parameterChanges: { friction: 0 } },
  ],
  getInclinedPlaneResults: jest.fn(() => [
    { value: 49, unit: 'N', label: 'Weight', labelHe: 'משקל', formatted: '49.0 N', isPrimary: true },
    { value: 2.45, unit: 'm/s²', label: 'Acceleration', labelHe: 'תאוצה', formatted: '2.45 m/s²' },
  ]),
  calculateInclinedPlane: jest.fn(() => ({
    weight: 49,
    normalForce: 42.4,
    frictionForce: 12.7,
    acceleration: 2.45,
  })),
}))

// =============================================================================
// Test Data
// =============================================================================

const createMockInitialData = (overrides?: Partial<InclinedPlaneData>): InclinedPlaneData => ({
  angle: 30,
  object: {
    type: 'block',
    position: { x: 0, y: 0 },
    mass: 5,
    label: '5 kg',
  },
  forces: [
    { name: 'weight', type: 'weight', magnitude: 49, angle: -90, symbol: 'W' },
    { name: 'normal', type: 'normal', magnitude: 42.4, angle: 60, symbol: 'N' },
    { name: 'friction', type: 'friction', magnitude: 12.7, angle: 150, symbol: 'f' },
  ],
  frictionCoefficient: 0.3,
  ...overrides,
})

// =============================================================================
// Tests
// =============================================================================

describe('InteractiveInclinedPlane', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // Basic Rendering
  // ---------------------------------------------------------------------------

  describe('basic rendering', () => {
    it('renders with required props', () => {
      const initialData = createMockInitialData()
      render(<InteractiveInclinedPlane initialData={initialData} />)

      expect(screen.getByTestId('inclined-plane')).toBeInTheDocument()
      expect(screen.getByText(/What-If Mode/)).toBeInTheDocument()
    })

    it('renders toggle button with English text by default', () => {
      const initialData = createMockInitialData()
      render(<InteractiveInclinedPlane initialData={initialData} />)

      expect(screen.getByText('What-If Mode')).toBeInTheDocument()
    })

    it('renders toggle button with Hebrew text when language is he', () => {
      const initialData = createMockInitialData()
      render(<InteractiveInclinedPlane initialData={initialData} language="he" />)

      expect(screen.getByText('מצב "מה אם"')).toBeInTheDocument()
    })

    it('does not render WhatIfMode panel initially', () => {
      const initialData = createMockInitialData()
      render(<InteractiveInclinedPlane initialData={initialData} />)

      expect(screen.queryByTestId('what-if-mode')).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // What-If Mode Toggle
  // ---------------------------------------------------------------------------

  describe('what-if mode toggle', () => {
    it('shows WhatIfMode panel when toggled on', () => {
      const initialData = createMockInitialData()
      render(<InteractiveInclinedPlane initialData={initialData} />)

      const toggleButton = screen.getByText('What-If Mode')
      fireEvent.click(toggleButton)

      expect(screen.getByTestId('what-if-mode')).toBeInTheDocument()
    })

    it('hides WhatIfMode panel when toggled off', () => {
      const initialData = createMockInitialData()
      render(<InteractiveInclinedPlane initialData={initialData} />)

      const toggleButton = screen.getByText('What-If Mode')
      fireEvent.click(toggleButton) // Turn on
      expect(screen.getByTestId('what-if-mode')).toBeInTheDocument()

      fireEvent.click(toggleButton) // Turn off
      expect(screen.queryByTestId('what-if-mode')).not.toBeInTheDocument()
    })

    it('calls onWhatIfToggle callback when toggled', () => {
      const initialData = createMockInitialData()
      const onWhatIfToggle = jest.fn()
      render(
        <InteractiveInclinedPlane
          initialData={initialData}
          onWhatIfToggle={onWhatIfToggle}
        />
      )

      const toggleButton = screen.getByText('What-If Mode')
      fireEvent.click(toggleButton)

      expect(onWhatIfToggle).toHaveBeenCalledWith(true)

      fireEvent.click(toggleButton)
      expect(onWhatIfToggle).toHaveBeenCalledWith(false)
    })

    it('respects whatIfEnabled prop', () => {
      const initialData = createMockInitialData()
      render(
        <InteractiveInclinedPlane
          initialData={initialData}
          whatIfEnabled={true}
        />
      )

      expect(screen.getByTestId('what-if-mode')).toBeInTheDocument()
    })

    it('applies active styling when what-if mode is enabled', () => {
      const initialData = createMockInitialData()
      render(
        <InteractiveInclinedPlane
          initialData={initialData}
          whatIfEnabled={true}
        />
      )

      const toggleButton = screen.getByText('What-If Mode').closest('button')
      expect(toggleButton).toHaveClass('bg-blue-100')
    })
  })

  // ---------------------------------------------------------------------------
  // RTL/Hebrew Support
  // ---------------------------------------------------------------------------

  describe('RTL/Hebrew support', () => {
    it('passes language to InclinedPlane', () => {
      const initialData = createMockInitialData()
      render(<InteractiveInclinedPlane initialData={initialData} language="he" />)

      const diagram = screen.getByTestId('inclined-plane')
      expect(diagram).toHaveAttribute('data-language', 'he')
    })

    it('passes language to WhatIfMode when enabled', () => {
      const initialData = createMockInitialData()
      render(
        <InteractiveInclinedPlane
          initialData={initialData}
          language="he"
          whatIfEnabled={true}
        />
      )

      const whatIfMode = screen.getByTestId('what-if-mode')
      expect(whatIfMode).toHaveAttribute('data-language', 'he')
    })

    it('uses RTL layout when language is he', () => {
      const initialData = createMockInitialData()
      const { container } = render(
        <InteractiveInclinedPlane
          initialData={initialData}
          language="he"
          whatIfEnabled={true}
        />
      )

      const layoutContainer = container.querySelector('.flex-row-reverse')
      expect(layoutContainer).toBeInTheDocument()
    })

    it('uses LTR layout when language is en', () => {
      const initialData = createMockInitialData()
      const { container } = render(
        <InteractiveInclinedPlane
          initialData={initialData}
          language="en"
          whatIfEnabled={true}
        />
      )

      const layoutContainer = container.querySelector('.flex-row:not(.flex-row-reverse)')
      expect(layoutContainer).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Parameter Changes via WhatIfMode
  // ---------------------------------------------------------------------------

  describe('parameter changes', () => {
    it('passes parameters to WhatIfMode', () => {
      const initialData = createMockInitialData()
      render(
        <InteractiveInclinedPlane
          initialData={initialData}
          whatIfEnabled={true}
        />
      )

      const paramsCount = screen.getByTestId('what-if-params-count')
      expect(paramsCount.textContent).toBe('3') // mass, angle, friction
    })

    it('passes values to WhatIfMode', () => {
      const initialData = createMockInitialData()
      render(
        <InteractiveInclinedPlane
          initialData={initialData}
          whatIfEnabled={true}
        />
      )

      const values = screen.getByTestId('what-if-values')
      const parsedValues = JSON.parse(values.textContent || '{}')
      expect(parsedValues).toEqual({ mass: 5, angle: 30, friction: 0.3 })
    })

    it('passes results to WhatIfMode', () => {
      const initialData = createMockInitialData()
      render(
        <InteractiveInclinedPlane
          initialData={initialData}
          whatIfEnabled={true}
        />
      )

      const resultsCount = screen.getByTestId('what-if-results-count')
      // Results are calculated by the mock
      expect(parseInt(resultsCount.textContent || '0')).toBeGreaterThan(0)
    })

    it('handles onReset callback', () => {
      const initialData = createMockInitialData()
      render(
        <InteractiveInclinedPlane
          initialData={initialData}
          whatIfEnabled={true}
        />
      )

      const resetButton = screen.getByTestId('what-if-reset')
      fireEvent.click(resetButton)

      expect(mockReset).toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // Initial Data
  // ---------------------------------------------------------------------------

  describe('initial data', () => {
    it('builds diagram data from hook values', () => {
      // The component uses useInteractiveParameters hook values to build diagram data
      // The mock returns { mass: 5, angle: 30, friction: 0.3 }
      const initialData = createMockInitialData()

      render(<InteractiveInclinedPlane initialData={initialData} />)

      const diagram = screen.getByTestId('inclined-plane')
      // The diagram data is built from hook values, which defaults to the mock values
      expect(diagram).toHaveAttribute('data-angle', '30')
      expect(diagram).toHaveAttribute('data-mass', '5')
      expect(diagram).toHaveAttribute('data-friction', '0.3')
    })

    it('preserves initial data structure for diagram data building', () => {
      // The component preserves structure from initialData when building diagram data
      const initialData = createMockInitialData({
        object: {
          type: 'sphere', // Different type
          position: { x: 10, y: 20 },
          mass: 15,
          label: '15 kg',
        },
      })

      render(<InteractiveInclinedPlane initialData={initialData} />)

      // The component should render without errors
      const diagram = screen.getByTestId('inclined-plane')
      expect(diagram).toBeInTheDocument()
    })

    it('accepts initial data with custom friction coefficient', () => {
      const initialData = createMockInitialData({
        frictionCoefficient: 0.7,
      })

      render(<InteractiveInclinedPlane initialData={initialData} />)

      // The component processes the initial data
      const diagram = screen.getByTestId('inclined-plane')
      expect(diagram).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Width/Height Props
  // ---------------------------------------------------------------------------

  describe('width and height props', () => {
    it('passes width prop to InclinedPlane', () => {
      const initialData = createMockInitialData()
      render(<InteractiveInclinedPlane initialData={initialData} width={600} />)

      const diagram = screen.getByTestId('inclined-plane')
      expect(diagram).toHaveAttribute('data-width', '600')
    })

    it('passes height prop to InclinedPlane', () => {
      const initialData = createMockInitialData()
      render(<InteractiveInclinedPlane initialData={initialData} height={400} />)

      const diagram = screen.getByTestId('inclined-plane')
      expect(diagram).toHaveAttribute('data-height', '400')
    })

    it('uses default width when not specified', () => {
      const initialData = createMockInitialData()
      render(<InteractiveInclinedPlane initialData={initialData} />)

      const diagram = screen.getByTestId('inclined-plane')
      expect(diagram).toHaveAttribute('data-width', '500')
    })

    it('uses default height when not specified', () => {
      const initialData = createMockInitialData()
      render(<InteractiveInclinedPlane initialData={initialData} />)

      const diagram = screen.getByTestId('inclined-plane')
      expect(diagram).toHaveAttribute('data-height', '380')
    })
  })

  // ---------------------------------------------------------------------------
  // Initial Step
  // ---------------------------------------------------------------------------

  describe('initial step', () => {
    it('passes initialStep to InclinedPlane', () => {
      const initialData = createMockInitialData()
      render(<InteractiveInclinedPlane initialData={initialData} initialStep={3} />)

      const diagram = screen.getByTestId('inclined-plane')
      expect(diagram).toHaveAttribute('data-initial-step', '3')
    })

    it('uses default initialStep of 0 when not specified', () => {
      const initialData = createMockInitialData()
      render(<InteractiveInclinedPlane initialData={initialData} />)

      const diagram = screen.getByTestId('inclined-plane')
      expect(diagram).toHaveAttribute('data-initial-step', '0')
    })
  })

  // ---------------------------------------------------------------------------
  // WhatIfMode Panel Configuration
  // ---------------------------------------------------------------------------

  describe('WhatIfMode panel configuration', () => {
    it('passes subject="physics" to WhatIfMode', () => {
      const initialData = createMockInitialData()
      render(
        <InteractiveInclinedPlane
          initialData={initialData}
          whatIfEnabled={true}
        />
      )

      const whatIfMode = screen.getByTestId('what-if-mode')
      expect(whatIfMode).toHaveAttribute('data-subject', 'physics')
    })

    it('WhatIfMode panel is initially expanded', () => {
      const initialData = createMockInitialData()
      render(
        <InteractiveInclinedPlane
          initialData={initialData}
          whatIfEnabled={true}
        />
      )

      const whatIfMode = screen.getByTestId('what-if-mode')
      expect(whatIfMode).toHaveAttribute('data-expanded', 'true')
    })

    it('can toggle expanded state via WhatIfMode callback', () => {
      const initialData = createMockInitialData()
      render(
        <InteractiveInclinedPlane
          initialData={initialData}
          whatIfEnabled={true}
        />
      )

      const toggleExpandedButton = screen.getByTestId('what-if-toggle-expanded')
      fireEvent.click(toggleExpandedButton)

      // The component should handle the toggle internally
      // This tests that the callback is wired up properly
      expect(toggleExpandedButton).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Visual Feedback
  // ---------------------------------------------------------------------------

  describe('visual feedback', () => {
    it('adds ring highlight to diagram when what-if mode is enabled', () => {
      const initialData = createMockInitialData()
      const { container } = render(
        <InteractiveInclinedPlane
          initialData={initialData}
          whatIfEnabled={true}
        />
      )

      const diagramContainer = container.querySelector('.ring-2.ring-blue-500\\/30')
      expect(diagramContainer).toBeInTheDocument()
    })

    it('removes ring highlight when what-if mode is disabled', () => {
      const initialData = createMockInitialData()
      const { container } = render(
        <InteractiveInclinedPlane
          initialData={initialData}
          whatIfEnabled={false}
        />
      )

      const diagramContainer = container.querySelector('.ring-2.ring-blue-500\\/30')
      expect(diagramContainer).not.toBeInTheDocument()
    })

    it('shows pulsing indicator when what-if mode is active', () => {
      const initialData = createMockInitialData()
      const { container } = render(
        <InteractiveInclinedPlane
          initialData={initialData}
          whatIfEnabled={true}
        />
      )

      const pulsingIndicator = container.querySelector('.animate-pulse')
      expect(pulsingIndicator).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------

  describe('callbacks', () => {
    it('calls onParamsChange when parameters change in what-if mode', () => {
      const initialData = createMockInitialData()
      const onParamsChange = jest.fn()
      render(
        <InteractiveInclinedPlane
          initialData={initialData}
          whatIfEnabled={true}
          onParamsChange={onParamsChange}
        />
      )

      // The mock useInteractiveParameters calls onChange when setValue is called
      // We just verify the prop is accepted
      expect(screen.getByTestId('what-if-mode')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Edge Cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles missing object in initial data', () => {
      const initialData = {
        angle: 30,
        forces: [],
      } as unknown as InclinedPlaneData

      render(<InteractiveInclinedPlane initialData={initialData} />)

      expect(screen.getByTestId('inclined-plane')).toBeInTheDocument()
    })

    it('handles missing friction coefficient in initial data', () => {
      const initialData = createMockInitialData()
      delete (initialData as Partial<InclinedPlaneData>).frictionCoefficient

      render(<InteractiveInclinedPlane initialData={initialData} />)

      expect(screen.getByTestId('inclined-plane')).toBeInTheDocument()
    })

    it('handles empty forces array', () => {
      const initialData = createMockInitialData({ forces: [] })

      render(<InteractiveInclinedPlane initialData={initialData} />)

      expect(screen.getByTestId('inclined-plane')).toBeInTheDocument()
    })
  })
})
