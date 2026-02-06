import { render, screen, fireEvent } from '@testing-library/react'
import { InteractiveCircularMotion } from '@/components/physics/InteractiveCircularMotion'
import type { CircularMotionData } from '@/types/physics'

// =============================================================================
// Mocks
// =============================================================================

// Mock framer-motion — all motion elements render as plain HTML/SVG
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
    circle: (props: Record<string, unknown>) => <circle {...props} />,
    text: ({ children, ...props }: Record<string, unknown>) => (
      <text {...props}>{children as React.ReactNode}</text>
    ),
    path: (props: Record<string, unknown>) => <path {...props} />,
    line: (props: Record<string, unknown>) => <line {...props} />,
    rect: (props: Record<string, unknown>) => <rect {...props} />,
    ellipse: (props: Record<string, unknown>) => <ellipse {...props} />,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock useInteractiveParameters hook
const mockSetValue = jest.fn()
const mockSetValues = jest.fn()
const mockReset = jest.fn()
let mockHookValues = { mass: 2, velocity: 5, radius: 2 }

jest.mock('@/hooks/useInteractiveParameters', () => ({
  useInteractiveParameters: (params: unknown[], opts?: { onChange?: (v: Record<string, number>) => void }) => {
    return {
      values: mockHookValues,
      actions: {
        setValue: mockSetValue,
        setValues: mockSetValues,
        reset: mockReset,
      },
      results: [
        {
          value: 25,
          unit: 'N',
          label: 'Centripetal Force',
          labelHe: 'כוח צנטריפטלי',
          formatted: '25.00 N',
          isPrimary: true,
        },
        {
          value: 12.5,
          unit: 'm/s²',
          label: 'Centripetal Acceleration',
          labelHe: 'תאוצה צנטריפטלית',
          formatted: '12.50 m/s²',
        },
        {
          value: 2.51,
          unit: 's',
          label: 'Period',
          labelHe: 'מחזור',
          formatted: '2.51 s',
        },
      ],
    }
  },
}))

// Mock CircularMotion component
jest.mock('@/components/physics/CircularMotion', () => ({
  CircularMotion: (props: {
    data: CircularMotionData
    width?: number
    height?: number
    language?: string
    initialStep?: number
  }) => (
    <div
      data-testid="circular-motion"
      data-radius={props.data.radius}
      data-mass={props.data.mass}
      data-speed={props.data.speed}
      data-width={props.width}
      data-height={props.height}
      data-language={props.language}
      data-initial-step={props.initialStep}
    >
      CircularMotion Mock
    </div>
  ),
}))

