import { createClient } from '@/lib/supabase/server'
import Header from '@/components/ui/Header'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header
        userEmail={user?.email}
        userName={user?.user_metadata?.name}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
