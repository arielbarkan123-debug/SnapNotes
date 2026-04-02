import type { Metadata } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://xplus1.ai'

export const metadata: Metadata = {
  title: 'Log In',
  description: 'Sign in to your X+1 account to continue your learning journey.',
  alternates: {
    canonical: `${APP_URL}/login`,
  },
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
