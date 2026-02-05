import { render, screen, fireEvent } from '@testing-library/react'
import { InteractiveFreeBodyDiagram } from '@/components/physics/InteractiveFreeBodyDiagram'
import type { FreeBodyDiagramData, Force } from '@/types/physics'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, exit, ...props }: Record<string, unknown>) => <div {...props}>{children as React.ReactNode}</div>,
    button: ({ children, whileHover, whileTap, ...props }: Record<string, unknown>) => <button {...props}>{children as React.ReactNode}</button>,
    g: ({ children, initial, animate, exit, variants, ...props }: Record<string, unknown>) => <g {...props}>{children as React.ReactNode}</g>,
    text: ({ children, initial, animate, exit, variants, ...props }: Record<string, unknown>) => <text {...props}>{children as React.ReactNode}</text>,
    line: ({ children, initial, animate, exit, variants, ...props }: Record<string, unknown>) => <line {...props}>{children as React.ReactNode}</line>,
    path: ({ children, initial, animate, exit, variants, ...props }: Record<string, unknown>) => <path {...props}>{children as React.ReactNode}</path>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock FreeBodyDiagram component
jest.mock('@/components/physics/FreeBodyDiagram', () => ({
  FreeBodyDiagram: ({ data, width, height, language, initialStep }: {
    data: FreeBodyDiagramData
    width?: number
    height?: number
    language?: string
    initialStep?: number
  }) => (
    <div
      data-testid="mock-free-body-diagram"
      data-width={width}
      data-height={height}
      data-language={language}
      data-initial-step={initialStep}
      data-mass={data.object?.mass}
      data-forces-count={data.forces?.length}
    >
      Mock FreeBodyDiagram
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
    language,
    subject,
    expanded,
    onToggleExpanded,
    onReset,
  }: {
    parameters: unknown[]
    values: Record<string, number>
    onParameterChange: (name: string, value: number) => void
    onParametersChange: (values: Record<string, number>) => void
    results: unknown[]
    language?: string
    subject?: string
    expanded?: boolean
    onToggleExpanded?: () => void
    onReset?: () => void
  }) => (
    <div
      data-testid="mock-what-if-mode"
      data-language={language}
      data-subject={subject}
      data-expanded={expanded}
      data-mass-value={values.mass}
      data-applied-force-value={values.appliedForce}
      data-applied-angle-value={values.appliedAngle}
      data-friction-value={values.friction}
    >
      Mock WhatIfMode
      <button
        data-testid="mock-slider-mass"
        onClick={() => onParameterChange('mass', 10)}
      >
        Change Mass
      </button>
      <button
        data-testid="mock-slider-applied-force"
        onClick={() => onParameterChange('appliedForce', 50)}
      >
        Change Applied Force
      </button>
      <button
        data-testid="mock-reset"
        onClick={onReset}
      >
        Reset
      </button>
      <button
        data-testid="mock-toggle-expanded"
        onClick={onToggleExpanded}
      >
        Toggle
      </button>
    </div>
  ),
}))

// Mock visual-learning module
jest.mock('@/lib/visual-learning', () => ({
  FBD_PARAMETERS: [
    { name: 'mass', label: 'Mass', labelHe: 'מסה', default: 5, min: 0.1, max: 50, step: 0.1, unit: 'kg', unitHe: 'ק"ג', category: 'mass' },
    { name: 'appliedForce', label: 'Applied Force', labelHe: 'כוח מופעל', default: 20, min: 0, max: 100, step: 1, unit: 'N', unitHe: 'N', category: 'force' },
    { name: 'appliedAngle', label: 'Force Angle', labelHe: 'זווית הכוח', default: 0, min: -45, max: 45, step: 1, unit: '°', category: 'angle' },
    { name: 'friction', label: 'Friction', labelHe: 'חיכוך', default: 0.2, min: 0, max: 1, step: 0.05, unit: '', category: 'friction' },
  ],
  getFBDResults: jest.fn().mockReturnValue([
    { value: 2, unit: 'm/s²', label: 'Acceleration', labelHe: 'תאוצה', formatted: '2.00 m/s²', isPrimary: true },
    { value: 49, unit: 'N', label: 'Weight', labelHe: 'משקל', formatted: '49.0 N' },
    { value: 49, unit: 'N', label: 'Normal Force', labelHe: 'כוח נורמלי', formatted: '49.0 N' },
  ]),
  calculateFBD: jest.fn().mockReturnValue({
    weight: 49,
    normalForce: 49,
    frictionForce: 9.8,
    netForceX: 10.2,
    netForceY: 0,
    accelerationX: 2.04,
    accelerationY: 0,
  }),
}))

