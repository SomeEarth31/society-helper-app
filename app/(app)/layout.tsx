/**
 * Authenticated layout — guards, fetches unread counts, passes to BottomNav.
 */
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('full_name, role').eq('id', user.id).single()

  if (!profile?.full_name) redirect('/onboarding')

  // Unread messages count
  let unreadMessages = 0
  try {
    const { data: counts } = await supabase.rpc('get_unread_counts')
    unreadMessages = counts?.[0]?.messages ?? 0
  } catch {}

  // Pending hire requests count (workers only)
  let pendingHireRequests = 0
  if (profile?.role === 'worker') {
    try {
      const { data: workerRow } = await supabase
        .from('workers').select('id').eq('auth_id', user.id).maybeSingle()
      if (workerRow?.id) {
        const { count } = await supabase
          .from('hire_requests')
          .select('id', { count: 'exact', head: true })
          .eq('worker_id', workerRow.id)
          .eq('status', 'pending')
        pendingHireRequests = count ?? 0
      }
    } catch {}
  }

  return (
    <>
      {children}
      <BottomNav
        role={(profile?.role as 'resident' | 'worker' | 'admin') ?? 'resident'}
        unreadMessages={unreadMessages}
        pendingHireRequests={pendingHireRequests}
      />
    </>
  )
}
