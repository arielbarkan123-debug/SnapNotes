import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Practice',
  description: 'Practice and test your knowledge with AI-generated questions',
}

export default function PracticeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