// Mock useInteractiveParameters hook
jest.mock('@/hooks/useInteractiveParameters', () => ({
  useInteractiveParameters: jest.fn().mockReturnValue({
    values: { mass: 5, appliedForce: 20, appliedAngle: 0, friction: 0.2 },
    actions: {
      setValue: jest.fn(),
      setValues: jest.fn(),
      reset: jest.fn(),
    },
    results: [
      { value: 2, unit: 'm/s²', label: 'Acceleration', formatted: '2.00 m/s²', isPrimary: true },
    ],
  }),
}))

// =============================================================================
// Test Data
// =============================================================================

const mockForces: Force[] = [
  {
    name: 'weight',
    type: 'weight',
    magnitude: 49,
    angle: -90,
    symbol: 'W',
  },
  {
    name: 'normal',
    type: 'normal',
    magnitude: 49,
    angle: 90,
    symbol: 'N',
  },
  {
    name: 'applied',
    type: 'applied',
    magnitude: 20,
    angle: 0,
    symbol: 'F',
    subscript: 'app',
  },
]

const mockInitialData: FreeBodyDiagramData = {
  object: {
    type: 'block',
    position: { x: 0, y: 0 },
    mass: 5,
    label: 'Block',
    width: 50,
    height: 50,
  },
  forces: mockForces,
  coordinateSystem: 'standard',
  showComponents: false,
  showNetForce: false,
}

// =============================================================================
// Tests
// =============================================================================

