/**
 * Authenticated layout — wraps everything under app/(app)/.
 * Guards: redirects to /login if no session, or /onboarding if the
 * profile hasn't been completed yet. Passes the profile role down to
 * BottomNav so the tabs adapt to resident vs worker users.
 */
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile?.full_name) redirect('/onboarding')

  return (
    <>
      {children}
      <BottomNav role={(profile?.role as 'resident' | 'worker' | 'admin') ?? 'resident'} />
    </>
  )
}
