/**
 * ============================================================
 * WORKER PROFILE — Account, bio, rate, payment info
 * Route: /worker-profile
 *
 * Server component reads the workers row linked to the signed-in
 * user (workers.auth_id = auth.uid()). The form itself is a
 * client island so we can update + show toast-style status.
 * ============================================================
 */
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import WorkerProfileForm from './WorkerProfileForm'
import LogoutButton from '../profile/LogoutButton'
import DeleteAccountButton from '../profile/DeleteAccountButton'

export const dynamic = 'force-dynamic'

type WorkerSelf = {
  id: string
  full_name: string
  specialty: string
  bio: string | null
  daily_rate: number | null
  photo_url: string | null
  upi_id: string | null
  phone: string | null
}

export default async function WorkerProfilePage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'worker') redirect('/profile')

  const { data: worker } = await supabase
    .from('workers')
    .select('id, full_name, specialty, bio, daily_rate, photo_url, upi_id, phone')
    .eq('auth_id', user.id)
    .maybeSingle<WorkerSelf>()

  return (
    <main className="min-h-screen bg-neutral-50 pb-24">
      <header className="bg-white border-b border-neutral-200 px-5 pt-7 pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">My Account</h1>
        <p className="mt-0.5 text-xs text-neutral-500">Helper profile · {user.email}</p>
      </header>

      <section className="px-5 mt-5 space-y-5">
        <WorkerProfileForm worker={worker} />

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Session</p>
          <div className="mt-3 space-y-3">
            <LogoutButton />
            <DeleteAccountButton />
          </div>
        </div>

        <p className="text-center text-[11px] text-neutral-400">Society Helper · v1.0</p>
      </section>
    </main>
  )
}
