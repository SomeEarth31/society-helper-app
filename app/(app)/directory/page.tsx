/**
 * DIRECTORY — Route: /directory
 *
 * Residents → see the worker directory (WorkerList)
 * Workers   → see open job postings (JobList)
 */
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import WorkerList from './WorkerList'
import JobList, { type JobRow } from './JobList'

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('society_id, role')
    .eq('id', user.id)
    .single()

  /* ── WORKER view: show job postings ── */
  if (profile?.role === 'worker') {
    // Find this user's worker row to know their specialty
    const { data: workerRow } = await supabase
      .from('workers')
      .select('specialty')
      .eq('auth_id', user.id)
      .maybeSingle()

    let jobsQuery = supabase
      .from('job_postings')
      .select(`
        id, specialty, description, offered_salary, created_at,
        employer:profiles!job_postings_employer_id_fkey ( full_name, flat_number )
      `)
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    if (profile.society_id) {
      jobsQuery = jobsQuery.eq('society_id', profile.society_id)
    }

    const { data: jobs } = await jobsQuery.returns<JobRow[]>()

    return (
      <main className="min-h-screen bg-slate-50 pb-24">
        <header className="bg-white border-b border-slate-100 px-5 pt-14 pb-4">
          <h1 className="text-2xl font-bold text-slate-900">Job Openings</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {jobs?.length ?? 0} openings in your society
          </p>
        </header>
        <section className="px-5 mt-5">
          <JobList
            jobs={jobs ?? []}
            workerSpecialty={workerRow?.specialty ?? null}
          />
        </section>
      </main>
    )
  }

  /* ── RESIDENT view: show worker directory ── */
  let workersQuery = supabase
    .from('workers')
    .select('id, full_name, specialty, daily_rate, trust_score, photo_url, phone')
    .order('trust_score', { ascending: false })

  if (profile?.society_id) {
    workersQuery = workersQuery.eq('society_id', profile.society_id)
  }

  const { data: workers } = await workersQuery.returns<WorkerRow[]>()

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-100 px-5 pt-14 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Directory</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {workers?.length ?? 0} helpers near you
        </p>
      </header>
      <section className="px-5 mt-5">
        <WorkerList workers={workers ?? []} />
      </section>
    </main>
  )
}
