import { Suspense } from 'react'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import Sidebar from '@/components/ui/Sidebar'
import NavigationProgress from '@/components/ui/NavigationProgress'
import OfflineIndicator from '@/components/ui/OfflineIndicator'

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
      .maybeSingle()
    isAdmin = !!adminUser
  }

  return (
    <div className="min-h-screen aurora-bg">
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <Sidebar
        userEmail={user?.email}
        userName={user?.user_metadata?.name}
        isAdmin={isAdmin}
      />
      <main className="sidebar-main min-h-screen">
        {children}
      </main>
      <OfflineIndicator />
    </div>
  )
}
