import { render, screen, fireEvent } from '@testing-library/react'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'

describe('DiagramStepControls', () => {
  const defaultProps = {
    currentStep: 0,
    totalSteps: 5,
    onNext: jest.fn(),
    onPrev: jest.fn(),
    stepLabel: 'Draw the base',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders step label', () => {
    render(<DiagramStepControls {...defaultProps} />)
    expect(screen.getByText('Draw the base')).toBeInTheDocument()
  })

  it('renders step counter (1 / 5)', () => {
    render(<DiagramStepControls {...defaultProps} />)
    expect(screen.getByText('1 / 5')).toBeInTheDocument()
  })

  it('disables prev button on first step', () => {
    render(<DiagramStepControls {...defaultProps} currentStep={0} />)
    const prevBtn = screen.getByLabelText('Previous step')
    expect(prevBtn).toBeDisabled()
  })

  it('disables next button on last step', () => {
    render(<DiagramStepControls {...defaultProps} currentStep={4} />)
    const nextBtn = screen.getByLabelText('Next step')
    expect(nextBtn).toBeDisabled()
  })

  it('calls onNext when next button clicked', () => {
    const onNext = jest.fn()
    render(<DiagramStepControls {...defaultProps} onNext={onNext} />)
    fireEvent.click(screen.getByLabelText('Next step'))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('calls onPrev when prev button clicked', () => {
    const onPrev = jest.fn()
    render(<DiagramStepControls {...defaultProps} currentStep={2} onPrev={onPrev} />)
    fireEvent.click(screen.getByLabelText('Previous step'))
    expect(onPrev).toHaveBeenCalledTimes(1)
  })

  it('renders progress dots equal to totalSteps', () => {
    render(<DiagramStepControls {...defaultProps} />)
    const dots = screen.getAllByTestId('step-dot')
    expect(dots).toHaveLength(5)
  })

  it('does not render label when not provided', () => {
    render(<DiagramStepControls currentStep={0} totalSteps={5} onNext={jest.fn()} onPrev={jest.fn()} />)
    expect(screen.queryByText('Draw the base')).not.toBeInTheDocument()
  })

  it('uses subject color for active dot when subjectColor provided', () => {
    const { container } = render(
      <DiagramStepControls {...defaultProps} subjectColor="#ec4899" />
    )
    const activeDot = container.querySelector('[data-testid="step-dot"][data-active="true"]')
    expect(activeDot).toBeInTheDocument()
    // jsdom converts hex to rgb
    expect(activeDot?.getAttribute('style')).toContain('rgb(236, 72, 153)')
  })

  // ---- Mid-step counter ----

  it('renders correct counter at middle step', () => {
    render(<DiagramStepControls {...defaultProps} currentStep={2} />)
    expect(screen.getByText('3 / 5')).toBeInTheDocument()
  })

  it('renders correct counter at last step', () => {
    render(<DiagramStepControls {...defaultProps} currentStep={4} />)
    expect(screen.getByText('5 / 5')).toBeInTheDocument()
  })

  // ---- Past dot styling ----

  it('styles past dots with subject color at reduced opacity', () => {
    const { container } = render(
      <DiagramStepControls {...defaultProps} currentStep={2} subjectColor="#6366f1" />
    )
    const dots = container.querySelectorAll('[data-testid="step-dot"]')
    // dot 0 is past (index < currentStep 2)
    const pastDot = dots[0]
    expect(pastDot?.getAttribute('style')).toContain('opacity: 0.4')
    expect(pastDot?.getAttribute('style')).toContain('rgb(99, 102, 241)')
  })

  it('does not style future dots with subject color', () => {
    const { container } = render(
      <DiagramStepControls {...defaultProps} currentStep={1} subjectColor="#6366f1" />
    )
    const dots = container.querySelectorAll('[data-testid="step-dot"]')
    // dot 3 is future (index > currentStep 1)
    const futureDot = dots[3]
    expect(futureDot?.getAttribute('style')).toBeNull()
  })

  // ---- RTL ----

  it('sets dir="rtl" when language is Hebrew', () => {
    const { container } = render(
      <DiagramStepControls {...defaultProps} language="he" />
    )
    const wrapper = container.firstElementChild
    expect(wrapper?.getAttribute('dir')).toBe('rtl')
  })

  it('sets dir="ltr" for English (default)', () => {
    const { container } = render(
      <DiagramStepControls {...defaultProps} />
    )
    const wrapper = container.firstElementChild
    expect(wrapper?.getAttribute('dir')).toBe('ltr')
  })

  it('uses Hebrew aria-labels in RTL mode', () => {
    render(<DiagramStepControls {...defaultProps} currentStep={2} language="he" />)
    expect(screen.getByLabelText('הצעד הקודם')).toBeInTheDocument()
    expect(screen.getByLabelText('הצעד הבא')).toBeInTheDocument()
  })

  // ---- Hebrew label fallback ----

  it('shows stepLabelHe when language is Hebrew and stepLabelHe provided', () => {
    render(
      <DiagramStepControls
        {...defaultProps}
        language="he"
        stepLabel="Draw the base"
        stepLabelHe="ציירו את הבסיס"
      />
    )
    expect(screen.getByText('ציירו את הבסיס')).toBeInTheDocument()
    expect(screen.queryByText('Draw the base')).not.toBeInTheDocument()
  })

  it('falls back to stepLabel when language is Hebrew but no stepLabelHe', () => {
    render(
      <DiagramStepControls
        {...defaultProps}
        language="he"
        stepLabel="Draw the base"
      />
    )
    expect(screen.getByText('Draw the base')).toBeInTheDocument()
  })
})
