/**
 * Authenticated layout — wraps everything under app/(app)/.
 * Redirects to /login if no session, otherwise renders the page + BottomNav.
 */
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <>
      {children}
      <BottomNav />
    </>
  )
}
