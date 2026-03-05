// Mock the Anthropic SDK to prevent browser environment check during testing
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: jest.fn() },
  }))
})

import { runSanityChecksOnly } from '@/lib/diagram-engine/smart-pipeline/verify'
import type { ComputedProblem } from '@/lib/diagram-engine/smart-pipeline/types'

function makeComputed(values: Record<string, { value: number; unit: string; name?: string; formula?: string; step?: string }>): ComputedProblem {
  const computedValues: ComputedProblem['values'] = {}
  for (const [key, v] of Object.entries(values)) {
    computedValues[key] = {
      name: v.name || key,
      value: v.value,
      unit: v.unit,
      formula: v.formula || '',
      step: v.step || '',
    }
  }
  return {
    values: computedValues,
    solutionSteps: [],
    rawOutput: '{}',
    computeTimeMs: 100,
  }
}

describe('verify — programmatic sanity checks', () => {
  describe('universal checks', () => {
    it('passes for normal finite values', () => {
      const computed = makeComputed({
        force: { value: 240, unit: 'N' },
        acceleration: { value: 3.2, unit: 'm/s²' },
      })
      const checks = runSanityChecksOnly(computed, 'mechanics')
      expect(checks.every(c => c.passed)).toBe(true)
    })

    it('fails for NaN values', () => {
      const computed = makeComputed({
        force: { value: NaN, unit: 'N' },
      })
      const checks = runSanityChecksOnly(computed, 'mechanics')
      const finiteCheck = checks.find(c => c.name === 'force_finite')
      expect(finiteCheck?.passed).toBe(false)
    })

    it('fails for Infinity', () => {
      const computed = makeComputed({
        force: { value: Infinity, unit: 'N' },
      })
      const checks = runSanityChecksOnly(computed, 'mechanics')
      const finiteCheck = checks.find(c => c.name === 'force_finite')
      expect(finiteCheck?.passed).toBe(false)
    })

    it('fails for extremely large values', () => {
      const computed = makeComputed({
        velocity: { value: 1e15, unit: 'm/s' },
      })
      const checks = runSanityChecksOnly(computed, 'mechanics')
      const magCheck = checks.find(c => c.name === 'velocity_magnitude')
      expect(magCheck?.passed).toBe(false)
    })
  })

  describe('physics checks', () => {
    it('passes for valid physics values', () => {
      const computed = makeComputed({
        mass: { value: 80, unit: 'kg' },
        theta: { value: 30, unit: 'degrees' },
        acceleration: { value: 3.2, unit: 'm/s²' },
      })
      const checks = runSanityChecksOnly(computed, 'mechanics')
      expect(checks.every(c => c.passed)).toBe(true)
    })

    it('fails for negative mass', () => {
      const computed = makeComputed({
        mass: { value: -5, unit: 'kg' },
      })
      const checks = runSanityChecksOnly(computed, 'mechanics')
      const massCheck = checks.find(c => c.name === 'mass_positive_mass')
      expect(massCheck?.passed).toBe(false)
    })

    it('fails for angle > 360', () => {
      const computed = makeComputed({
        theta: { value: 400, unit: 'degrees' },
      })
      const checks = runSanityChecksOnly(computed, 'mechanics')
      const angleCheck = checks.find(c => c.name === 'theta_angle_range')
      expect(angleCheck?.passed).toBe(false)
    })

    // Regex false positive regression tests
    it('does NOT apply mass check to "momentum" (false positive fix)', () => {
      const computed = makeComputed({
        momentum: { value: -50, unit: 'kg' },
      })
      const checks = runSanityChecksOnly(computed, 'mechanics')
      // "momentum" should NOT be flagged as a mass variable
      const massCheck = checks.find(c => c.name === 'momentum_positive_mass')
      expect(massCheck).toBeUndefined()
    })

    it('does NOT apply mass check to "maximum" (false positive fix)', () => {
      const computed = makeComputed({
        maximum: { value: -10, unit: 'kg' },
      })
      const checks = runSanityChecksOnly(computed, 'mechanics')
      const massCheck = checks.find(c => c.name === 'maximum_positive_mass')
      expect(massCheck).toBeUndefined()
    })

    it('correctly applies mass check to "m_total" (subscript mass)', () => {
      const computed = makeComputed({
        m_total: { value: 15, unit: 'kg' },
      })
      const checks = runSanityChecksOnly(computed, 'mechanics')
      const massCheck = checks.find(c => c.name === 'm_total_positive_mass')
      expect(massCheck?.passed).toBe(true)
    })

    it('does NOT apply accel check to "area" (false positive fix)', () => {
      const computed = makeComputed({
        area: { value: 25, unit: 'm/s²' },
      })
      const checks = runSanityChecksOnly(computed, 'mechanics')
      const accelCheck = checks.find(c => c.name === 'area_accel_sanity')
      expect(accelCheck).toBeUndefined()
    })

    it('correctly applies accel check to "a_net" (subscript acceleration)', () => {
      const computed = makeComputed({
        a_net: { value: 5, unit: 'm/s²' },
      })
      const checks = runSanityChecksOnly(computed, 'mechanics')
      const accelCheck = checks.find(c => c.name === 'a_net_accel_sanity')
      expect(accelCheck?.passed).toBe(true)
    })
  })

  describe('geometry checks', () => {
    it('passes for positive area', () => {
      const computed = makeComputed({
        area: { value: 25.5, unit: 'cm²' },
        perimeter: { value: 20, unit: 'cm' },
      })
      const checks = runSanityChecksOnly(computed, 'geometry')
      expect(checks.every(c => c.passed)).toBe(true)
    })

    it('fails for negative area', () => {
      const computed = makeComputed({
        area: { value: -10, unit: 'cm²' },
      })
      const checks = runSanityChecksOnly(computed, 'geometry')
      const areaCheck = checks.find(c => c.name === 'area_positive')
      expect(areaCheck?.passed).toBe(false)
    })
  })

  describe('statistics checks', () => {
    it('passes for valid statistics', () => {
      const computed = makeComputed({
        mean: { value: 52.3, unit: '' },
        std_dev: { value: 5.1, unit: '' },
      })
      const checks = runSanityChecksOnly(computed, 'statistics')
      expect(checks.every(c => c.passed)).toBe(true)
    })

    it('fails for negative standard deviation', () => {
      const computed = makeComputed({
        std_dev: { value: -3, unit: '' },
      })
      const checks = runSanityChecksOnly(computed, 'statistics')
      const stdCheck = checks.find(c => c.name === 'std_dev_non_negative')
      expect(stdCheck?.passed).toBe(false)
    })

    // Regex false positive regression tests
    it('does NOT apply probability check to "step" (false positive fix)', () => {
      const computed = makeComputed({
        step: { value: 2, unit: '' },
      })
      const checks = runSanityChecksOnly(computed, 'statistics')
      const probCheck = checks.find(c => c.name === 'step_probability_range')
      expect(probCheck).toBeUndefined()
    })

    it('correctly applies probability check to "p_value"', () => {
      const computed = makeComputed({
        p_value: { value: 0.05, unit: '' },
      })
      const checks = runSanityChecksOnly(computed, 'statistics')
      const probCheck = checks.find(c => c.name === 'p_value_probability_range')
      expect(probCheck?.passed).toBe(true)
    })

    it('correctly applies probability check to "probability"', () => {
      const computed = makeComputed({
        probability: { value: 1.5, unit: '' },
      })
      const checks = runSanityChecksOnly(computed, 'statistics')
      const probCheck = checks.find(c => c.name === 'probability_probability_range')
      expect(probCheck?.passed).toBe(false)
    })
  })
})
