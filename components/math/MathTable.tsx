'use client'

import type { TableData, TableCell } from '@/types'
import { MathRenderer } from '@/components/ui/MathRenderer'

interface MathTableProps {
  data: TableData
  className?: string
}

/**
 * MathTable - Component for displaying math tables
 * Used for value tables, sign tables, and pattern tables
 */
export function MathTable({ data, className = '' }: MathTableProps) {
  const { rows, title, caption } = data

  if (!rows.length) return null

  return (
    <div className={`overflow-x-auto ${className}`}>
      {/* Title */}
      {title && (
        <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2 text-center">
          {title}
        </h4>
      )}

      <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {row.map((cell, cellIndex) => {
                const isHeader = cell.isHeader || rowIndex === 0
                const CellTag = isHeader ? 'th' : 'td'

                // Determine cell styling
                const cellClasses = [
                  'border border-gray-300 dark:border-gray-600',
                  'px-3 py-2',
                  'text-center',
                  isHeader
                    ? 'bg-blue-50 dark:bg-blue-900/30 font-medium text-gray-800 dark:text-gray-200'
                    : 'bg-white dark:bg-gray-800',
                  cell.highlight
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 font-medium'
                    : '',
                ]

                // Check if content contains LaTeX (has $ or \ or common math symbols)
                const hasLatex =
                  cell.content.includes('$') ||
                  cell.content.includes('\\') ||
                  /[√∫∑∏≤≥±×÷]/.test(cell.content)

                return (
                  <CellTag
                    key={`cell-${rowIndex}-${cellIndex}`}
                    className={cellClasses.filter(Boolean).join(' ')}
                    style={cell.color ? { color: cell.color } : undefined}
                  >
                    {hasLatex ? (
                      <MathRenderer math={cell.content.replace(/\$/g, '')} />
                    ) : (
                      <span className="text-sm">{cell.content}</span>
                    )}
                  </CellTag>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Caption */}
      {caption && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          {caption}
        </p>
      )}
    </div>
  )
}

/**
 * SignTable - Specialized table for sign analysis
 */
export function SignTable({
  expression,
  zeros,
  className = '',
}: {
  expression: string
  zeros: Array<{ value: number; label?: string }>
  className?: string
}) {
  // Sort zeros by value
  const sortedZeros = [...zeros].sort((a, b) => a.value - b.value)

  // Build the table data
  const headerRow = [
    { content: 'x', isHeader: true },
    { content: `(-∞, ${sortedZeros[0]?.value ?? ''})`, isHeader: true },
  ]

  for (let i = 0; i < sortedZeros.length; i++) {
    headerRow.push({
      content: sortedZeros[i].label || String(sortedZeros[i].value),
      isHeader: true,
    })
    if (i < sortedZeros.length - 1) {
      headerRow.push({
        content: `(${sortedZeros[i].value}, ${sortedZeros[i + 1].value})`,
        isHeader: true,
      })
    }
  }

  if (sortedZeros.length > 0) {
    headerRow.push({
      content: `(${sortedZeros[sortedZeros.length - 1].value}, +∞)`,
      isHeader: true,
    })
  }

  const signRow: TableCell[] = [{ content: expression, isHeader: true }]

  // This would need actual sign computation; for now showing placeholder
  for (let i = 0; i < headerRow.length - 1; i++) {
    signRow.push({
      content: i % 2 === 0 ? '+' : '0',
      isHeader: false,
      highlight: false,
      color: i % 2 === 0 ? '#10B981' : '#6B7280',
    })
  }

  const tableData: TableData = {
    rows: [headerRow, signRow],
    title: `Sign Analysis: ${expression}`,
  }

  return <MathTable data={tableData} className={className} />
}

/**
 * ValueTable - Specialized table for function values
 */
export function ValueTable({
  xValues,
  yValues,
  xLabel = 'x',
  yLabel = 'f(x)',
  title,
  className = '',
}: {
  xValues: (number | string)[]
  yValues: (number | string)[]
  xLabel?: string
  yLabel?: string
  title?: string
  className?: string
}) {
  const rows = [
    [
      { content: xLabel, isHeader: true },
      ...xValues.map((x) => ({ content: String(x), isHeader: true })),
    ],
    [
      { content: yLabel, isHeader: true },
      ...yValues.map((y) => ({ content: String(y), isHeader: false })),
    ],
  ]

  return (
    <MathTable
      data={{ rows, title, caption: undefined }}
      className={className}
    />
  )
}

/**
 * FactorTable - Specialized table for factoring (sum-product method)
 */
export function FactorTable({
  targetSum,
  targetProduct,
  factors,
  className = '',
}: {
  targetSum: number | string
  targetProduct: number | string
  factors: Array<{ p: number | string; q: number | string; isCorrect?: boolean }>
  className?: string
}) {
  const hasCorrect = factors.some((f) => f.isCorrect)

  const rows = [
    [
      { content: 'p', isHeader: true },
      { content: 'q', isHeader: true },
      { content: 'p + q', isHeader: true },
      { content: 'p × q', isHeader: true },
    ],
    [
      { content: 'Target', isHeader: true },
      { content: '-', isHeader: true },
      { content: String(targetSum), isHeader: true, highlight: true },
      { content: String(targetProduct), isHeader: true, highlight: true },
    ],
    ...factors.map((f) => [
      { content: String(f.p), isHeader: false },
      { content: String(f.q), isHeader: false },
      {
        content: String(Number(f.p) + Number(f.q)),
        isHeader: false,
        highlight: f.isCorrect,
        color: f.isCorrect ? '#10B981' : undefined,
      },
      {
        content: String(Number(f.p) * Number(f.q)),
        isHeader: false,
        highlight: f.isCorrect,
        color: f.isCorrect ? '#10B981' : undefined,
      },
    ]),
  ]

  return (
    <MathTable
      data={{
        rows,
        title: 'Sum-Product Method',
        caption: hasCorrect ? '✓ Found factors!' : undefined,
      }}
      className={className}
    />
  )
}

export default MathTable
