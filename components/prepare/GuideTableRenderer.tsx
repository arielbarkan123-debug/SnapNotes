'use client'

import { MathText } from '@/components/ui/MathRenderer'
import type { GuideTable } from '@/types/prepare'

function CellContent({ text }: { text: string }) {
  if (text.includes('$')) {
    return <MathText>{text}</MathText>
  }
  return <>{text}</>
}

interface GuideTableRendererProps {
  table: GuideTable
}

export default function GuideTableRenderer({ table }: GuideTableRendererProps) {
  if (!table.headers?.length && !table.rows?.length) return null

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        {table.headers && table.headers.length > 0 && (
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              {table.headers.map((header, idx) => (
                <th
                  key={idx}
                  className="px-4 py-2.5 text-start font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700"
                >
                  <CellContent text={header} />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {table.rows?.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              {row.map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  className="px-4 py-2.5 text-gray-700 dark:text-gray-300"
                >
                  <CellContent text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {table.caption && (
        <div className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          {table.caption}
        </div>
      )}
    </div>
  )
}
