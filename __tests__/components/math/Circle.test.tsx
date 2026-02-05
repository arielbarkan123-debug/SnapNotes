import { render } from '@testing-library/react'
import { Circle } from '@/components/math/Circle'

jest.mock('framer-motion', () => ({
  motion: {
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
    g: ({ children, ...props }: any) => <g {...props}>{children}</g>,
    circle: (props: any) => <circle {...props} />,
    line: (props: any) => <line {...props} />,
    path: (props: any) => <path {...props} />,
    text: ({ children, ...props }: any) => <text {...props}>{children}</text>,
    rect: (props: any) => <rect {...props} />,
  },
  AnimatePresence: ({ children }: any) => children,
}))

describe('Circle', () => {
  const baseData = {
    centerX: 0,
    centerY: 0,
    radius: 5,
    centerLabel: 'O',
    showRadius: true,
    radiusLabel: 'r = 5',
    title: 'Circle with radius 5',
  }

  it('renders without crashing', () => {
    const { container } = render(<Circle data={baseData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    const { container } = render(<Circle data={baseData} />)
    expect(container.textContent).toContain('Circle with radius 5')
  })

  it('accepts subject prop without errors', () => {
    const { container } = render(
      <Circle data={baseData} subject="physics" />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('uses subject color for circle fill', () => {
    const { container } = render(
      <Circle data={baseData} subject="physics" />
    )
    // Physics primary is #f97316
    const circles = container.querySelectorAll('circle')
    const fillCircle = Array.from(circles).find(
      (c) => c.getAttribute('fill') === '#f97316'
    )
    expect(fillCircle).toBeTruthy()
  })

  it('uses default geometry subject color for circle fill', () => {
    const { container } = render(<Circle data={baseData} />)
    // Geometry primary is #ec4899
    const circles = container.querySelectorAll('circle')
    const fillCircle = Array.from(circles).find(
      (c) => c.getAttribute('fill') === '#ec4899'
    )
    expect(fillCircle).toBeTruthy()
  })

  it('uses adaptive line weight for circle outline', () => {
    const { container } = render(
      <Circle data={baseData} complexity="elementary" />
    )
    // Elementary line weight is 4
    const circles = container.querySelectorAll('circle')
    const outlineCircle = Array.from(circles).find(
      (c) => c.getAttribute('stroke-width') === '4'
    )
    expect(outlineCircle).toBeTruthy()
  })

  it('renders center label', () => {
    const { container } = render(<Circle data={baseData} />)
    expect(container.textContent).toContain('O')
  })

  it('renders radius label when showRadius is true', () => {
    const { container } = render(<Circle data={baseData} />)
    expect(container.textContent).toContain('r = 5')
  })
})
