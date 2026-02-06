'use client'

import { useState } from 'react'
import { MathDiagramRenderer } from '@/components/math/MathDiagramRenderer'
import type { MathDiagramState } from '@/types/math'

const diagrams: Array<{ label: string; diagram: MathDiagramState }> = [
  // 1. Box Plot
  {
    label: 'box_plot',
    diagram: {
      type: 'box_plot',
      visibleStep: 0,
      totalSteps: 1,
      data: {
        min: 2,
        q1: 5,
        median: 7,
        q3: 9,
        max: 12,
        outliers: [15],
        title: 'Test Scores Distribution',
        showLabels: true,
      },
    },
  },
  // 2. Histogram
  {
    label: 'histogram',
    diagram: {
      type: 'histogram',
      visibleStep: 0,
      totalSteps: 1,
      data: {
        bins: [
          { min: 0, max: 10, count: 3 },
          { min: 10, max: 20, count: 7 },
          { min: 20, max: 30, count: 12 },
          { min: 30, max: 40, count: 8 },
          { min: 40, max: 50, count: 4 },
        ],
        title: 'Frequency Distribution',
        xAxisLabel: 'Value Range',
        yAxisLabel: 'Frequency',
      },
    },
  },
  // 3. Number Line
  {
    label: 'number_line',
    diagram: {
      type: 'number_line',
      visibleStep: 0,
      totalSteps: 1,
      data: {
        min: 0,
        max: 10,
        points: [
          { value: 3, label: '3', style: 'filled' as const, color: '#3b82f6' },
          { value: 7, label: '7', style: 'filled' as const, color: '#ef4444' },
        ],
        title: 'Points on a Number Line',
      },
    },
  },
  // 4. Coordinate Plane
  {
    label: 'coordinate_plane',
    diagram: {
      type: 'coordinate_plane',
      visibleStep: 0,
      totalSteps: 1,
      data: {
        xMin: -3,
        xMax: 7,
        yMin: -1,
        yMax: 9,
        showGrid: true,
        xLabel: 'x',
        yLabel: 'y',
        points: [
          { id: 'p1', x: 2, y: 3, label: 'A(2,3)', color: '#3b82f6' },
          { id: 'p2', x: 5, y: 7, label: 'B(5,7)', color: '#ef4444' },
          { id: 'p3', x: -1, y: 4, label: 'C(-1,4)', color: '#22c55e' },
        ],
        lines: [
          {
            id: 'line1',
            points: [{ x: 2, y: 3 }, { x: 5, y: 7 }],
            color: '#8b5cf6',
            type: 'segment' as const,
          },
        ],
        title: 'Plotted Points with Line Segment',
      },
    },
  },
  // 5. Bar Model
  {
    label: 'bar_model',
    diagram: {
      type: 'bar_model',
      visibleStep: 0,
      totalSteps: 1,
      data: {
        parts: [
          { value: 30, label: 'Part A', color: '#3b82f6' },
          { value: 20, label: 'Part B', color: '#22c55e' },
          { value: 50, label: 'Part C', color: '#f59e0b' },
        ],
        total: 100,
        operation: 'add' as const,
        title: 'Addition: 30 + 20 + 50 = 100',
      },
    },
  },
  // 6. Fraction Circle
  {
    label: 'fraction_circle',
    diagram: {
      type: 'fraction_circle',
      visibleStep: 0,
      totalSteps: 1,
      data: {
        numerator: 3,
        denominator: 4,
        showLabel: true,
        color: '#8b5cf6',
        title: 'Three Quarters (3/4)',
      },
    },
  },
  // 7. Slope Triangle
  {
    label: 'slope_triangle',
    diagram: {
      type: 'slope_triangle',
      visibleStep: 0,
      totalSteps: 1,
      data: {
        point1: { x: 1, y: 2 },
        point2: { x: 4, y: 8 },
        rise: 6,
        run: 3,
        slope: 2,
        showRiseRun: true,
        showSlopeFormula: true,
        title: 'Slope = rise/run = 6/3 = 2',
      },
    },
  },
  // 8. Venn Diagram
  {
    label: 'venn_diagram',
    diagram: {
      type: 'venn_diagram',
      visibleStep: 0,
      totalSteps: 1,
      data: {
        sets: [
          { label: 'Set A', elements: ['1', '2', '3', '4'], color: '#3b82f6' },
          { label: 'Set B', elements: ['3', '4', '5', '6'], color: '#ef4444' },
        ],
        intersections: [
          { setIndices: [0, 1], elements: ['3', '4'] },
        ],
        title: 'Venn Diagram: A and B',
      },
    },
  },
  // 9. Quadratic Graph
  {
    label: 'quadratic_graph',
    diagram: {
      type: 'quadratic_graph',
      visibleStep: 0,
      totalSteps: 1,
      data: {
        a: 1,
        b: -4,
        c: 3,
        expression: 'y = x^2 - 4x + 3',
        vertex: { x: 2, y: -1 },
        roots: [1, 3],
        axisOfSymmetry: 2,
        showVertex: true,
        showRoots: true,
        showAxisOfSymmetry: true,
        domain: { min: -1, max: 5 },
        title: 'y = x\u00B2 - 4x + 3',
      },
    },
  },
  // 10. Probability Tree
  {
    label: 'probability_tree',
    diagram: {
      type: 'probability_tree',
      visibleStep: 0,
      totalSteps: 1,
      data: {
        levels: [
          {
            branches: [
              { label: 'Heads', probability: 0.5, children: [0, 1, 2] },
              { label: 'Tails', probability: 0.5, children: [3, 4, 5] },
            ],
          },
          {
            branches: [
              { label: '1-2', probability: 1 / 3 },
              { label: '3-4', probability: 1 / 3 },
              { label: '5-6', probability: 1 / 3 },
              { label: '1-2', probability: 1 / 3 },
              { label: '3-4', probability: 1 / 3 },
              { label: '5-6', probability: 1 / 3 },
            ],
          },
        ],
        outcomes: [
          { path: ['Heads', '1-2'], probability: 1 / 6 },
          { path: ['Heads', '3-4'], probability: 1 / 6 },
          { path: ['Heads', '5-6'], probability: 1 / 6 },
          { path: ['Tails', '1-2'], probability: 1 / 6 },
          { path: ['Tails', '3-4'], probability: 1 / 6 },
          { path: ['Tails', '5-6'], probability: 1 / 6 },
        ],
        title: 'Coin Flip then Die Roll',
      },
    },
  },
]

export default function TestDiagramsPage() {
  const [darkMode, setDarkMode] = useState(false)
  const [rtl, setRtl] = useState(false)

  return (
    <div className={`${darkMode ? 'dark' : ''} min-h-screen`} dir={rtl ? 'rtl' : 'ltr'}>
      <div className="p-6 bg-white dark:bg-gray-900 min-h-screen transition-colors">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Diagram Visual QA
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            10 representative diagram components with hardcoded mock data
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button
            onClick={() => setRtl(!rtl)}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {rtl ? 'LTR (English)' : 'RTL (Hebrew)'}
          </button>
        </div>

        {/* Diagram Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {diagrams.map((d, i) => (
            <div
              key={i}
              className="border rounded-xl p-4 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
            >
              <h3 className="text-sm font-mono mb-3 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">
                {i + 1}. {d.label}
              </h3>
              <div className="flex justify-center overflow-hidden max-h-[500px]">
                <MathDiagramRenderer
                  diagram={d.diagram}
                  currentStep={d.diagram.visibleStep}
                  showControls={false}
                  animate={false}
                  language={rtl ? 'he' : 'en'}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
