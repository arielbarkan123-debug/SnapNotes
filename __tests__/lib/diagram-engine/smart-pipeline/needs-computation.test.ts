import { needsComputation } from '@/lib/diagram-engine/smart-pipeline/needs-computation'

describe('needsComputation', () => {
  // ── Should return TRUE ──
  describe('computable questions (returns true)', () => {
    it('physics with numbers — inclined plane', () => {
      expect(needsComputation('An 80 kg box is on a 30 degree inclined plane with friction coefficient 0.2. Find acceleration.')).toBe(true)
    })

    it('physics with numbers — projectile', () => {
      expect(needsComputation('A projectile launched at 40 m/s at 60 degrees. Find max height and range.')).toBe(true)
    })

    it('math solving with equation', () => {
      expect(needsComputation('Solve x² - 5x + 6 = 0 and graph the function.')).toBe(true)
    })

    it('geometry computation', () => {
      expect(needsComputation('Find the area of triangle with vertices (1,2), (4,7), (8,3).')).toBe(true)
    })

    it('statistics with data', () => {
      expect(needsComputation('Data: 45, 52, 48, 61, 55, 49, 53. Calculate the mean and standard deviation.')).toBe(true)
    })

    it('physics force problem', () => {
      expect(needsComputation('A 5 kg mass is accelerated by a 20 N force. Find the acceleration.')).toBe(true)
    })

    it('circuit problem with values', () => {
      expect(needsComputation('A circuit has a 12V battery and 4 ohm resistor. Find the current.')).toBe(true)
    })

    it('pendulum problem', () => {
      expect(needsComputation('A pendulum has length 2 m. Find its period.')).toBe(true)
    })

    // New tests: keywords added after self-review
    it('free body diagram with values', () => {
      expect(needsComputation('Draw a free body diagram for a 10 kg block on a 25 degree ramp.')).toBe(true)
    })

    it('FBD shorthand with values', () => {
      expect(needsComputation('FBD of 50 kg crate being pulled with 100 N at 30 degrees.')).toBe(true)
    })

    it('spring/elastic problem', () => {
      expect(needsComputation('A spring with k = 200 N/m is compressed 0.3 m. Find the elastic potential energy.')).toBe(true)
    })

    it('wave problem', () => {
      expect(needsComputation('A wave has frequency 440 Hz and wavelength 0.77 m. Find its speed.')).toBe(true)
    })

    it('pressure/buoyancy problem', () => {
      expect(needsComputation('A 0.5 m³ object weighing 300 N is submerged in water. Find the buoyancy force.')).toBe(true)
    })

    it('thermal/heat problem', () => {
      expect(needsComputation('How much heat is needed to raise the temperature of 2 kg of water from 20°C to 80°C? Specific heat = 4186 J/kg·K.')).toBe(true)
    })

    // Soft biology exclusion: physics context overrides
    it('volcano projectile (physics context)', () => {
      expect(needsComputation('A volcano ejects a rock at 50 m/s at 45 degrees. Find the range.')).toBe(true)
    })

    it('pipe cross-section (physics context)', () => {
      expect(needsComputation('Water flows at 3 m/s through a cross section of 0.05 m². Find the flow rate.')).toBe(true)
    })

    // Graphing + computation override tests
    it('graph and find roots (graphing + computation)', () => {
      expect(needsComputation('Graph y = x^2 - 4x + 3 and find the roots.')).toBe(true)
    })

    it('plot and calculate area under curve', () => {
      expect(needsComputation('Plot f(x) = x^2 from 0 to 3 and calculate the area under the curve.')).toBe(true)
    })

    it('graph and find vertex', () => {
      expect(needsComputation('Graph y = 2x^2 - 8x + 5 and find the vertex and intercepts.')).toBe(true)
    })
  })

  // ── Should return FALSE ──
  describe('non-computable questions (returns false)', () => {
    it('biology — cell structure', () => {
      expect(needsComputation('Draw the structure of a plant cell with all organelles labeled.')).toBe(false)
    })

    it('biology — DNA', () => {
      expect(needsComputation('Show the double helix structure of DNA.')).toBe(false)
    })

    it('simple arithmetic — long division', () => {
      expect(needsComputation('Show long division of 765 by 5.')).toBe(false)
    })

    it('simple arithmetic — division expression', () => {
      expect(needsComputation('765 / 5')).toBe(false)
    })

    it('conceptual without numbers', () => {
      expect(needsComputation('Draw a number line.')).toBe(false)
    })

    it('pure graphing — plot function', () => {
      expect(needsComputation('Graph y = x^2 - 4x + 3')).toBe(false)
    })

    it('conceptual — label a diagram', () => {
      expect(needsComputation('Label the parts of a flower.')).toBe(false)
    })

    it('anatomy', () => {
      expect(needsComputation('Show the anatomy of the human eye.')).toBe(false)
    })

    it('no numbers at all', () => {
      expect(needsComputation('Explain Newton\'s third law.')).toBe(false)
    })

    it('illustration request (no physics)', () => {
      expect(needsComputation('Create a realistic illustration of a sunset.')).toBe(false)
    })

    it('virus illustration (no physics context)', () => {
      expect(needsComputation('Draw a realistic illustration of a virus.')).toBe(false)
    })

    it('cross section biology (no physics context)', () => {
      expect(needsComputation('Show a cross section of a leaf.')).toBe(false)
    })
  })
})
