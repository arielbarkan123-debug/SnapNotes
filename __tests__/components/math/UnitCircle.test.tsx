import { render } from '@testing-library/react'
import { UnitCircle } from '@/components/math/UnitCircle'
import type { UnitCircleDataWithErrors } from '@/types'

jest.mock('framer-motion', () => ({
  motion: {
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
    g: ({ children, ...props }: any) => <g {...props}>{children}</g>,
    circle: (props: any) => <circle {...props} />,
    line: (props: any) => <line {...props} />,
    path: (props: any) => <path {...props} />,
    text: ({ children, ...props }: any) => <text {...props}>{children}</text>,
    polygon: (props: any) => <polygon {...props} />,
    rect: (props: any) => <rect {...props} />,
  },
  AnimatePresence: ({ children }: any) => children,
}))

describe('UnitCircle', () => {
  const baseData: UnitCircleDataWithErrors = {
    angles: [
      { degrees: 45, radians: 'π/4', highlight: false, showCoordinates: true },
    ],
    showStandardAngles: false,
    showSinCos: true,
    title: 'Unit Circle',
  }

  it('renders without crashing', () => {
    const { container } = render(<UnitCircle data={baseData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    const { container } = render(<UnitCircle data={baseData} />)
    expect(container.textContent).toContain('Unit Circle')
  })

  it('accepts subject prop without errors', () => {
    const { container } = render(
      <UnitCircle data={baseData} subject="physics" />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('uses subject color for non-highlighted angle points', () => {
    const { container } = render(
      <UnitCircle data={baseData} subject="physics" />
    )
    // Physics primary is #f97316
    const circles = container.querySelectorAll('circle')
    const physicsCircle = Array.from(circles).find(
      (c) => c.getAttribute('fill') === '#f97316'
    )
    expect(physicsCircle).toBeTruthy()
  })

  it('uses default math subject color for angle points', () => {
    const { container } = render(<UnitCircle data={baseData} />)
    // Math primary is #6366f1
    const circles = container.querySelectorAll('circle')
    const mathCircle = Array.from(circles).find(
      (c) => c.getAttribute('fill') === '#6366f1'
    )
    expect(mathCircle).toBeTruthy()
  })

  it('uses adaptive line weight for circle outline', () => {
    const { container } = render(
      <UnitCircle data={baseData} complexity="elementary" />
    )
    // Elementary line weight is 4
    const circles = container.querySelectorAll('circle')
    const thickCircle = Array.from(circles).find(
      (c) => c.getAttribute('stroke-width') === '4'
    )
    expect(thickCircle).toBeTruthy()
  })

  it('renders axis labels', () => {
    const { container } = render(<UnitCircle data={baseData} />)
    expect(container.textContent).toContain('x')
    expect(container.textContent).toContain('y')
  })

  it('renders CAST quadrant labels', () => {
    const { container } = render(<UnitCircle data={baseData} />)
    expect(container.textContent).toContain('All +')
    expect(container.textContent).toContain('Sin +')
    expect(container.textContent).toContain('Cos +')
    expect(container.textContent).toContain('Tan +')
  })
})
