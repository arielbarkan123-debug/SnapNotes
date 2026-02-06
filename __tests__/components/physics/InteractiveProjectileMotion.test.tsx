import { render, screen, fireEvent } from '@testing-library/react'
import { InteractiveProjectileMotion } from '@/components/physics/InteractiveProjectileMotion'
import type { ProjectileMotionData } from '@/types/physics'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, exit, ...props }: Record<string, unknown>) => <div {...props}>{children as React.ReactNode}</div>,
    button: ({ children, whileHover, whileTap, ...props }: Record<string, unknown>) => <button {...props}>{children as React.ReactNode}</button>,
    svg: ({ children, initial, animate, exit, ...props }: Record<string, unknown>) => <svg {...props}>{children as React.ReactNode}</svg>,
    g: ({ children, initial, animate, exit, ...props }: Record<string, unknown>) => <g {...props}>{children as React.ReactNode}</g>,
    path: ({ initial, animate, exit, ...props }: Record<string, unknown>) => <path {...props} />,
    circle: ({ initial, animate, exit, ...props }: Record<string, unknown>) => <circle {...props} />,
    line: ({ initial, animate, exit, ...props }: Record<string, unknown>) => <line {...props} />,
    text: ({ children, initial, animate, exit, ...props }: Record<string, unknown>) => <text {...props}>{children as React.ReactNode}</text>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock child components
jest.mock('@/components/physics/ProjectileMotion', () => ({
  ProjectileMotion: ({ data, width, height, language, initialStep }: {
    data: ProjectileMotionData
    width: number
    height: number
    language: string
    initialStep: number
  }) => (
    <div data-testid="projectile-motion">
      <span data-testid="pm-width">{width}</span>
      <span data-testid="pm-height">{height}</span>
      <span data-testid="pm-language">{language}</span>
      <span data-testid="pm-initial-step">{initialStep}</span>
      <span data-testid="pm-velocity">{data.initialVelocity?.magnitude}</span>
      <span data-testid="pm-angle">{data.initialVelocity?.angle}</span>
    </div>
  ),
}))

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
    parameters: Array<{ name: string; label: string; default: number }>
    values: Record<string, number>
    onParameterChange: (name: string, value: number) => void
    onParametersChange: (values: Record<string, number>) => void
    results: Array<{ label: string; formatted: string }>
    suggestions: Array<{ id: string; question: string }>
    language: string
    subject: string
    expanded: boolean
    onToggleExpanded: () => void
    onReset: () => void
  }) => (
    <div data-testid="what-if-mode" dir={language === 'he' ? 'rtl' : 'ltr'}>
      <span data-testid="wim-language">{language}</span>
      <span data-testid="wim-subject">{subject}</span>
      <span data-testid="wim-expanded">{expanded.toString()}</span>
      <span data-testid="wim-velocity-value">{values.initialVelocity}</span>
      <span data-testid="wim-angle-value">{values.launchAngle}</span>
      {results.map((r, i) => (
        <span key={i} data-testid={`wim-result-${i}`}>{r.label}: {r.formatted}</span>
      ))}
      {parameters.map((p) => (
        <input
          key={p.name}
          data-testid={`wim-slider-${p.name}`}
          type="range"
          value={values[p.name] ?? p.default}
          onChange={(e) => onParameterChange(p.name, Number(e.target.value))}
        />
      ))}
      <button data-testid="wim-toggle" onClick={onToggleExpanded}>Toggle</button>
      <button data-testid="wim-reset" onClick={onReset}>Reset</button>
      <button
        data-testid="wim-change-params"
        onClick={() => onParametersChange({ initialVelocity: 30, launchAngle: 60, initialHeight: 5 })}
      >
        Change All
      </button>
    </div>
  ),
}))

// =============================================================================
// Test Data
// =============================================================================

const mockInitialData: ProjectileMotionData = {
  initial: { x: 50, y: 290 },
  initialVelocity: { magnitude: 20, angle: 45 },
  timeIntervals: [0, 1, 2, 3, 4],
  showTrajectory: true,
  showVelocityVectors: true,
  groundLevel: 290,
  title: 'Projectile Motion',
}

const mockInitialDataHebrew: ProjectileMotionData = {
  initial: { x: 50, y: 290 },
  initialVelocity: { magnitude: 25, angle: 30 },
  timeIntervals: [0, 0.5, 1, 1.5, 2],
  showTrajectory: true,
  showVelocityVectors: false,
  groundLevel: 290,
  title: 'תנועת קליע',
}

