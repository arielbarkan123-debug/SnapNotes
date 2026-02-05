'use client'

import { useState } from 'react'
import { NumberLine } from '@/components/math/NumberLine'
import { CoordinatePlane } from '@/components/math/CoordinatePlane'
import { Triangle } from '@/components/math/Triangle'
import { Circle } from '@/components/math/Circle'
import { UnitCircle } from '@/components/math/UnitCircle'
import { TreeDiagram } from '@/components/math/TreeDiagram'
import { LongDivisionDiagram } from '@/components/math/LongDivisionDiagram'
import { EquationSteps } from '@/components/math/EquationSteps'
import { FractionOperation } from '@/components/math/FractionOperation'
import { FactoringDiagram } from '@/components/math/FactoringDiagram'
import { CompletingSquareSteps } from '@/components/math/CompletingSquareSteps'
import { InequalityDiagram } from '@/components/math/InequalityDiagram'
import { InteractiveCoordinatePlane } from '@/components/math/InteractiveCoordinatePlane'
import { EquationGrapher } from '@/components/math/EquationGrapher'
import { RegularPolygon } from '@/components/geometry/RegularPolygon'
import { TriangleGeometry } from '@/components/geometry/TriangleGeometry'
import type { SubjectKey } from '@/lib/diagram-theme'

const numberLineData = {
  min: -5, max: 10, title: 'Number Line: -2 \u2264 x < 5',
  points: [
    { value: -2, label: '-2', style: 'filled' as const, color: '#6366f1' },
    { value: 5, label: '5', style: 'hollow' as const, color: '#6366f1' },
  ],
  intervals: [{ start: -2, end: 5, startInclusive: true, endInclusive: false, color: '#6366f1' }],
}

const coordinatePlaneData = {
  xMin: -5, xMax: 5, yMin: -5, yMax: 10, showGrid: true,
  title: 'y = x\u00b2 - 2x - 3',
  curves: [{ id: 'f', expression: 'x^2 - 2*x - 3', color: '#6366f1' }],
  points: [{ id: 'v', x: 1, y: -4, label: 'Vertex (1,-4)', color: '#ef4444' }],
  lines: [],
}

const triangleData = {
  vertices: [
    { label: 'A', x: 150, y: 30 }, { label: 'B', x: 30, y: 270 }, { label: 'C', x: 320, y: 270 },
  ] as [{ label: string; x: number; y: number }, { label: string; x: number; y: number }, { label: string; x: number; y: number }],
  sides: [
    { from: 'A', to: 'B', length: 10, label: '10 cm' },
    { from: 'B', to: 'C', length: 12, label: '12 cm' },
    { from: 'A', to: 'C', length: 8, label: '8 cm' },
  ],
  angles: [
    { vertex: 'A', value: 60, label: '60\u00b0' },
    { vertex: 'B', value: 50, label: '50\u00b0' },
    { vertex: 'C', value: 70, label: '70\u00b0' },
  ],
  title: 'Triangle ABC',
}

const circleData = {
  centerX: 0, centerY: 0, radius: 5, centerLabel: 'O',
  showRadius: true, radiusLabel: 'r = 5', showDiameter: true, title: 'Circle with radius 5',
}

const unitCircleData = {
  angles: [
    { degrees: 30, radians: '\u03c0/6', sin: '1/2', cos: '\u221a3/2' },
    { degrees: 45, radians: '\u03c0/4', sin: '\u221a2/2', cos: '\u221a2/2' },
    { degrees: 60, radians: '\u03c0/3', sin: '\u221a3/2', cos: '1/2' },
  ],
  showSinCos: true, highlightQuadrant: 1 as const, title: 'Standard Angles',
}

const treeDiagramData = {
  root: {
    label: 'Start',
    children: [
      { label: 'Heads', probability: '1/2', children: [{ label: 'H', probability: '1/2' }, { label: 'T', probability: '1/2' }] },
      { label: 'Tails', probability: '1/2', children: [{ label: 'H', probability: '1/2' }, { label: 'T', probability: '1/2' }] },
    ],
  },
  showProbabilities: true, title: 'Two Coin Flips',
}

