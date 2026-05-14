/**
 * ============================================================
 * DASHBOARD — role-aware entry point
 * Route: /
 *
 * Reads the signed-in profile and renders either the resident
 * (employer) dashboard or the worker dashboard. The actual UI
 * lives in ResidentDashboard.tsx / WorkerDashboard.tsx — this
 * file only does auth + routing.
 * ============================================================
 */
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import ResidentDashboard from './ResidentDashboard'
import WorkerDashboard from './WorkerDashboard'

export const dynamic = 'force-dynamic'

type Profile = {
  full_name: string | null
  flat_number: string | null
  role: 'resident' | 'worker' | 'admin' | null
}

export default async function DashboardPage() {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, flat_number, role')
    .eq('id', user.id)
    .single<Profile>()

  if (!profile?.full_name) redirect('/onboarding')

  if (profile.role === 'worker') {
    return <WorkerDashboard userId={user.id} profile={profile} />
  }
  return <ResidentDashboard userId={user.id} profile={profile} />
}
