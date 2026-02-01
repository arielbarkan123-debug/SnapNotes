import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminNav from '@/components/admin/AdminNav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.log('[Admin] No user found, redirecting to login')
    redirect('/login')
  }

  console.log('[Admin] User found:', user.id, user.email)

  // Use service client to bypass RLS for admin check
  const serviceClient = createServiceClient()
  const { data: adminUser, error } = await serviceClient
    .from('admin_users')
    .select('id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  console.log('[Admin] Admin check result:', { adminUser, error })

  if (!adminUser) {
    console.log('[Admin] Not an admin, redirecting to dashboard')
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Admin Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {user.email}
              </span>
              <span className="px-2 py-1 text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded">
                {adminUser.role}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-[calc(100vh-4rem)] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <AdminNav />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