const longDivisionData = {
  dividend: 156, divisor: 12, quotient: 13, remainder: 0,
  steps: [
    { step: 0, type: 'setup' as const, position: 0 },
    { step: 1, type: 'divide' as const, position: 1, quotientDigit: 1 },
    { step: 2, type: 'multiply' as const, position: 1, product: 12 },
    { step: 3, type: 'subtract' as const, position: 1, difference: 3 },
    { step: 4, type: 'bring_down' as const, position: 2, workingNumber: 36 },
    { step: 5, type: 'divide' as const, position: 2, quotientDigit: 3 },
    { step: 6, type: 'multiply' as const, position: 2, product: 36 },
    { step: 7, type: 'subtract' as const, position: 2, difference: 0 },
    { step: 8, type: 'complete' as const, position: 2 },
  ],
}

const equationData = {
  originalEquation: '2x + 5 = 13', variable: 'x', solution: '4',
  steps: [
    { step: 1, equation: '2x + 5 = 13', operation: 'initial' as const, leftSide: '2x + 5', rightSide: '13', description: 'Original equation', descriptionHe: '\u05de\u05e9\u05d5\u05d5\u05d0\u05d4 \u05de\u05e7\u05d5\u05e8\u05d9\u05ea' },
    { step: 2, equation: '2x = 8', operation: 'subtract' as const, leftSide: '2x', rightSide: '8', description: 'Subtract 5 from both sides', descriptionHe: '\u05d7\u05e1\u05e8 5 \u05de\u05e9\u05e0\u05d9 \u05d4\u05e6\u05d3\u05d3\u05d9\u05dd', calculation: '-5' },
    { step: 3, equation: 'x = 4', operation: 'divide' as const, leftSide: 'x', rightSide: '4', description: 'Divide both sides by 2', descriptionHe: '\u05d7\u05dc\u05e7 \u05d0\u05ea \u05e9\u05e0\u05d9 \u05d4\u05e6\u05d3\u05d3\u05d9\u05dd \u05d1-2', calculation: '\u00f72' },
  ],
}

const fractionData = {
  operationType: 'add' as const,
  fraction1: { numerator: 1, denominator: 3 },
  fraction2: { numerator: 1, denominator: 4 },
  result: { numerator: 7, denominator: 12 },
  steps: [
    { step: 1, type: 'initial' as const, fractions: [{ numerator: 1, denominator: 3 }, { numerator: 1, denominator: 4 }], operator: '+' as const, description: 'Start with the two fractions' },
    { step: 2, type: 'find_lcd' as const, fractions: [{ numerator: 1, denominator: 3 }, { numerator: 1, denominator: 4 }], lcd: 12, description: 'Find common denominator: LCD = 12' },
    { step: 3, type: 'convert' as const, fractions: [{ numerator: 4, denominator: 12 }, { numerator: 3, denominator: 12 }], description: 'Convert to equivalent fractions' },
    { step: 4, type: 'result' as const, fractions: [{ numerator: 7, denominator: 12 }], result: { numerator: 7, denominator: 12 }, description: '4/12 + 3/12 = 7/12' },
  ],
}

const factoringData = {
  expression: 'x\u00b2 + 5x + 6', a: 1, b: 5, c: 6, product: 6, sum: 5,
  factor1: '(x + 2)', factor2: '(x + 3)', factoredForm: '(x + 2)(x + 3)',
  steps: [
    { step: 1, type: 'identify' as const, description: 'Need: product = 6, sum = 5' },
    { step: 2, type: 'find_factors' as const, description: 'Try factor pairs', factorPairs: [
      { a: 1, b: 6, sum: 7, product: 6 }, { a: 2, b: 3, sum: 5, product: 6, isCorrect: true },
    ]},
    { step: 3, type: 'write_factors' as const, description: 'Write factored form', calculation: '(x + 2)(x + 3)' },
  ],
  method: 'simple' as const, title: 'Factor x\u00b2 + 5x + 6',
}

