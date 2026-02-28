import type { Metadata } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://notesnap.app'

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create your free NoteSnap account and start your AI-powered learning journey today.',
  alternates: {
    canonical: `${APP_URL}/signup`,
  },
}

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
