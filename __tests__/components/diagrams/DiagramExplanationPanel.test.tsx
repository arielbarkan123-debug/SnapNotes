/**
 * Tests for DiagramExplanationPanel component
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import type { StepExplanation } from '@/components/diagrams/DiagramExplanationPanel'

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      previous: 'Previous',
      next: 'Next',
      pause: 'Pause',
      autoPlay: 'Auto-play',
      gotIt: 'Got it!',
    }
    return translations[key] || key
  },
}))

// Import the component after mocking
import DiagramExplanationPanel from '@/components/diagrams/DiagramExplanationPanel'

const renderComponent = (ui: React.ReactElement) => render(ui)

const mockStepConfig: StepExplanation[] = [
  { step: 0, stepLabel: 'Step 1: Setup', explanation: 'First we identify the problem.' },
  { step: 1, stepLabel: 'Step 2: Analysis', explanation: 'Next we analyze the forces.', showCalculation: '$F = ma$' },
  { step: 2, stepLabel: 'Step 3: Solution', explanation: 'Finally we solve.', conceptTip: 'Remember Newton\'s laws!' },
]

describe('DiagramExplanationPanel', () => {
  const defaultProps = {
    currentStep: 0,
    totalSteps: 3,
    stepConfig: mockStepConfig,
    onStepChange: jest.fn(),
    onPrevious: jest.fn(),
    onNext: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the component with step label', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} />)
      expect(screen.getByText('Step 1: Setup')).toBeInTheDocument()
    })

    it('renders explanation text', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} />)
      expect(screen.getByText('First we identify the problem.')).toBeInTheDocument()
    })

    it('renders step indicator correctly', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} />)
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })

    it('renders navigation buttons', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} />)
      expect(screen.getByText('Previous')).toBeInTheDocument()
      expect(screen.getByText('Next')).toBeInTheDocument()
    })

    it('renders step dots equal to total steps', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} />)
      const stepDots = screen.getAllByRole('button').filter(btn =>
        btn.getAttribute('aria-label')?.startsWith('Go to step')
      )
      expect(stepDots).toHaveLength(3)
    })
  })

  describe('Navigation', () => {
    it('calls onPrevious when previous button is clicked', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} currentStep={1} />)
      fireEvent.click(screen.getByText('Previous'))
      expect(defaultProps.onPrevious).toHaveBeenCalledTimes(1)
    })

    it('calls onNext when next button is clicked', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} />)
      fireEvent.click(screen.getByText('Next'))
      expect(defaultProps.onNext).toHaveBeenCalledTimes(1)
    })

    it('calls onStepChange when step dot is clicked', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} />)
      const stepDots = screen.getAllByRole('button').filter(btn =>
        btn.getAttribute('aria-label')?.startsWith('Go to step')
      )
      fireEvent.click(stepDots[2])
      expect(defaultProps.onStepChange).toHaveBeenCalledWith(2)
    })

    it('disables previous button on first step', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} currentStep={0} />)
      const prevButton = screen.getByText('Previous').closest('button')
      expect(prevButton).toBeDisabled()
    })

    it('disables next button on last step', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} currentStep={2} />)
      const nextButton = screen.getByText('Next').closest('button')
      expect(nextButton).toBeDisabled()
    })
  })

  describe('Step Content', () => {
    it('shows calculation when present in step config', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} currentStep={1} />)
      expect(screen.getByText('Step 2: Analysis')).toBeInTheDocument()
      // KaTeX renders the math, but we can check the container exists
      const calculationContainer = document.querySelector('.bg-violet-50, .dark\\:bg-violet-900\\/20')
      expect(calculationContainer).toBeInTheDocument()
    })

    it('shows concept tip when present in step config', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} currentStep={2} />)
      expect(screen.getByText("Remember Newton's laws!")).toBeInTheDocument()
    })

    it('shows Got it button on last step', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} currentStep={2} />)
      expect(screen.getByText(/Got it/)).toBeInTheDocument()
    })

    it('does not show Got it button on non-last steps', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} currentStep={0} />)
      expect(screen.queryByText(/Got it/)).not.toBeInTheDocument()
    })
  })

  describe('Auto-play', () => {
    it('renders auto-play button when onToggleAutoPlay is provided', () => {
      const onToggleAutoPlay = jest.fn()
      renderComponent(
        <DiagramExplanationPanel {...defaultProps} onToggleAutoPlay={onToggleAutoPlay} />
      )
      expect(screen.getByText('Auto-play')).toBeInTheDocument()
    })

    it('calls onToggleAutoPlay when auto-play button is clicked', () => {
      const onToggleAutoPlay = jest.fn()
      renderComponent(
        <DiagramExplanationPanel {...defaultProps} onToggleAutoPlay={onToggleAutoPlay} />
      )
      fireEvent.click(screen.getByText('Auto-play'))
      expect(onToggleAutoPlay).toHaveBeenCalledTimes(1)
    })

    it('shows pause text when autoPlay is true', () => {
      const onToggleAutoPlay = jest.fn()
      renderComponent(
        <DiagramExplanationPanel {...defaultProps} autoPlay={true} onToggleAutoPlay={onToggleAutoPlay} />
      )
      expect(screen.getByText('Pause')).toBeInTheDocument()
    })
  })

  describe('RTL Support', () => {
    it('sets dir attribute to rtl for Hebrew', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} language="he" />)
      const container = document.querySelector('[dir="rtl"]')
      expect(container).toBeInTheDocument()
    })

    it('sets dir attribute to ltr for English', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} language="en" />)
      const container = document.querySelector('[dir="ltr"]')
      expect(container).toBeInTheDocument()
    })
  })

  describe('Progress Bar', () => {
    it('shows correct progress percentage', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} currentStep={1} />)
      // Progress should be (1+1)/3 * 100 = 66.67%
      const progressBar = document.querySelector('.bg-gradient-to-r')
      expect(progressBar).toHaveStyle({ width: '66.66666666666666%' })
    })

    it('has proper progressbar role', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} currentStep={1} />)
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '2')
      expect(progressbar).toHaveAttribute('aria-valuemin', '1')
      expect(progressbar).toHaveAttribute('aria-valuemax', '3')
    })
  })

  describe('Edge Cases', () => {
    it('handles zero totalSteps by defaulting to 1', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} totalSteps={0} />)
      // Should show "1 / 1" since zero is invalid
      expect(screen.getByText('1 / 1')).toBeInTheDocument()
    })

    it('handles negative currentStep by defaulting to 0', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} currentStep={-5} />)
      // Step should be clamped to 0
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })

    it('handles currentStep exceeding totalSteps', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} currentStep={100} />)
      // Step should be clamped to max (totalSteps - 1)
      expect(screen.getByText('3 / 3')).toBeInTheDocument()
    })

    it('handles undefined stepConfig gracefully', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} stepConfig={undefined} />)
      // Should show default step label
      expect(screen.getByText('Step 1')).toBeInTheDocument()
    })

    it('handles empty stepConfig array', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} stepConfig={[]} />)
      // Should show default step label
      expect(screen.getByText('Step 1')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has section role for panel', () => {
      const { container } = renderComponent(<DiagramExplanationPanel {...defaultProps} />)
      expect(container.querySelector('section')).toBeInTheDocument()
    })

    it('has navigation role for step dots', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} />)
      expect(screen.getByRole('navigation', { name: /step navigation/i })).toBeInTheDocument()
    })

    it('has aria-current on active step dot', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} currentStep={1} />)
      const stepDots = screen.getAllByRole('button').filter(btn =>
        btn.getAttribute('aria-label')?.match(/go to step/i)
      )
      expect(stepDots[1]).toHaveAttribute('aria-current', 'step')
    })

    it('has role group for navigation controls', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} />)
      expect(screen.getByRole('group', { name: /navigation controls/i })).toBeInTheDocument()
    })

    it('has aria-pressed for auto-play toggle', () => {
      const onToggleAutoPlay = jest.fn()
      renderComponent(
        <DiagramExplanationPanel {...defaultProps} autoPlay={true} onToggleAutoPlay={onToggleAutoPlay} />
      )
      const autoPlayButton = screen.getByRole('button', { name: /stop auto-play/i })
      expect(autoPlayButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('has article role for explanation with aria-live', () => {
      const { container } = renderComponent(<DiagramExplanationPanel {...defaultProps} />)
      const article = container.querySelector('article')
      expect(article).toHaveAttribute('aria-live', 'polite')
    })

    it('has note role for concept tip', () => {
      renderComponent(<DiagramExplanationPanel {...defaultProps} currentStep={2} />)
      expect(screen.getByRole('note', { name: /tip/i })).toBeInTheDocument()
    })
  })
})