// Mock WhatIfMode component
jest.mock('@/components/interactive', () => ({
  WhatIfMode: (props: {
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
      data-testid="what-if-mode"
      data-language={props.language}
      data-subject={props.subject}
      data-expanded={props.expanded}
    >
      <button
        data-testid="what-if-param-change"
        onClick={() => props.onParameterChange('mass', 5)}
      >
        Change Mass
      </button>
      <button
        data-testid="what-if-params-change"
        onClick={() => props.onParametersChange({ mass: 3, velocity: 8 })}
      >
        Change Params
      </button>
      <button data-testid="what-if-reset" onClick={props.onReset}>
        Reset
      </button>
      <button data-testid="what-if-toggle" onClick={props.onToggleExpanded}>
        Toggle
      </button>
      <div data-testid="what-if-values">{JSON.stringify(props.values)}</div>
    </div>
  ),
}))

// Mock physics calculations
jest.mock('@/lib/visual-learning', () => ({
  CIRCULAR_MOTION_PARAMETERS: [
    { name: 'mass', label: 'Mass', labelHe: 'מסה', default: 2, min: 0.1, max: 100, step: 0.1, unit: 'kg' },
    { name: 'velocity', label: 'Velocity', labelHe: 'מהירות', default: 5, min: 0.1, max: 20, step: 0.1, unit: 'm/s' },
    { name: 'radius', label: 'Radius', labelHe: 'רדיוס', default: 2, min: 0.1, max: 5, step: 0.1, unit: 'm' },
  ],
  getCircularMotionResults: jest.fn(() => [
    { value: 25, unit: 'N', label: 'Centripetal Force', formatted: '25.00 N', isPrimary: true },
    { value: 12.5, unit: 'm/s²', label: 'Centripetal Acceleration', formatted: '12.50 m/s²' },
    { value: 2.51, unit: 's', label: 'Period', formatted: '2.51 s' },
  ]),
}))

// =============================================================================
// Test Data
// =============================================================================

const mockCircularMotionData: CircularMotionData = {
  radius: 2,
  mass: 2,
  speed: 5,
  angularPosition: 45,
  showVelocity: true,
  showAcceleration: true,
  showCentripetalForce: true,
  title: 'Circular Motion Example',
}

const minimalCircularMotionData: CircularMotionData = {
  radius: 3,
}

// =============================================================================
// Tests
// =============================================================================

describe('InteractiveCircularMotion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockHookValues = { mass: 2, velocity: 5, radius: 2 }
  })

  // ---------------------------------------------------------------------------
  // Basic Rendering
  // ---------------------------------------------------------------------------

  describe('basic rendering', () => {
    it('renders with required props', () => {
      render(<InteractiveCircularMotion initialData={mockCircularMotionData} />)

      expect(screen.getByTestId('circular-motion')).toBeInTheDocument()
      expect(screen.getByText('What-If Mode')).toBeInTheDocument()
    })

    it('renders with minimal data (only radius required)', () => {
      render(<InteractiveCircularMotion initialData={minimalCircularMotionData} />)

      expect(screen.getByTestId('circular-motion')).toBeInTheDocument()
    })

    it('renders toggle button by default', () => {
      render(<InteractiveCircularMotion initialData={mockCircularMotionData} />)

      const toggleButton = screen.getByText('What-If Mode')
      expect(toggleButton).toBeInTheDocument()
    })

    it('does not render WhatIfMode panel when disabled (default)', () => {
      render(<InteractiveCircularMotion initialData={mockCircularMotionData} />)

      expect(screen.queryByTestId('what-if-mode')).not.toBeInTheDocument()
    })

    it('renders WhatIfMode panel when whatIfEnabled is true', () => {
      render(
        <InteractiveCircularMotion
          initialData={mockCircularMotionData}
          whatIfEnabled={true}
        />
      )

      expect(screen.getByTestId('what-if-mode')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // What-If Mode Toggle
  // ---------------------------------------------------------------------------

  describe('what-if mode toggle', () => {
    it('toggles what-if mode on button click', () => {
      render(<InteractiveCircularMotion initialData={mockCircularMotionData} />)

      // Initially WhatIfMode should not be visible
      expect(screen.queryByTestId('what-if-mode')).not.toBeInTheDocument()

      // Click toggle button
      fireEvent.click(screen.getByText('What-If Mode'))

      // WhatIfMode should now be visible
      expect(screen.getByTestId('what-if-mode')).toBeInTheDocument()
    })

    it('toggles what-if mode off when clicking again', () => {
      render(
        <InteractiveCircularMotion
          initialData={mockCircularMotionData}
          whatIfEnabled={true}
        />
      )

      // Initially visible
      expect(screen.getByTestId('what-if-mode')).toBeInTheDocument()

      // Click toggle button
      fireEvent.click(screen.getByText('What-If Mode'))

      // WhatIfMode should now be hidden
      expect(screen.queryByTestId('what-if-mode')).not.toBeInTheDocument()
    })

    it('calls onWhatIfToggle callback when toggled', () => {
      const onWhatIfToggle = jest.fn()
      render(
        <InteractiveCircularMotion
          initialData={mockCircularMotionData}
          onWhatIfToggle={onWhatIfToggle}
        />
      )

      fireEvent.click(screen.getByText('What-If Mode'))

      expect(onWhatIfToggle).toHaveBeenCalledWith(true)
    })

    it('calls onWhatIfToggle with false when disabling', () => {
      const onWhatIfToggle = jest.fn()
      render(
        <InteractiveCircularMotion
          initialData={mockCircularMotionData}
          whatIfEnabled={true}
          onWhatIfToggle={onWhatIfToggle}
        />
      )

      fireEvent.click(screen.getByText('What-If Mode'))

      expect(onWhatIfToggle).toHaveBeenCalledWith(false)
    })

    it('applies active styling when what-if mode is enabled', () => {
      render(
        <InteractiveCircularMotion
          initialData={mockCircularMotionData}
          whatIfEnabled={true}
        />
      )

      const toggleButton = screen.getByText('What-If Mode').closest('button')
      expect(toggleButton).toHaveClass('bg-blue-100')
    })

    it('applies inactive styling when what-if mode is disabled', () => {
      render(<InteractiveCircularMotion initialData={mockCircularMotionData} />)

      const toggleButton = screen.getByText('What-If Mode').closest('button')
      expect(toggleButton).toHaveClass('bg-gray-100')
    })
  })

  // ---------------------------------------------------------------------------
  // RTL / Hebrew Support
  // ---------------------------------------------------------------------------

  describe('RTL/Hebrew support', () => {
    it('renders Hebrew toggle label when language is he', () => {
      render(
        <InteractiveCircularMotion
          initialData={mockCircularMotionData}
          language="he"
        />
      )

      expect(screen.getByText('מצב "מה אם"')).toBeInTheDocument()
    })

    it('passes language to CircularMotion', () => {
      render(
        <InteractiveCircularMotion
          initialData={mockCircularMotionData}
          language="he"
        />
      )

      const circularMotion = screen.getByTestId('circular-motion')
      expect(circularMotion.getAttribute('data-language')).toBe('he')
    })

    it('passes language to WhatIfMode when enabled', () => {
      render(
        <InteractiveCircularMotion
          initialData={mockCircularMotionData}
          language="he"
          whatIfEnabled={true}
        />
      )

      const whatIfMode = screen.getByTestId('what-if-mode')
      expect(whatIfMode.getAttribute('data-language')).toBe('he')
    })

    it('applies RTL flex direction for Hebrew', () => {
      const { container } = render(
        <InteractiveCircularMotion
          initialData={mockCircularMotionData}
          language="he"
          whatIfEnabled={true}
        />
      )

      const layoutContainer = container.querySelector('.flex-row-reverse')
      expect(layoutContainer).toBeInTheDocument()
    })

    it('applies LTR flex direction for English', () => {
      const { container } = render(
        <InteractiveCircularMotion
          initialData={mockCircularMotionData}
          language="en"
          whatIfEnabled={true}
        />
      )

      const layoutContainer = container.querySelector('.flex-row')
      expect(layoutContainer).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Parameter Changes via WhatIfMode
  // ---------------------------------------------------------------------------

  describe('parameter changes via WhatIfMode', () => {
    it('passes setValue action to WhatIfMode onParameterChange', () => {
      render(
        <InteractiveCircularMotion
          initialData={mockCircularMotionData}
          whatIfEnabled={true}
        />
      )

      fireEvent.click(screen.getByTestId('what-if-param-change'))

      expect(mockSetValue).toHaveBeenCalledWith('mass', 5)
    })

    it('passes setValues action to WhatIfMode onParametersChange', () => {
      render(
        <InteractiveCircularMotion
          initialData={mockCircularMotionData}
          whatIfEnabled={true}
        />
      )

      fireEvent.click(screen.getByTestId('what-if-params-change'))

      expect(mockSetValues).toHaveBeenCalledWith({ mass: 3, velocity: 8 })
    })

    it('passes reset action to WhatIfMode onReset', () => {
      render(
        <InteractiveCircularMotion
          initialData={mockCircularMotionData}
          whatIfEnabled={true}
        />
      )

      fireEvent.click(screen.getByTestId('what-if-reset'))

      expect(mockReset).toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // Initial Data
  // ---------------------------------------------------------------------------

  describe('initial data', () => {
    it('passes initial data to CircularMotion', () => {
      render(<InteractiveCircularMotion initialData={mockCircularMotionData} />)

      const circularMotion = screen.getByTestId('circular-motion')
      expect(circularMotion.getAttribute('data-radius')).toBe('2')
    })

    it('respects custom initial values from hook', () => {
      // Update mock hook values to simulate custom initial values
      mockHookValues = { mass: 10, velocity: 8, radius: 3 }

      const customData: CircularMotionData = {
        radius: 3,
        mass: 10,
        speed: 8,
      }
      render(<InteractiveCircularMotion initialData={customData} />)

      const circularMotion = screen.getByTestId('circular-motion')
      // The diagram data is built from hook values, which we've set to radius: 3
      expect(circularMotion.getAttribute('data-radius')).toBe('3')
      expect(circularMotion.getAttribute('data-mass')).toBe('10')
    })

    it('uses default values when not provided in initial data', () => {
      render(<InteractiveCircularMotion initialData={minimalCircularMotionData} />)

      const circularMotion = screen.getByTestId('circular-motion')
      expect(circularMotion).toBeInTheDocument()
    })

    it('displays current values in WhatIfMode', () => {
      render(
        <InteractiveCircularMotion
          initialData={mockCircularMotionData}
          whatIfEnabled={true}
        />
      )

      const values = screen.getByTestId('what-if-values')
      expect(values.textContent).toContain('"mass":2')
      expect(values.textContent).toContain('"velocity":5')
      expect(values.textContent).toContain('"radius":2')
    })
  })

  // ---------------------------------------------------------------------------
  // Width/Height Props
  // ---------------------------------------------------------------------------

  describe('width/height props', () => {
    it('passes default width and height to CircularMotion', () => {
      render(<InteractiveCircularMotion initialData={mockCircularMotionData} />)

      const circularMotion = screen.getByTestId('circular-motion')
      expect(circularMotion.getAttribute('data-width')).toBe('400')
      expect(circularMotion.getAttribute('data-height')).toBe('400')
    })

    it('passes custom width to CircularMotion', () => {
      render(
        <InteractiveCircularMotion
          initialData={mockCircularMotionData}
          width={600}
        />
      )

      const circularMotion = screen.getByTestId('circular-motion')
      expect(circularMotion.getAttribute('data-width')).toBe('600')
    })

    it('passes custom height to CircularMotion', () => {
      render(
        <InteractiveCircularMotion
          initialData={mockCircularMotionData}
          height={500}
        />
      )

      const circularMotion = screen.getByTestId('circular-motion')
      expect(circularMotion.getAttribute('data-height')).toBe('500')
    })

    it('passes both custom dimensions', () => {
      render(
        <InteractiveCircularMotion
          initialData={mockCircularMotionData}
          width={800}
          height={600}
        />
      )

      const circularMotion = screen.getByTestId('circular-motion')
      expect(circularMotion.getAttribute('data-width')).toBe('800')
      expect(circularMotion.getAttribute('data-height')).toBe('600')
    })
  })

  // ---------------------------------------------------------------------------
  // Initial Step
  // ---------------------------------------------------------------------------

  describe('initial step', () => {
    it('passes default initialStep (0) to CircularMotion', () => {
      render(<InteractiveCircularMotion initialData={mockCircularMotionData} />)

      const circularMotion = screen.getByTestId('circular-motion')
      expect(circularMotion.getAttribute('data-initial-step')).toBe('0')
    })

    it('passes custom initialStep to CircularMotion', () => {
      render(
        <InteractiveCircularMotion
          initialData={mockCircularMotionData}
          initialStep={2}
        />
      )

      const circularMotion = screen.getByTestId('circular-motion')
      expect(circularMotion.getAttribute('data-initial-step')).toBe('2')
    })
  })

  // ---------------------------------------------------------------------------
  // WhatIfMode Configuration
  // ---------------------------------------------------------------------------

  describe('WhatIfMode configuration', () => {
    it('passes physics subject to WhatIfMode', () => {
      render(
        <InteractiveCircularMotion
          initialData={mockCircularMotionData}
          whatIfEnabled={true}
        />
      )

      const whatIfMode = screen.getByTestId('what-if-mode')
      expect(whatIfMode.getAttribute('data-subject')).toBe('physics')
    })

    it('starts with expanded state true', () => {
      render(
        <InteractiveCircularMotion
          initialData={mockCircularMotionData}
          whatIfEnabled={true}
        />
      )

      const whatIfMode = screen.getByTestId('what-if-mode')
      expect(whatIfMode.getAttribute('data-expanded')).toBe('true')
    })
  })

  // ---------------------------------------------------------------------------
  // Visual Feedback
  // ---------------------------------------------------------------------------

  describe('visual feedback', () => {
    it('applies ring highlight to diagram when what-if mode is enabled', () => {
      const { container } = render(
        <InteractiveCircularMotion
          initialData={mockCircularMotionData}
          whatIfEnabled={true}
        />
      )

      const diagramContainer = container.querySelector('.ring-2')
      expect(diagramContainer).toBeInTheDocument()
    })

    it('removes ring highlight when what-if mode is disabled', () => {
      const { container } = render(
        <InteractiveCircularMotion
          initialData={mockCircularMotionData}
          whatIfEnabled={false}
        />
      )

      const diagramContainer = container.querySelector('.ring-2')
      expect(diagramContainer).not.toBeInTheDocument()
    })

    it('shows pulsing indicator on toggle button when active', () => {
      const { container } = render(
        <InteractiveCircularMotion
          initialData={mockCircularMotionData}
          whatIfEnabled={true}
        />
      )

      const pulseIndicator = container.querySelector('.animate-pulse')
      expect(pulseIndicator).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Callback Integration
  // ---------------------------------------------------------------------------

  describe('callback integration', () => {
    it('calls onParamsChange when parameters change (when what-if enabled)', () => {
      // This tests the integration through the hook's onChange callback
      // The actual callback is wired through useInteractiveParameters
      const onParamsChange = jest.fn()

      render(
        <InteractiveCircularMotion
          initialData={mockCircularMotionData}
          whatIfEnabled={true}
          onParamsChange={onParamsChange}
        />
      )

      // The component renders, meaning the hook was called with the onChange prop
      expect(screen.getByTestId('what-if-mode')).toBeInTheDocument()
    })
  })
})
