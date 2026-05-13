/**
 * ============================================================
 * DIRECTORY — Browse all workers
 * Route: /directory
 *
 * Server component: fetches every worker visible to the
 * resident (RLS scopes by society_id). The list itself + the
 * search/filter input live in a client island so we don't pay
 * round-trip cost on every keystroke.
 *
 * Worker rows are taps to /engagement/new?worker_id=… (stubbed
 * route for now — the dashboard's `Hire` flow lands here).
 * ============================================================
 */
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import WorkerList from './WorkerList'

export const dynamic = 'force-dynamic'

export type WorkerRow = {
  id: string
  full_name: string
  specialty: string
  daily_rate: number | null
  trust_score: number
  photo_url: string | null
  phone: string | null
}

export default async function DirectoryPage() {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Pull the resident's society_id off their profile so we only show local helpers.
  const { data: profile } = await supabase
    .from('profiles')
    .select('society_id')
    .eq('id', user.id)
    .single()

  // If society_id is missing for some reason, the RLS policy still scopes us;
  // we simply do not pre-filter on it.
  let query = supabase
    .from('workers')
    .select('id, full_name, specialty, daily_rate, trust_score, photo_url, phone')
    .order('trust_score', { ascending: false })

  if (profile?.society_id) {
    query = query.eq('society_id', profile.society_id)
  }

  const { data: workers } = await query.returns<WorkerRow[]>()

  return (
    <main className="min-h-screen bg-neutral-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-5 pt-6 pb-4">
        <h1 className="text-2xl font-semibold text-neutral-900">Directory</h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          {workers?.length ?? 0} helpers near you
        </p>
      </header>

      <section className="px-5 mt-5">
        <WorkerList workers={workers ?? []} />
      </section>
    </main>
  )
}
