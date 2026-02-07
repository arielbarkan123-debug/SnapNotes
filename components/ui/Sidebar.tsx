'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useTheme } from 'next-themes'
import { Search, PanelLeftClose, Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const GlobalSearch = dynamic(() => import('@/components/search/GlobalSearch'), { ssr: false })

interface SidebarProps {
  userEmail?: string
  userName?: string
  isAdmin?: boolean
}

export default function Sidebar({ userEmail, userName, isAdmin }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('common')
  const currentLocale = useLocale()
  const { setTheme, resolvedTheme } = useTheme()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const displayName = userName || userEmail?.split('@')[0] || 'User'
  const initials = displayName.charAt(0).toUpperCase()

  // Prevent hydration mismatch for theme + restore sidebar state
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') {
      setIsCollapsed(true)
    }
  }, [])

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev
      localStorage.setItem('sidebar-collapsed', String(next))
      document.documentElement.setAttribute('data-sidebar-collapsed', String(next))
      return next
    })
  }, [])

  // Sync collapsed state to document for CSS
  useEffect(() => {
    document.documentElement.setAttribute('data-sidebar-collapsed', String(isCollapsed))
  }, [isCollapsed])

  // Prefetch all navigation routes on mount
  useEffect(() => {
    const routes = ['/dashboard', '/review', '/practice', '/homework', '/progress', '/exams', '/study-plan', '/prepare', '/settings']
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

  // Cmd+K / Ctrl+K keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } catch {
      setIsLoggingOut(false)
    }
  }

  const toggleLanguage = () => {
    const newLocale = currentLocale === 'en' ? 'he' : 'en'
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000;samesite=lax`
    router.refresh()
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/')

  const navItems = [
    { href: '/dashboard', icon: '🏠', label: t('nav.dashboard'), active: pathname === '/dashboard' },
    { href: '/review', icon: '🧠', label: t('nav.review'), active: isActive('/review') },
    { href: '/practice', icon: '🎯', label: t('nav.practice'), active: isActive('/practice') },
    { href: '/homework', icon: '📝', label: t('nav.homework'), active: isActive('/homework') },
    { href: '/exams', icon: '📋', label: t('nav.exams'), active: isActive('/exams') },
    { href: '/prepare', icon: '📖', label: t('nav.prepare'), active: isActive('/prepare') },
    { href: '/study-plan', icon: '📅', label: t('nav.studyPlan'), active: isActive('/study-plan') },
    { href: '/progress', icon: '📊', label: t('nav.progress'), active: isActive('/progress') },
    { href: '/settings', icon: '⚙️', label: t('nav.settings'), active: isActive('/settings') },
  ]

  if (isAdmin) {
    navItems.push({ href: '/analytics', icon: '🔒', label: t('nav.admin'), active: isActive('/analytics') })
  }

  return (
    <>
      {/* Desktop Sidebar - Expanded */}
      <aside
        className={`hidden md:flex fixed inset-y-0 start-0 z-50 w-[250px] flex-col sidebar transition-transform duration-300 ease-in-out ${
          isCollapsed ? '-translate-x-full rtl:translate-x-full' : 'translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full py-7 px-4">
          {/* Logo + Collapse Button */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/dashboard" className="flex items-center gap-3 px-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-rose-500 flex items-center justify-center">
                <span className="text-white text-lg">📚</span>
              </div>
              <span className="text-xl font-extrabold gradient-text">NoteSnap</span>
            </Link>
            <button
              onClick={toggleCollapsed}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
              aria-label="Close sidebar"
            >
              <PanelLeftClose className="w-5 h-5 rtl:scale-x-[-1]" />
            </button>
          </div>

          {/* Search Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-white/80 dark:hover:bg-white/10 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm">{t('nav.search')}</span>
            <kbd className="ms-auto text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">⌘K</kbd>
          </button>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-nav-item ${item.active ? 'active' : ''}`}
              >
                <span className="w-7 text-center text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Bottom Section */}
          <div className="pt-4 mt-4 border-t border-gray-200/50 dark:border-white/10 space-y-2">
            {/* Theme Toggle */}
            {mounted && (
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-medium transition-colors"
              >
                <span>{resolvedTheme === 'dark' ? '☀️' : '🌙'}</span>
                <span className="text-sm">
                  {resolvedTheme === 'dark' ? t('sidebar.lightMode') : t('sidebar.darkMode')}
                </span>
              </button>
            )}

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl hover:bg-white/50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 transition-colors"
            >
              <span>{currentLocale === 'en' ? '🇮🇱' : '🇺🇸'}</span>
              <span className="text-sm">{currentLocale === 'en' ? 'עברית' : 'English'}</span>
            </button>

            {/* User Info & Logout */}
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/30 dark:bg-white/5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-rose-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{displayName}</p>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-medium disabled:opacity-50"
                >
                  {isLoggingOut ? t('auth.loggingOut') : t('auth.logOut')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Desktop Collapsed - Hamburger Button */}
      <button
        onClick={toggleCollapsed}
        className={`hidden md:flex fixed top-5 start-5 z-50 items-center justify-center w-10 h-10 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border border-gray-200/50 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 ${
          isCollapsed ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
        }`}
        aria-label="Open sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Header Bar */}
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl shadow-sm md:hidden">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-rose-500 flex items-center justify-center">
              <span className="text-white text-sm">📚</span>
            </div>
            <span className="text-lg font-bold gradient-text">NoteSnap</span>
          </Link>

          {/* Mobile Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400"
              aria-label={t('nav.search')}
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              aria-label={t('nav.toggleMenu')}
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
        className={`fixed top-14 start-0 bottom-0 z-50 w-[85vw] max-w-[280px] bg-white dark:bg-gray-800 shadow-xl md:hidden transform transition-transform duration-300 ease-out ${
          isMobileMenuOpen ? 'translate-x-0 rtl:-translate-x-0' : '-translate-x-full rtl:translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* User Info */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-rose-500 flex items-center justify-center avatar-glow">
                <span className="text-white font-semibold text-lg">{initials}</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{displayName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{userEmail}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                  item.active
                    ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="w-6 text-center text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}

            {/* Theme & Language */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-1">
              {mounted && (
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full transition-colors"
                >
                  <span className="w-6 text-center text-lg">{resolvedTheme === 'dark' ? '☀️' : '🌙'}</span>
                  <span>{resolvedTheme === 'dark' ? t('sidebar.lightMode') : t('sidebar.darkMode')}</span>
                </button>
              )}
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full transition-colors"
              >
                <span className="w-6 text-center">{currentLocale === 'en' ? '🇮🇱' : '🇺🇸'}</span>
                <span>{currentLocale === 'en' ? 'עברית' : 'English'}</span>
              </button>
            </div>
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
              {isLoggingOut ? t('auth.loggingOut') : t('auth.logOut')}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl border-t border-gray-200 dark:border-gray-700 md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-14 xs:h-16">
          <BottomNavLink href="/dashboard" icon="🏠" label={t('nav.dashboard')} active={pathname === '/dashboard'} />
          <BottomNavLink href="/review" icon="🧠" label={t('nav.review')} active={isActive('/review')} />
          <BottomNavLink href="/practice" icon="🎯" label={t('nav.practice')} active={isActive('/practice')} />
          <BottomNavLink href="/homework" icon="📝" label={t('nav.homework')} active={isActive('/homework')} />
          <BottomNavLink href="/prepare" icon="📖" label={t('nav.prepare')} active={isActive('/prepare')} />
          <BottomNavLink href="/progress" icon="📊" label={t('nav.progress')} active={isActive('/progress')} />
        </div>
      </nav>

      {/* Spacer for bottom nav */}
      <div className="h-14 xs:h-16 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />

      {/* Global Search */}
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  )
}

// Bottom nav link component
function BottomNavLink({ href, icon, label, active }: { href: string; icon: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-0.5 px-2 xs:px-3 py-1.5 min-w-[56px] xs:min-w-[64px] min-h-[44px] transition-colors ${
        active
          ? 'text-violet-600 dark:text-violet-400'
          : 'text-gray-500 dark:text-gray-400'
      }`}
    >
      <span className="text-lg xs:text-xl">{icon}</span>
      <span className="text-[10px] xs:text-xs font-medium truncate max-w-full">{label}</span>
    </Link>
  )
}