const completingSquareData = {
  originalEquation: 'x\u00b2 + 6x + 2 = 0', a: 1, b: 6, c: 2, halfB: 3, squaredHalfB: 9,
  variable: 'x', solutions: ['-3 + \u221a7', '-3 - \u221a7'], vertexForm: '(x + 3)\u00b2 = 7',
  steps: [
    { step: 1, type: 'identify' as const, description: 'Identify a, b, c', descriptionHe: '\u05d6\u05d9\u05d4\u05d5\u05d9 a, b, c', leftSide: 'x\u00b2 + 6x + 2', rightSide: '0' },
    { step: 2, type: 'isolate' as const, description: 'Move constant to right', descriptionHe: '\u05d4\u05e2\u05d1\u05e8\u05ea \u05d4\u05e7\u05d1\u05d5\u05e2', leftSide: 'x\u00b2 + 6x', rightSide: '-2' },
    { step: 3, type: 'half_b' as const, description: 'Half of b = 3', descriptionHe: '\u05d7\u05e6\u05d9 \u05de-b = 3', leftSide: 'b/2', rightSide: '3', highlightValue: '3' },
    { step: 4, type: 'square_it' as const, description: '(b/2)\u00b2 = 9', descriptionHe: '(b/2)\u00b2 = 9', leftSide: '(b/2)\u00b2', rightSide: '9', highlightValue: '9' },
    { step: 5, type: 'add_both' as const, description: 'Add 9 to both sides', descriptionHe: '\u05d4\u05d5\u05e1\u05e3 9 \u05dc\u05e9\u05e0\u05d9 \u05d4\u05e6\u05d3\u05d3\u05d9\u05dd', leftSide: 'x\u00b2 + 6x + 9', rightSide: '7', calculation: '+9' },
    { step: 6, type: 'factor_left' as const, description: 'Factor left side', descriptionHe: '\u05e4\u05e8\u05e7 \u05e6\u05d3 \u05e9\u05de\u05d0\u05dc', leftSide: '(x + 3)\u00b2', rightSide: '7' },
    { step: 7, type: 'sqrt_both' as const, description: 'Take square root', descriptionHe: '\u05d4\u05d5\u05e6\u05d0 \u05e9\u05d5\u05e8\u05e9', leftSide: 'x + 3', rightSide: '\u00b1\u221a7' },
    { step: 8, type: 'solve' as const, description: 'Solve for x', descriptionHe: '\u05e4\u05ea\u05d5\u05e8 \u05e2\u05d1\u05d5\u05e8 x', leftSide: 'x', rightSide: '-3 \u00b1 \u221a7' },
  ],
  title: 'Complete the Square',
}

const inequalityData = {
  originalInequality: '3x - 2 > 7', variable: 'x', solution: 'x > 3',
  boundaryValue: 3, finalOperator: '>' as const, intervalNotation: '(3, \u221e)',
  title: 'Solve: 3x - 2 > 7',
}

const regularPolygonData = {
  sides: 6, sideLength: 5, sideLabel: '5 cm',
  showApothem: true, showCentralAngle: true, showInteriorAngle: true,
  title: 'Regular Hexagon', showFormulas: true,
}

const triangleGeometryData = {
  type: 'scalene' as const,
  vertices: [{ x: 150, y: 50 }, { x: 50, y: 250 }, { x: 300, y: 250 }] as [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }],
  sides: { a: 10, b: 12, c: 8, labels: { a: '10 cm', b: '12 cm', c: '8 cm' } },
  angles: { A: 55.77, B: 82.82, C: 41.41 },
  height: { value: 7.5, from: 'A' as const, showLine: true },
  title: 'Find the Area', showFormulas: true,
}

