/**
 * Tests for physics calculation utilities
 */

import {
  calculateInclinedPlane,
  calculateFBD,
  calculateProjectile,
  calculateCircularMotion,
  calculateCollision,
  getInclinedPlaneResults,
  getFBDResults,
  getProjectileResults,
  getCircularMotionResults,
  getCollisionResults,
  GRAVITY,
  toRadians,
  toDegrees,
} from '@/lib/visual-learning'

describe('Physics Calculations', () => {
  describe('Utility functions', () => {
    test('toRadians converts degrees to radians correctly', () => {
      expect(toRadians(0)).toBe(0)
      expect(toRadians(90)).toBeCloseTo(Math.PI / 2)
      expect(toRadians(180)).toBeCloseTo(Math.PI)
      expect(toRadians(360)).toBeCloseTo(2 * Math.PI)
      expect(toRadians(45)).toBeCloseTo(Math.PI / 4)
    })

    test('toDegrees converts radians to degrees correctly', () => {
      expect(toDegrees(0)).toBe(0)
      expect(toDegrees(Math.PI / 2)).toBeCloseTo(90)
      expect(toDegrees(Math.PI)).toBeCloseTo(180)
      expect(toDegrees(2 * Math.PI)).toBeCloseTo(360)
    })
  })

  describe('calculateInclinedPlane', () => {
    test('calculates forces for 30 degree incline with no friction', () => {
      const result = calculateInclinedPlane({
        mass: 10,
        angle: 30,
        friction: 0,
      })

      // Weight = mg = 10 * 9.8 = 98 N
      expect(result.weight).toBeCloseTo(98)

      // Normal = mg * cos(30) = 98 * cos(30) = 84.87 N
      expect(result.normalForce).toBeCloseTo(84.87, 1)

      // Friction = 0 (no friction coefficient, but equals weightParallel since object is sliding)
      // The frictionForce is actually the parallel component when sliding with mu=0
      expect(result.maxStaticFriction).toBe(0)

      // Weight parallel component = mg * sin(30) = 98 * 0.5 = 49 N
      expect(result.weightParallel).toBeCloseTo(49)

      // Net force = weight parallel (no friction to oppose)
      expect(result.netForce).toBeCloseTo(49)

      // Acceleration = F/m = 49/10 = 4.9 m/s^2
      expect(result.acceleration).toBeCloseTo(4.9)

      // Should be sliding with no friction
      expect(result.isSliding).toBe(true)
    })

    test('calculates forces with friction', () => {
      const result = calculateInclinedPlane({
        mass: 5,
        angle: 30,
        friction: 0.3,
      })

      // Weight = 5 * 9.8 = 49 N
      expect(result.weight).toBeCloseTo(49)

      // Normal force = mg * cos(30)
      const normalForce = 5 * GRAVITY * Math.cos(toRadians(30))
      expect(result.normalForce).toBeCloseTo(normalForce)

      // Max friction = mu * N
      const maxFriction = 0.3 * normalForce
      expect(result.frictionForce).toBeCloseTo(maxFriction)
    })

    test('handles zero angle (flat surface)', () => {
      const result = calculateInclinedPlane({
        mass: 10,
        angle: 0,
        friction: 0.3,
      })

      // On flat surface, normal = weight
      expect(result.normalForce).toBeCloseTo(result.weight)

      // Weight parallel component is 0
      expect(result.weightParallel).toBeCloseTo(0)

      // Not sliding (weight parallel < max static friction)
      expect(result.isSliding).toBe(false)

      // No motion, so no net force and no acceleration
      expect(result.netForce).toBeCloseTo(0)
      expect(result.acceleration).toBeCloseTo(0)
    })

    test('handles 90 degree angle (vertical)', () => {
      const result = calculateInclinedPlane({
        mass: 5,
        angle: 90,
        friction: 0.3,
      })

      // At 90 degrees, normal force ≈ 0
      expect(result.normalForce).toBeCloseTo(0, 5)

      // All weight is parallel component
      expect(result.weightParallel).toBeCloseTo(result.weight)

      // Should be sliding (free fall)
      expect(result.isSliding).toBe(true)
    })
  })

  describe('calculateFBD', () => {
    test('calculates static FBD with no applied force', () => {
      const result = calculateFBD({
        mass: 5,
        appliedForce: 0,
        appliedAngle: 0,
        friction: 0.3,
      })

      // Weight = mg
      expect(result.weight).toBeCloseTo(5 * GRAVITY)

      // Normal force balances weight
      expect(result.normalForce).toBeCloseTo(5 * GRAVITY)

      // No applied force, no friction
      expect(result.frictionForce).toBeCloseTo(0)

      // Net force is 0
      expect(result.netForceMagnitude).toBeCloseTo(0)

      // Acceleration is 0
      expect(result.accelerationX).toBeCloseTo(0)
    })

    test('calculates FBD with horizontal applied force', () => {
      const result = calculateFBD({
        mass: 10,
        appliedForce: 50,
        appliedAngle: 0,
        friction: 0.2,
      })

      // Weight = 10 * 9.8 = 98 N
      expect(result.weight).toBeCloseTo(98)

      // Normal force = weight (no vertical component from applied force at 0 degrees)
      expect(result.normalForce).toBeCloseTo(98)

      // Max friction = 0.2 * 98 = 19.6 N
      expect(result.frictionForce).toBeCloseTo(19.6)

      // Net force X = 50 - 19.6 = 30.4 N (friction opposes motion)
      expect(result.netForceX).toBeCloseTo(30.4)

      // Acceleration = 30.4 / 10 = 3.04 m/s^2
      expect(result.accelerationX).toBeCloseTo(3.04)
    })

    test('calculates FBD with angled applied force', () => {
      const result = calculateFBD({
        mass: 5,
        appliedForce: 20,
        appliedAngle: 30,
        friction: 0.2,
      })

      // Applied force has vertical component that reduces normal force
      const appliedVertical = 20 * Math.sin(toRadians(30))
      const expectedNormal = 5 * GRAVITY - appliedVertical
      expect(result.normalForce).toBeCloseTo(expectedNormal)
    })
  })

  describe('calculateProjectile', () => {
    test('calculates projectile motion at 45 degrees', () => {
      const result = calculateProjectile({
        initialVelocity: 20,
        launchAngle: 45,
        initialHeight: 0,
      })

      // At 45 degrees, v0x = v0y = v0 * cos(45) = 20 * 0.707 = 14.14 m/s
      const v0Component = 20 * Math.cos(toRadians(45))

      // Max height = v0y^2 / (2g)
      const expectedMaxHeight = (v0Component ** 2) / (2 * GRAVITY)
      expect(result.maxHeight).toBeCloseTo(expectedMaxHeight, 1)

      // Time of flight = 2 * v0y / g (for initial height = 0)
      const expectedTimeOfFlight = 2 * v0Component / GRAVITY
      expect(result.timeOfFlight).toBeCloseTo(expectedTimeOfFlight, 1)

      // Range = v0x * timeOfFlight
      const expectedRange = v0Component * expectedTimeOfFlight
      expect(result.range).toBeCloseTo(expectedRange, 0)
    })

    test('calculates projectile from elevated position', () => {
      const result = calculateProjectile({
        initialVelocity: 10,
        launchAngle: 0,
        initialHeight: 10,
      })

      // Horizontal launch from 10m height
      // Time to fall: h = 0.5 * g * t^2, so t = sqrt(2h/g)
      const expectedTime = Math.sqrt(2 * 10 / GRAVITY)
      expect(result.timeOfFlight).toBeCloseTo(expectedTime, 1)

      // Range = v0 * t (since angle = 0)
      expect(result.range).toBeCloseTo(10 * expectedTime, 1)
    })

    test('handles 90 degree launch angle', () => {
      const result = calculateProjectile({
        initialVelocity: 20,
        launchAngle: 90,
        initialHeight: 0,
      })

      // Straight up: max height = v0^2 / (2g)
      const expectedMaxHeight = (20 ** 2) / (2 * GRAVITY)
      expect(result.maxHeight).toBeCloseTo(expectedMaxHeight)

      // Range should be ~0 (straight up and down)
      expect(result.range).toBeCloseTo(0, 0)
    })
  })

  describe('calculateCircularMotion', () => {
    test('calculates centripetal acceleration and force', () => {
      const result = calculateCircularMotion({
        mass: 2,
        velocity: 10,
        radius: 5,
      })

      // Centripetal acceleration = v^2 / r = 100 / 5 = 20 m/s^2
      expect(result.centripetalAcceleration).toBeCloseTo(20)

      // Centripetal force = m * a = 2 * 20 = 40 N
      expect(result.centripetalForce).toBeCloseTo(40)

      // Angular velocity = v / r = 10 / 5 = 2 rad/s
      expect(result.angularVelocity).toBeCloseTo(2)

      // Period = 2 * pi * r / v = 2 * pi * 5 / 10 = pi seconds
      expect(result.period).toBeCloseTo(Math.PI)

      // Frequency = 1 / period
      expect(result.frequency).toBeCloseTo(1 / Math.PI)
    })

    test('handles small radius (high acceleration)', () => {
      const result = calculateCircularMotion({
        mass: 1,
        velocity: 10,
        radius: 1,
      })

      // a = v^2 / r = 100 / 1 = 100 m/s^2
      expect(result.centripetalAcceleration).toBeCloseTo(100)
    })
  })

  describe('calculateCollision', () => {
    test('calculates elastic collision (elasticity = 1)', () => {
      const result = calculateCollision({
        mass1: 2,
        mass2: 3,
        velocity1: 5,
        velocity2: -2,
        elasticity: 1,
      })

      // In elastic collision, momentum and KE are conserved
      const initialMomentum = 2 * 5 + 3 * (-2) // = 10 - 6 = 4
      const finalMomentum = 2 * result.v1Final + 3 * result.v2Final
      expect(finalMomentum).toBeCloseTo(initialMomentum)

      // Initial KE = 0.5 * 2 * 25 + 0.5 * 3 * 4 = 25 + 6 = 31 J
      // Final KE should be same for elastic
      const initialKE = 0.5 * 2 * 25 + 0.5 * 3 * 4
      const finalKE = 0.5 * 2 * result.v1Final ** 2 + 0.5 * 3 * result.v2Final ** 2
      expect(finalKE).toBeCloseTo(initialKE, 1)
    })

    test('calculates perfectly inelastic collision (elasticity = 0)', () => {
      const result = calculateCollision({
        mass1: 2,
        mass2: 3,
        velocity1: 10,
        velocity2: 0,
        elasticity: 0,
      })

      // In perfectly inelastic collision, objects stick together
      // Final velocity = (m1*v1 + m2*v2) / (m1 + m2) = (2*10 + 0) / 5 = 4 m/s
      const expectedFinalVelocity = (2 * 10 + 3 * 0) / (2 + 3)
      expect(result.v1Final).toBeCloseTo(expectedFinalVelocity)
      expect(result.v2Final).toBeCloseTo(expectedFinalVelocity)
    })

    test('calculates inelastic collision (elasticity = 0.5)', () => {
      const result = calculateCollision({
        mass1: 2,
        mass2: 2,
        velocity1: 10,
        velocity2: 0,
        elasticity: 0.5,
      })

      // Momentum is conserved
      const initialMomentum = 2 * 10 + 2 * 0 // = 20
      const finalMomentum = 2 * result.v1Final + 2 * result.v2Final
      expect(finalMomentum).toBeCloseTo(initialMomentum)

      // Energy is lost in inelastic collision
      const initialKE = 0.5 * 2 * 100 + 0 // = 100 J
      const finalKE = 0.5 * 2 * result.v1Final ** 2 + 0.5 * 2 * result.v2Final ** 2
      expect(finalKE).toBeLessThan(initialKE)
    })
  })

  describe('Result getter functions', () => {
    test('getInclinedPlaneResults returns formatted results', () => {
      const results = getInclinedPlaneResults({
        mass: 5,
        angle: 30,
        friction: 0.3,
      })

      expect(results).toBeInstanceOf(Array)
      expect(results.length).toBeGreaterThan(0)

      const primaryResult = results.find(r => r.isPrimary)
      expect(primaryResult).toBeDefined()
      expect(primaryResult?.label).toBe('Acceleration')
    })

    test('getFBDResults returns formatted results', () => {
      const results = getFBDResults({
        mass: 5,
        appliedForce: 20,
        appliedAngle: 0,
        friction: 0.2,
      })

      expect(results).toBeInstanceOf(Array)
      expect(results.length).toBeGreaterThan(0)

      const primaryResult = results.find(r => r.isPrimary)
      expect(primaryResult).toBeDefined()
    })

    test('getProjectileResults returns formatted results', () => {
      const results = getProjectileResults({
        initialVelocity: 20,
        launchAngle: 45,
        initialHeight: 0,
      })

      expect(results).toBeInstanceOf(Array)
      expect(results.length).toBeGreaterThan(0)

      // Check range is in results
      const rangeResult = results.find(r => r.label === 'Range')
      expect(rangeResult).toBeDefined()
    })

    test('getCircularMotionResults returns formatted results', () => {
      const results = getCircularMotionResults({
        mass: 2,
        velocity: 10,
        radius: 5,
      })

      expect(results).toBeInstanceOf(Array)
      expect(results.length).toBeGreaterThan(0)
    })

    test('getCollisionResults returns formatted results', () => {
      const results = getCollisionResults({
        mass1: 2,
        mass2: 3,
        velocity1: 5,
        velocity2: -2,
        elasticity: 1,
      })

      expect(results).toBeInstanceOf(Array)
      expect(results.length).toBeGreaterThan(0)
    })
  })
})