// =============================================================================
// Tests
// =============================================================================

describe('InteractiveProjectileMotion', () => {
  const defaultProps = {
    initialData: mockInitialData,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  describe('rendering', () => {
    it('renders with required props', () => {
      render(<InteractiveProjectileMotion {...defaultProps} />)

      expect(screen.getByTestId('projectile-motion')).toBeInTheDocument()
      expect(screen.getByText('What-If Mode')).toBeInTheDocument()
    })

    it('renders ProjectileMotion component with correct props', () => {
      render(
        <InteractiveProjectileMotion
          {...defaultProps}
          width={600}
          height={400}
          initialStep={2}
        />
      )

      expect(screen.getByTestId('pm-width')).toHaveTextContent('600')
      expect(screen.getByTestId('pm-height')).toHaveTextContent('400')
      expect(screen.getByTestId('pm-initial-step')).toHaveTextContent('2')
    })

    it('uses default width and height when not specified', () => {
      render(<InteractiveProjectileMotion {...defaultProps} />)

      expect(screen.getByTestId('pm-width')).toHaveTextContent('500')
      expect(screen.getByTestId('pm-height')).toHaveTextContent('350')
    })

    it('passes language to ProjectileMotion', () => {
      render(<InteractiveProjectileMotion {...defaultProps} language="en" />)

      expect(screen.getByTestId('pm-language')).toHaveTextContent('en')
    })

    it('does not render WhatIfMode when whatIfEnabled is false', () => {
      render(<InteractiveProjectileMotion {...defaultProps} whatIfEnabled={false} />)

      expect(screen.queryByTestId('what-if-mode')).not.toBeInTheDocument()
    })

    it('renders WhatIfMode when whatIfEnabled is true', () => {
      render(<InteractiveProjectileMotion {...defaultProps} whatIfEnabled={true} />)

      expect(screen.getByTestId('what-if-mode')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Hebrew / RTL Support
  // ---------------------------------------------------------------------------

  describe('RTL support', () => {
    it('renders Hebrew toggle button when language is he', () => {
      render(<InteractiveProjectileMotion {...defaultProps} language="he" />)

      expect(screen.getByText('מצב "מה אם"')).toBeInTheDocument()
    })

    it('passes Hebrew language to WhatIfMode', () => {
      render(
        <InteractiveProjectileMotion
          {...defaultProps}
          language="he"
          whatIfEnabled={true}
        />
      )

      expect(screen.getByTestId('wim-language')).toHaveTextContent('he')
    })

    it('renders with RTL direction when Hebrew is enabled', () => {
      render(
        <InteractiveProjectileMotion
          {...defaultProps}
          language="he"
          whatIfEnabled={true}
        />
      )

      expect(screen.getByTestId('what-if-mode')).toHaveAttribute('dir', 'rtl')
    })

    it('renders with LTR direction when English is used', () => {
      render(
        <InteractiveProjectileMotion
          {...defaultProps}
          language="en"
          whatIfEnabled={true}
        />
      )

      expect(screen.getByTestId('what-if-mode')).toHaveAttribute('dir', 'ltr')
    })

    it('initializes with Hebrew data correctly', () => {
      render(
        <InteractiveProjectileMotion
          initialData={mockInitialDataHebrew}
          language="he"
          whatIfEnabled={true}
        />
      )

      expect(screen.getByTestId('wim-velocity-value')).toHaveTextContent('25')
      expect(screen.getByTestId('wim-angle-value')).toHaveTextContent('30')
    })
  })

  // ---------------------------------------------------------------------------
  // What-If Mode Toggle
  // ---------------------------------------------------------------------------

  describe('what-if mode toggle', () => {
    it('toggles what-if mode when button is clicked', () => {
      render(<InteractiveProjectileMotion {...defaultProps} whatIfEnabled={false} />)

      // Initially WhatIfMode is not visible
      expect(screen.queryByTestId('what-if-mode')).not.toBeInTheDocument()

      // Click toggle button
      fireEvent.click(screen.getByText('What-If Mode'))

      // Now WhatIfMode should be visible
      expect(screen.getByTestId('what-if-mode')).toBeInTheDocument()
    })

    it('hides what-if mode when toggle button is clicked again', () => {
      render(<InteractiveProjectileMotion {...defaultProps} whatIfEnabled={true} />)

      // Initially WhatIfMode is visible
      expect(screen.getByTestId('what-if-mode')).toBeInTheDocument()

      // Click toggle button
      fireEvent.click(screen.getByText('What-If Mode'))

      // Now WhatIfMode should be hidden
      expect(screen.queryByTestId('what-if-mode')).not.toBeInTheDocument()
    })

    it('calls onWhatIfToggle callback when toggled', () => {
      const onWhatIfToggle = jest.fn()
      render(
        <InteractiveProjectileMotion
          {...defaultProps}
          whatIfEnabled={false}
          onWhatIfToggle={onWhatIfToggle}
        />
      )

      fireEvent.click(screen.getByText('What-If Mode'))

      expect(onWhatIfToggle).toHaveBeenCalledWith(true)
    })

    it('calls onWhatIfToggle with false when disabling', () => {
      const onWhatIfToggle = jest.fn()
      render(
        <InteractiveProjectileMotion
          {...defaultProps}
          whatIfEnabled={true}
          onWhatIfToggle={onWhatIfToggle}
        />
      )

      fireEvent.click(screen.getByText('What-If Mode'))

      expect(onWhatIfToggle).toHaveBeenCalledWith(false)
    })

    it('applies active styling when what-if mode is enabled', () => {
      render(<InteractiveProjectileMotion {...defaultProps} whatIfEnabled={true} />)

      const toggleButton = screen.getByText('What-If Mode').closest('button')
      expect(toggleButton).toHaveClass('bg-blue-100')
    })

    it('applies inactive styling when what-if mode is disabled', () => {
      render(<InteractiveProjectileMotion {...defaultProps} whatIfEnabled={false} />)

      const toggleButton = screen.getByText('What-If Mode').closest('button')
      expect(toggleButton).toHaveClass('bg-gray-100')
    })
  })

  // ---------------------------------------------------------------------------
  // Initial Data
  // ---------------------------------------------------------------------------

  describe('initial data handling', () => {
    it('uses initial velocity from initialData', () => {
      render(
        <InteractiveProjectileMotion
          initialData={{
            ...mockInitialData,
            initialVelocity: { magnitude: 35, angle: 60 },
          }}
          whatIfEnabled={true}
        />
      )

      expect(screen.getByTestId('wim-velocity-value')).toHaveTextContent('35')
      expect(screen.getByTestId('wim-angle-value')).toHaveTextContent('60')
    })

    it('passes initial data to ProjectileMotion component', () => {
      render(
        <InteractiveProjectileMotion
          initialData={{
            ...mockInitialData,
            initialVelocity: { magnitude: 40, angle: 50 },
          }}
        />
      )

      expect(screen.getByTestId('pm-velocity')).toHaveTextContent('40')
      expect(screen.getByTestId('pm-angle')).toHaveTextContent('50')
    })

    it('handles missing optional fields in initialData', () => {
      const minimalData: ProjectileMotionData = {
        initial: { x: 50, y: 290 },
        initialVelocity: { magnitude: 15, angle: 30 },
      }

      render(
        <InteractiveProjectileMotion
          initialData={minimalData}
          whatIfEnabled={true}
        />
      )

      expect(screen.getByTestId('projectile-motion')).toBeInTheDocument()
      expect(screen.getByTestId('what-if-mode')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Parameter Changes via WhatIfMode
  // ---------------------------------------------------------------------------

  describe('parameter changes', () => {
    it('updates diagram when velocity parameter changes', () => {
      const onParamsChange = jest.fn()
      render(
        <InteractiveProjectileMotion
          {...defaultProps}
          whatIfEnabled={true}
          onParamsChange={onParamsChange}
        />
      )

      // Simulate slider change
      const velocitySlider = screen.getByTestId('wim-slider-initialVelocity')
      fireEvent.change(velocitySlider, { target: { value: '30' } })

      // The diagram should update
      expect(screen.getByTestId('pm-velocity')).toHaveTextContent('30')
    })

    it('updates diagram when angle parameter changes', () => {
      render(
        <InteractiveProjectileMotion
          {...defaultProps}
          whatIfEnabled={true}
        />
      )

      const angleSlider = screen.getByTestId('wim-slider-launchAngle')
      fireEvent.change(angleSlider, { target: { value: '60' } })

      expect(screen.getByTestId('pm-angle')).toHaveTextContent('60')
    })

    it('calls onParamsChange when parameters are changed', () => {
      const onParamsChange = jest.fn()
      render(
        <InteractiveProjectileMotion
          {...defaultProps}
          whatIfEnabled={true}
          onParamsChange={onParamsChange}
        />
      )

      const velocitySlider = screen.getByTestId('wim-slider-initialVelocity')
      fireEvent.change(velocitySlider, { target: { value: '25' } })

      expect(onParamsChange).toHaveBeenCalled()
      expect(onParamsChange.mock.calls[0][0]).toMatchObject({
        initialVelocity: expect.objectContaining({
          magnitude: 25,
        }),
      })
    })

    it('handles bulk parameter changes from WhatIfMode', () => {
      const onParamsChange = jest.fn()
      render(
        <InteractiveProjectileMotion
          {...defaultProps}
          whatIfEnabled={true}
          onParamsChange={onParamsChange}
        />
      )

      // Click the bulk change button
      fireEvent.click(screen.getByTestId('wim-change-params'))

      // The diagram should update with new values
      expect(screen.getByTestId('pm-velocity')).toHaveTextContent('30')
      expect(screen.getByTestId('pm-angle')).toHaveTextContent('60')
    })

    it('does not call onParamsChange when what-if mode is disabled', () => {
      const onParamsChange = jest.fn()
      render(
        <InteractiveProjectileMotion
          {...defaultProps}
          whatIfEnabled={false}
          onParamsChange={onParamsChange}
        />
      )

      // What-if mode is disabled, so onParamsChange should not be called
      // (The WhatIfMode component is not even rendered)
      expect(onParamsChange).not.toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // WhatIfMode Integration
  // ---------------------------------------------------------------------------

  describe('WhatIfMode integration', () => {
    it('passes physics subject to WhatIfMode', () => {
      render(
        <InteractiveProjectileMotion
          {...defaultProps}
          whatIfEnabled={true}
        />
      )

      expect(screen.getByTestId('wim-subject')).toHaveTextContent('physics')
    })

    it('starts with WhatIfMode expanded', () => {
      render(
        <InteractiveProjectileMotion
          {...defaultProps}
          whatIfEnabled={true}
        />
      )

      expect(screen.getByTestId('wim-expanded')).toHaveTextContent('true')
    })

    it('toggles WhatIfMode expansion', () => {
      render(
        <InteractiveProjectileMotion
          {...defaultProps}
          whatIfEnabled={true}
        />
      )

      // Initially expanded
      expect(screen.getByTestId('wim-expanded')).toHaveTextContent('true')

      // Toggle expansion
      fireEvent.click(screen.getByTestId('wim-toggle'))

      // Now collapsed
      expect(screen.getByTestId('wim-expanded')).toHaveTextContent('false')
    })

    it('resets parameters when reset is clicked', () => {
      render(
        <InteractiveProjectileMotion
          {...defaultProps}
          whatIfEnabled={true}
        />
      )

      // Change a parameter
      const velocitySlider = screen.getByTestId('wim-slider-initialVelocity')
      fireEvent.change(velocitySlider, { target: { value: '35' } })

      // Verify change
      expect(screen.getByTestId('wim-velocity-value')).toHaveTextContent('35')

      // Reset
      fireEvent.click(screen.getByTestId('wim-reset'))

      // Should be back to initial value
      expect(screen.getByTestId('wim-velocity-value')).toHaveTextContent('20')
    })

    it('displays calculation results in WhatIfMode', () => {
      render(
        <InteractiveProjectileMotion
          {...defaultProps}
          whatIfEnabled={true}
        />
      )

      // Results should be displayed (mocked WhatIfMode shows them)
      expect(screen.getByTestId('wim-result-0')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Width and Height Props
  // ---------------------------------------------------------------------------

  describe('width and height props', () => {
    it('passes custom width to ProjectileMotion', () => {
      render(
        <InteractiveProjectileMotion
          {...defaultProps}
          width={800}
        />
      )

      expect(screen.getByTestId('pm-width')).toHaveTextContent('800')
    })

    it('passes custom height to ProjectileMotion', () => {
      render(
        <InteractiveProjectileMotion
          {...defaultProps}
          height={500}
        />
      )

      expect(screen.getByTestId('pm-height')).toHaveTextContent('500')
    })

    it('uses both custom width and height', () => {
      render(
        <InteractiveProjectileMotion
          {...defaultProps}
          width={700}
          height={450}
        />
      )

      expect(screen.getByTestId('pm-width')).toHaveTextContent('700')
      expect(screen.getByTestId('pm-height')).toHaveTextContent('450')
    })
  })

  // ---------------------------------------------------------------------------
  // Initial Step
  // ---------------------------------------------------------------------------

  describe('initial step', () => {
    it('uses default initial step of 0', () => {
      render(<InteractiveProjectileMotion {...defaultProps} />)

      expect(screen.getByTestId('pm-initial-step')).toHaveTextContent('0')
    })

    it('passes custom initial step to ProjectileMotion', () => {
      render(
        <InteractiveProjectileMotion
          {...defaultProps}
          initialStep={3}
        />
      )

      expect(screen.getByTestId('pm-initial-step')).toHaveTextContent('3')
    })
  })

  // ---------------------------------------------------------------------------
  // Layout Behavior
  // ---------------------------------------------------------------------------

  describe('layout behavior', () => {
    it('applies ring styling to diagram container when what-if mode is active', () => {
      const { container } = render(
        <InteractiveProjectileMotion
          {...defaultProps}
          whatIfEnabled={true}
        />
      )

      const diagramContainer = container.querySelector('.ring-2')
      expect(diagramContainer).toBeInTheDocument()
    })

    it('does not apply ring styling when what-if mode is inactive', () => {
      const { container } = render(
        <InteractiveProjectileMotion
          {...defaultProps}
          whatIfEnabled={false}
        />
      )

      const diagramContainer = container.querySelector('.ring-2')
      expect(diagramContainer).not.toBeInTheDocument()
    })

    it('uses flex-row-reverse for RTL layout', () => {
      const { container } = render(
        <InteractiveProjectileMotion
          {...defaultProps}
          language="he"
          whatIfEnabled={true}
        />
      )

      const layoutContainer = container.querySelector('.flex-row-reverse')
      expect(layoutContainer).toBeInTheDocument()
    })

    it('uses flex-row for LTR layout', () => {
      const { container } = render(
        <InteractiveProjectileMotion
          {...defaultProps}
          language="en"
          whatIfEnabled={true}
        />
      )

      // Should have flex-row but not flex-row-reverse
      const layoutContainer = container.querySelector('.flex.gap-4')
      expect(layoutContainer).toBeInTheDocument()
      expect(layoutContainer).not.toHaveClass('flex-row-reverse')
    })
  })

  // ---------------------------------------------------------------------------
  // Edge Cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles zero velocity', () => {
      render(
        <InteractiveProjectileMotion
          initialData={{
            ...mockInitialData,
            initialVelocity: { magnitude: 0, angle: 45 },
          }}
          whatIfEnabled={true}
        />
      )

      expect(screen.getByTestId('pm-velocity')).toHaveTextContent('0')
    })

    it('handles extreme angles', () => {
      render(
        <InteractiveProjectileMotion
          initialData={{
            ...mockInitialData,
            initialVelocity: { magnitude: 20, angle: 90 },
          }}
          whatIfEnabled={true}
        />
      )

      expect(screen.getByTestId('pm-angle')).toHaveTextContent('90')
    })

    it('handles very high velocity', () => {
      render(
        <InteractiveProjectileMotion
          initialData={{
            ...mockInitialData,
            initialVelocity: { magnitude: 100, angle: 45 },
          }}
          whatIfEnabled={true}
        />
      )

      expect(screen.getByTestId('pm-velocity')).toHaveTextContent('100')
    })

    it('handles rapid toggle clicks', () => {
      const onWhatIfToggle = jest.fn()
      render(
        <InteractiveProjectileMotion
          {...defaultProps}
          whatIfEnabled={false}
          onWhatIfToggle={onWhatIfToggle}
        />
      )

      const toggleButton = screen.getByText('What-If Mode')

      // Rapid clicks
      fireEvent.click(toggleButton)
      fireEvent.click(toggleButton)
      fireEvent.click(toggleButton)

      expect(onWhatIfToggle).toHaveBeenCalledTimes(3)
    })
  })
})