export default function DiagramTestPage() {
  const [subject, setSubject] = useState<SubjectKey>('math')
  const [darkMode, setDarkMode] = useState(false)
  const [language, setLanguage] = useState<'en' | 'he'>('en')

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div style={{ minHeight: '100vh', background: darkMode ? '#0a0a0f' : '#f8fafc', padding: 24 }}>
        <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 50, background: darkMode ? '#0a0a0f' : '#f8fafc', paddingBlock: 16, borderBottom: `1px solid ${darkMode ? '#333' : '#e2e8f0'}` }}>
          <h1 style={{ fontSize: 24, fontWeight: 'bold', color: darkMode ? '#fff' : '#111' }}>Phase 2 Visual Smoke Test</h1>
          <select value={subject} onChange={(e) => setSubject(e.target.value as SubjectKey)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', background: darkMode ? '#222' : '#fff', color: darkMode ? '#fff' : '#000' }}>
            <option value="math">Math</option>
            <option value="physics">Physics</option>
            <option value="geometry">Geometry</option>
            <option value="chemistry">Chemistry</option>
            <option value="biology">Biology</option>
            <option value="economy">Economy</option>
          </select>
          <button onClick={() => setDarkMode(!darkMode)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', background: darkMode ? '#222' : '#fff', color: darkMode ? '#fff' : '#000' }}>
            {darkMode ? 'Light' : 'Dark'}
          </button>
          <button onClick={() => setLanguage(language === 'en' ? 'he' : 'en')} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', background: darkMode ? '#222' : '#fff', color: darkMode ? '#fff' : '#000' }}>
            {language === 'en' ? 'Hebrew' : 'English'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: 24, maxWidth: 1400, margin: '0 auto' }}>
          {/* eslint-disable @typescript-eslint/no-explicit-any -- smoke test page, data shapes are intentionally loose */}
          <Card title="1. NumberLine" dark={darkMode}><NumberLine data={numberLineData as any} subject={subject} language={language} /></Card>
          <Card title="2. CoordinatePlane" dark={darkMode}><CoordinatePlane data={coordinatePlaneData as any} subject={subject} language={language} /></Card>
          <Card title="3. Triangle" dark={darkMode}><Triangle data={triangleData as any} subject={subject} language={language} /></Card>
          <Card title="4. Circle" dark={darkMode}><Circle data={circleData as any} subject={subject} language={language} /></Card>
          <Card title="5. UnitCircle" dark={darkMode}><UnitCircle data={unitCircleData as any} subject={subject} language={language} /></Card>
          <Card title="6. TreeDiagram" dark={darkMode}><TreeDiagram data={treeDiagramData as any} subject={subject} language={language} /></Card>
          <Card title="7. LongDivision" dark={darkMode}><LongDivisionDiagram data={longDivisionData as any} subject={subject} language={language} /></Card>
          <Card title="8. EquationSteps" dark={darkMode}><EquationSteps data={equationData as any} subject={subject} language={language} /></Card>
          <Card title="9. FractionOperation" dark={darkMode}><FractionOperation data={fractionData as any} subject={subject} language={language} /></Card>
          <Card title="10. FactoringDiagram" dark={darkMode}><FactoringDiagram data={factoringData as any} subject={subject} language={language} /></Card>
          <Card title="11. CompletingSquare" dark={darkMode}><CompletingSquareSteps data={completingSquareData as any} subject={subject} language={language} /></Card>
          <Card title="12. InequalityDiagram" dark={darkMode}><InequalityDiagram data={inequalityData as any} subject={subject} language={language} /></Card>
          <Card title="13. InteractiveCoordPlane" dark={darkMode}><InteractiveCoordinatePlane data={coordinatePlaneData as any} subject={subject} language={language} /></Card>
          <Card title="14. EquationGrapher" dark={darkMode}><EquationGrapher subject={subject} language={language} /></Card>
          <Card title="15. RegularPolygon" dark={darkMode}><RegularPolygon data={regularPolygonData} subject={subject} language={language} /></Card>
          <Card title="16. TriangleGeometry" dark={darkMode}><TriangleGeometry data={triangleGeometryData} subject={subject} language={language} /></Card>
        </div>
      </div>
    </div>
  )
}

function Card({ title, dark, children }: { title: string; dark: boolean; children: React.ReactNode }) {
  return (
    <div style={{ background: dark ? '#1a1a2e' : '#fff', borderRadius: 12, border: `1px solid ${dark ? '#333' : '#e2e8f0'}`, padding: 16 }}>
      <h2 style={{ fontSize: 13, fontWeight: 600, color: dark ? '#999' : '#666', marginBottom: 12, borderBottom: `1px solid ${dark ? '#333' : '#f1f5f9'}`, paddingBottom: 8 }}>
        {title}
      </h2>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  )
}
