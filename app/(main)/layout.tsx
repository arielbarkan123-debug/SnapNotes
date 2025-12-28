import { Suspense } from 'react'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import Header from '@/components/ui/Header'
import NavigationProgress from '@/components/ui/NavigationProgress'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Check if user is admin
  let isAdmin = false
  if (user) {
    const serviceClient = createServiceClient()
    const { data: adminUser } = await serviceClient
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single()
    isAdmin = !!adminUser
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <Header
        userEmail={user?.email}
        userName={user?.user_metadata?.name}
        isAdmin={isAdmin}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
