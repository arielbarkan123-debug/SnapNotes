'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface HeaderProps {
  userEmail?: string
  userName?: string
  isAdmin?: boolean
}

export default function Header({ userEmail, userName, isAdmin }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const displayName = userName || userEmail?.split('@')[0] || 'User'

  // Prefetch all navigation routes on mount for instant navigation
  useEffect(() => {
    const routes = ['/dashboard', '/review', '/practice', '/progress', '/exams', '/profile']
    routes.forEach(route => {
      router.prefetch(route)
    })
  }, [router])

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Error logging out:', error)
      setIsLoggingOut(false)
    }
  }

  const isActive = (path: string) => pathname === path

  return (
    <>
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 md:h-16">
            {/* Logo */}
            <Link
              href="/dashboard"
              className="text-xl font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              NoteSnap
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <nav className="flex items-center gap-1">
                <NavLink href="/dashboard" active={isActive('/dashboard')}>
                  Courses
                </NavLink>
                <NavLink href="/review" active={isActive('/review')}>
                  Review
                </NavLink>
                <NavLink href="/practice" active={isActive('/practice')} badge="Mix">
                  Practice
                </NavLink>
                <NavLink href="/exams" active={isActive('/exams')}>
                  Exams
                </NavLink>
                <NavLink href="/progress" active={isActive('/progress')}>
                  Progress
                </NavLink>
                {isAdmin && (
                  <NavLink href="/analytics" active={pathname?.startsWith('/analytics')}>
                    Admin
                  </NavLink>
                )}
              </nav>
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
              <Link
                href="/profile"
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors rounded-lg ${
                  isActive('/profile')
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {displayName}
              </Link>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors disabled:opacity-50"
              >
                {isLoggingOut ? 'Logging out...' : 'Log out'}
              </button>
            </div>

            {/* Mobile: Profile & Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              <Link
                href="/profile"
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden transition-opacity duration-300 ${
          isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Slide-out Menu */}
      <div
        className={`fixed top-14 right-0 bottom-0 z-50 w-72 bg-white dark:bg-gray-800 shadow-xl md:hidden transform transition-transform duration-300 ease-out ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* User info */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{displayName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{userEmail}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <MobileNavLink href="/dashboard" icon={CoursesIcon} active={isActive('/dashboard')}>
              Courses
            </MobileNavLink>
            <MobileNavLink href="/review" icon={ReviewIcon} active={isActive('/review')}>
              Review Cards
            </MobileNavLink>
            <MobileNavLink href="/practice" icon={PracticeIcon} active={isActive('/practice')} badge="Mix">
              Practice
            </MobileNavLink>
            <MobileNavLink href="/exams" icon={ExamIcon} active={isActive('/exams')}>
              Exams
            </MobileNavLink>
            <MobileNavLink href="/progress" icon={ProgressIcon} active={isActive('/progress')}>
              Progress
            </MobileNavLink>
            <MobileNavLink href="/profile" icon={ProfileIcon} active={isActive('/profile')}>
              Profile
            </MobileNavLink>
            {isAdmin && (
              <MobileNavLink href="/analytics" icon={AdminIcon} active={pathname?.startsWith('/analytics')}>
                Admin Dashboard
              </MobileNavLink>
            )}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {isLoggingOut ? 'Logging out...' : 'Log out'}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 md:hidden safe-area-pb">
        <div className="flex items-center justify-around h-16">
          <BottomNavLink href="/dashboard" icon={CoursesIcon} label="Courses" active={isActive('/dashboard')} />
          <BottomNavLink href="/review" icon={ReviewIcon} label="Review" active={isActive('/review')} />
          <BottomNavLink href="/practice" icon={PracticeIcon} label="Practice" active={isActive('/practice')} />
          <BottomNavLink href="/exams" icon={ExamIcon} label="Exams" active={isActive('/exams')} />
          <BottomNavLink href="/progress" icon={ProgressIcon} label="Progress" active={isActive('/progress')} />
        </div>
      </nav>

      {/* Spacer for bottom nav on mobile */}
      <div className="h-16 md:hidden" />
    </>
  )
}

// Desktop nav link
function NavLink({ href, children, active, badge }: { href: string; children: React.ReactNode; active: boolean; badge?: string }) {
  return (
    <Link
      href={href}
      className={`px-3 py-2 text-sm font-medium transition-colors rounded-lg flex items-center gap-1 ${
        active
          ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
          : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      {children}
      {badge && (
        <span className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-full">
          {badge}
        </span>
      )}
    </Link>
  )
}

// Mobile nav link
function MobileNavLink({ href, icon: Icon, children, active, badge }: { href: string; icon: React.FC<{ className?: string }>; children: React.ReactNode; active: boolean; badge?: string }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
        active
          ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="flex-1">{children}</span>
      {badge && (
        <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-full">
          {badge}
        </span>
      )}
    </Link>
  )
}

// Bottom nav link
function BottomNavLink({ href, icon: Icon, label, active }: { href: string; icon: React.FC<{ className?: string }>; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] transition-colors ${
        active
          ? 'text-indigo-600 dark:text-indigo-400'
          : 'text-gray-500 dark:text-gray-400'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-xs font-medium">{label}</span>
    </Link>
  )
}

// Icons
function CoursesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )
}

function ReviewIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  )
}

function PracticeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  )
}

function ExamIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
}

function ProgressIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function AdminIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}