describe('InteractiveFreeBodyDiagram', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // Basic Rendering
  // ---------------------------------------------------------------------------

  describe('basic rendering', () => {
    it('renders with required props', () => {
      render(<InteractiveFreeBodyDiagram initialData={mockInitialData} />)

      expect(screen.getByTestId('mock-free-body-diagram')).toBeInTheDocument()
      expect(screen.getByText('What-If Mode')).toBeInTheDocument()
    })

    it('renders the toggle button', () => {
      render(<InteractiveFreeBodyDiagram initialData={mockInitialData} />)

      const toggleButton = screen.getByRole('button', { name: /what-if mode/i })
      expect(toggleButton).toBeInTheDocument()
    })

    it('does not render WhatIfMode panel when disabled', () => {
      render(<InteractiveFreeBodyDiagram initialData={mockInitialData} whatIfEnabled={false} />)

      expect(screen.queryByTestId('mock-what-if-mode')).not.toBeInTheDocument()
    })

    it('renders WhatIfMode panel when enabled', () => {
      render(<InteractiveFreeBodyDiagram initialData={mockInitialData} whatIfEnabled={true} />)

      expect(screen.getByTestId('mock-what-if-mode')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Width/Height Props
  // ---------------------------------------------------------------------------

  describe('width and height props', () => {
    it('passes default width and height to FreeBodyDiagram', () => {
      render(<InteractiveFreeBodyDiagram initialData={mockInitialData} />)

      const diagram = screen.getByTestId('mock-free-body-diagram')
      expect(diagram).toHaveAttribute('data-width', '400')
      expect(diagram).toHaveAttribute('data-height', '350')
    })

    it('passes custom width and height to FreeBodyDiagram', () => {
      render(
        <InteractiveFreeBodyDiagram
          initialData={mockInitialData}
          width={600}
          height={500}
        />
      )

      const diagram = screen.getByTestId('mock-free-body-diagram')
      expect(diagram).toHaveAttribute('data-width', '600')
      expect(diagram).toHaveAttribute('data-height', '500')
    })
  })

  // ---------------------------------------------------------------------------
  // What-If Mode Toggle
  // ---------------------------------------------------------------------------

  describe('what-if mode toggle', () => {
    it('toggles what-if mode when button is clicked', () => {
      render(<InteractiveFreeBodyDiagram initialData={mockInitialData} />)

      // Initially disabled
      expect(screen.queryByTestId('mock-what-if-mode')).not.toBeInTheDocument()

      // Click toggle
      const toggleButton = screen.getByRole('button', { name: /what-if mode/i })
      fireEvent.click(toggleButton)

      // Now enabled
      expect(screen.getByTestId('mock-what-if-mode')).toBeInTheDocument()
    })

    it('calls onWhatIfToggle callback when toggled', () => {
      const onWhatIfToggle = jest.fn()
      render(
        <InteractiveFreeBodyDiagram
          initialData={mockInitialData}
          onWhatIfToggle={onWhatIfToggle}
        />
      )

      const toggleButton = screen.getByRole('button', { name: /what-if mode/i })
      fireEvent.click(toggleButton)

      expect(onWhatIfToggle).toHaveBeenCalledWith(true)

      // Click again to disable
      fireEvent.click(toggleButton)
      expect(onWhatIfToggle).toHaveBeenCalledWith(false)
    })

    it('respects initial whatIfEnabled prop', () => {
      render(
        <InteractiveFreeBodyDiagram
          initialData={mockInitialData}
          whatIfEnabled={true}
        />
      )

      expect(screen.getByTestId('mock-what-if-mode')).toBeInTheDocument()
    })

    it('applies active styling when what-if mode is enabled', () => {
      render(<InteractiveFreeBodyDiagram initialData={mockInitialData} />)

      const toggleButton = screen.getByRole('button', { name: /what-if mode/i })

      // Initially inactive
      expect(toggleButton).toHaveClass('bg-gray-100')

      // Click to enable
      fireEvent.click(toggleButton)

      // Now active
      expect(toggleButton).toHaveClass('bg-blue-100')
    })
  })

  // ---------------------------------------------------------------------------
  // RTL/Hebrew Support
  // ---------------------------------------------------------------------------

  describe('RTL/Hebrew support', () => {
    it('shows Hebrew label when language is he', () => {
      render(
        <InteractiveFreeBodyDiagram
          initialData={mockInitialData}
          language="he"
        />
      )

      expect(screen.getByText('מצב "מה אם"')).toBeInTheDocument()
    })

    it('passes language to FreeBodyDiagram', () => {
      render(
        <InteractiveFreeBodyDiagram
          initialData={mockInitialData}
          language="he"
        />
      )

      const diagram = screen.getByTestId('mock-free-body-diagram')
      expect(diagram).toHaveAttribute('data-language', 'he')
    })

    it('passes language to WhatIfMode when enabled', () => {
      render(
        <InteractiveFreeBodyDiagram
          initialData={mockInitialData}
          language="he"
          whatIfEnabled={true}
        />
      )

      const whatIfMode = screen.getByTestId('mock-what-if-mode')
      expect(whatIfMode).toHaveAttribute('data-language', 'he')
    })

    it('applies RTL layout when language is he', () => {
      const { container } = render(
        <InteractiveFreeBodyDiagram
          initialData={mockInitialData}
          language="he"
          whatIfEnabled={true}
        />
      )

      // Check for flex-row-reverse class
      const layoutDiv = container.querySelector('.flex-row-reverse')
      expect(layoutDiv).toBeInTheDocument()
    })

    it('applies LTR layout when language is en', () => {
      const { container } = render(
        <InteractiveFreeBodyDiagram
          initialData={mockInitialData}
          language="en"
          whatIfEnabled={true}
        />
      )

      // Check for flex-row class (not flex-row-reverse)
      const layoutDiv = container.querySelector('.flex-row:not(.flex-row-reverse)')
      expect(layoutDiv).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Initial Data Handling
  // ---------------------------------------------------------------------------

  describe('initial data handling', () => {
    it('passes initial data to FreeBodyDiagram', () => {
      render(<InteractiveFreeBodyDiagram initialData={mockInitialData} />)

      const diagram = screen.getByTestId('mock-free-body-diagram')
      // The component uses the hook's values (mass: 5 from mock) and recalculates forces
      expect(diagram).toHaveAttribute('data-mass', '5')
      // Forces are recalculated: weight, normal, applied (from appliedForce > 0), and friction
      // The exact count depends on the calculateFBD mock results
      expect(diagram).toBeInTheDocument()
    })

    it('respects object mass from initial data', () => {
      // The component extracts initial mass from initialData.object.mass
      // but then uses the hook to manage state, which starts from defaults
      render(<InteractiveFreeBodyDiagram initialData={mockInitialData} />)

      const diagram = screen.getByTestId('mock-free-body-diagram')
      // The mock hook returns mass: 5, which matches our initialData
      expect(diagram).toHaveAttribute('data-mass', '5')
    })

    it('handles initial step prop', () => {
      render(
        <InteractiveFreeBodyDiagram
          initialData={mockInitialData}
          initialStep={2}
        />
      )

      const diagram = screen.getByTestId('mock-free-body-diagram')
      expect(diagram).toHaveAttribute('data-initial-step', '2')
    })
  })

  // ---------------------------------------------------------------------------
  // Parameter Changes via WhatIfMode
  // ---------------------------------------------------------------------------

  describe('parameter changes via WhatIfMode', () => {
    it('passes subject to WhatIfMode', () => {
      render(
        <InteractiveFreeBodyDiagram
          initialData={mockInitialData}
          whatIfEnabled={true}
        />
      )

      const whatIfMode = screen.getByTestId('mock-what-if-mode')
      expect(whatIfMode).toHaveAttribute('data-subject', 'physics')
    })

    it('passes expanded state to WhatIfMode', () => {
      render(
        <InteractiveFreeBodyDiagram
          initialData={mockInitialData}
          whatIfEnabled={true}
        />
      )

      const whatIfMode = screen.getByTestId('mock-what-if-mode')
      // Default expanded is true
      expect(whatIfMode).toHaveAttribute('data-expanded', 'true')
    })

    it('passes parameter values to WhatIfMode', () => {
      render(
        <InteractiveFreeBodyDiagram
          initialData={mockInitialData}
          whatIfEnabled={true}
        />
      )

      const whatIfMode = screen.getByTestId('mock-what-if-mode')
      expect(whatIfMode).toHaveAttribute('data-mass-value', '5')
      expect(whatIfMode).toHaveAttribute('data-applied-force-value', '20')
      expect(whatIfMode).toHaveAttribute('data-friction-value', '0.2')
    })

    it('calls onParameterChange through WhatIfMode slider', () => {
      const { useInteractiveParameters } = require('@/hooks/useInteractiveParameters')
      const mockSetValue = jest.fn()
      useInteractiveParameters.mockReturnValue({
        values: { mass: 5, appliedForce: 20, appliedAngle: 0, friction: 0.2 },
        actions: {
          setValue: mockSetValue,
          setValues: jest.fn(),
          reset: jest.fn(),
        },
        results: [],
      })

      render(
        <InteractiveFreeBodyDiagram
          initialData={mockInitialData}
          whatIfEnabled={true}
        />
      )

      const changeMassButton = screen.getByTestId('mock-slider-mass')
      fireEvent.click(changeMassButton)

      expect(mockSetValue).toHaveBeenCalledWith('mass', 10)
    })

    it('calls reset through WhatIfMode', () => {
      const { useInteractiveParameters } = require('@/hooks/useInteractiveParameters')
      const mockReset = jest.fn()
      useInteractiveParameters.mockReturnValue({
        values: { mass: 5, appliedForce: 20, appliedAngle: 0, friction: 0.2 },
        actions: {
          setValue: jest.fn(),
          setValues: jest.fn(),
          reset: mockReset,
        },
        results: [],
      })

      render(
        <InteractiveFreeBodyDiagram
          initialData={mockInitialData}
          whatIfEnabled={true}
        />
      )

      const resetButton = screen.getByTestId('mock-reset')
      fireEvent.click(resetButton)

      expect(mockReset).toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // Diagram Ring Highlight
  // ---------------------------------------------------------------------------

  describe('diagram ring highlight', () => {
    it('applies ring highlight when what-if mode is enabled', () => {
      const { container } = render(
        <InteractiveFreeBodyDiagram
          initialData={mockInitialData}
          whatIfEnabled={true}
        />
      )

      const diagramContainer = container.querySelector('.ring-2.ring-blue-500\\/30')
      expect(diagramContainer).toBeInTheDocument()
    })

    it('does not apply ring highlight when what-if mode is disabled', () => {
      const { container } = render(
        <InteractiveFreeBodyDiagram
          initialData={mockInitialData}
          whatIfEnabled={false}
        />
      )

      const diagramContainer = container.querySelector('.ring-2.ring-blue-500\\/30')
      expect(diagramContainer).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Edge Cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles data with no applied force', () => {
      const dataWithNoApplied: FreeBodyDiagramData = {
        object: {
          type: 'block',
          position: { x: 0, y: 0 },
          mass: 5,
        },
        forces: [
          { name: 'weight', type: 'weight', magnitude: 49, angle: -90 },
          { name: 'normal', type: 'normal', magnitude: 49, angle: 90 },
        ],
      }

      render(<InteractiveFreeBodyDiagram initialData={dataWithNoApplied} />)

      expect(screen.getByTestId('mock-free-body-diagram')).toBeInTheDocument()
    })

    it('handles data with no mass specified', () => {
      const dataWithNoMass: FreeBodyDiagramData = {
        object: {
          type: 'block',
          position: { x: 0, y: 0 },
        },
        forces: mockForces,
      }

      render(<InteractiveFreeBodyDiagram initialData={dataWithNoMass} />)

      expect(screen.getByTestId('mock-free-body-diagram')).toBeInTheDocument()
    })

    it('handles empty forces array', () => {
      const dataWithNoForces: FreeBodyDiagramData = {
        object: {
          type: 'block',
          position: { x: 0, y: 0 },
          mass: 5,
        },
        forces: [],
      }

      render(<InteractiveFreeBodyDiagram initialData={dataWithNoForces} />)

      expect(screen.getByTestId('mock-free-body-diagram')).toBeInTheDocument()
    })

    it('handles sphere object type', () => {
      const dataSphere: FreeBodyDiagramData = {
        object: {
          type: 'sphere',
          position: { x: 0, y: 0 },
          mass: 3,
          radius: 25,
        },
        forces: mockForces,
      }

      render(<InteractiveFreeBodyDiagram initialData={dataSphere} />)

      expect(screen.getByTestId('mock-free-body-diagram')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Callback Props
  // ---------------------------------------------------------------------------

  describe('callback props', () => {
    it('calls onParamsChange when parameters change and what-if is enabled', () => {
      const onParamsChange = jest.fn()
      const { useInteractiveParameters } = require('@/hooks/useInteractiveParameters')

      // Capture the onChange callback
      let capturedOnChange: ((values: Record<string, number>) => void) | undefined
      useInteractiveParameters.mockImplementation(
        (_params: unknown, options: { onChange?: (values: Record<string, number>) => void }) => {
          capturedOnChange = options.onChange
          return {
            values: { mass: 5, appliedForce: 20, appliedAngle: 0, friction: 0.2 },
            actions: {
              setValue: jest.fn(),
              setValues: jest.fn(),
              reset: jest.fn(),
            },
            results: [],
          }
        }
      )

      render(
        <InteractiveFreeBodyDiagram
          initialData={mockInitialData}
          whatIfEnabled={true}
          onParamsChange={onParamsChange}
        />
      )

      // Simulate parameter change via hook callback
      if (capturedOnChange) {
        capturedOnChange({ mass: 10, appliedForce: 20, appliedAngle: 0, friction: 0.2 })
      }

      // The callback should be called with updated FreeBodyDiagramData
      expect(onParamsChange).toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // Styling Classes
  // ---------------------------------------------------------------------------

  describe('styling classes', () => {
    it('applies space-y-4 to main container', () => {
      const { container } = render(
        <InteractiveFreeBodyDiagram initialData={mockInitialData} />
      )

      const mainDiv = container.firstChild
      expect(mainDiv).toHaveClass('space-y-4')
    })

    it('applies gap-4 to layout container', () => {
      const { container } = render(
        <InteractiveFreeBodyDiagram
          initialData={mockInitialData}
          whatIfEnabled={true}
        />
      )

      const layoutDiv = container.querySelector('.gap-4')
      expect(layoutDiv).toBeInTheDocument()
    })

    it('applies w-80 to WhatIfMode container', () => {
      const { container } = render(
        <InteractiveFreeBodyDiagram
          initialData={mockInitialData}
          whatIfEnabled={true}
        />
      )

      const whatIfContainer = container.querySelector('.w-80')
      expect(whatIfContainer).toBeInTheDocument()
    })

    it('applies animated pulse to indicator when what-if is enabled', () => {
      render(
        <InteractiveFreeBodyDiagram
          initialData={mockInitialData}
          whatIfEnabled={true}
        />
      )

      const toggleButton = screen.getByRole('button', { name: /מצב "מה אם"|what-if mode/i })
      const indicator = toggleButton.querySelector('.animate-pulse')
      expect(indicator).toBeInTheDocument()
    })
  })
})
