/**
 * /directory — Role-aware:
 *   Residents → worker directory
 *   Workers   → job board (open postings they can apply to)
 */
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import WorkerList from './WorkerList'
import JobBoard from './JobBoard'

export const dynamic = 'force-dynamic'

export type WorkerRow = {
  id: string
  full_name: string
  specialty: string
  daily_rate: number | null
  trust_score: number
  photo_url: string | null
  is_available: boolean
}

export type JobRow = {
  id: string
  title: string
  specialty: string
  description: string
  schedule: string | null
  offered_salary: number | null
  created_at: string
  expires_at: string
  society_id: string | null
  employer: {
    full_name: string | null
    flat_number: string | null
    trust_score: number | null
    resident_reviews: { count: number }[]
    societies: { name: string } | null
  } | null
  my_application?: { id: string; status: string } | null
}

export default async function DirectoryPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('society_id, role').eq('id', user.id).single()

  /* ── WORKER: job board ── */
  if (profile?.role === 'worker') {
    const { data: workerRow } = await supabase
      .from('workers').select('id, specialty, society_id').eq('auth_id', user.id).maybeSingle()

    // Fetch this worker's societies for client-side sorting
    const { data: wSocieties } = workerRow
      ? await supabase.from('worker_societies').select('society_id').eq('worker_id', workerRow.id)
      : { data: [] }
    const workerSocietyIds = (wSocieties ?? []).map(ws => ws.society_id)
    if (workerSocietyIds.length === 0 && workerRow?.society_id) {
      workerSocietyIds.push(workerRow.society_id)
    }

    // RLS (jobpost_worker_read) now allows all authenticated workers to see all open jobs.
    const { data: jobs } = await supabase
      .from('job_postings')
      .select(`
        id, title, specialty, description, schedule, offered_salary, created_at, expires_at, society_id,
        employer:profiles!job_postings_employer_id_fkey(full_name, flat_number, trust_score, resident_reviews(count), societies(name))
      `)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .returns<Omit<JobRow, 'my_application'>[]>()

    // Fetch this worker's applications
    let jobsWithApps: JobRow[] = []
    if (workerRow?.id && jobs) {
      const { data: myApps } = await supabase
        .from('job_applications')
        .select('id, job_posting_id, status')
        .eq('worker_id', workerRow.id)

      const appMap = Object.fromEntries((myApps ?? []).map(a => [a.job_posting_id, a]))
      jobsWithApps = jobs.map(j => ({ ...j, my_application: appMap[j.id] ?? null }))
    } else {
      jobsWithApps = (jobs ?? []).map(j => ({ ...j, my_application: null }))
    }

    return (
      <main className="min-h-screen bg-slate-50 pb-28">
        <header className="bg-white border-b border-slate-100 px-5 pt-14 pb-4 sticky top-0 z-10">
          <h1 className="text-2xl font-black text-slate-900">Find Jobs</h1>
          <p className="text-xs text-slate-400 mt-0.5">{jobsWithApps.length} openings available</p>
        </header>
        <section className="px-5 mt-5">
          <JobBoard
            jobs={jobsWithApps}
            workerSpecialty={workerRow?.specialty ?? null}
            workerId={workerRow?.id ?? null}
            workerSocietyIds={workerSocietyIds}
          />
        </section>
      </main>
    )
  }

  /* ── RESIDENT: worker directory ── */
  const residentSocietyId = profile?.society_id ?? null

  // Fetch all active workers; RLS now allows all authenticated users to see all workers.
  const { data: workers } = await supabase
    .from('workers')
    .select('id, full_name, specialty, daily_rate, trust_score, photo_url, is_available, worker_societies(society_id)')
    .eq('is_active', true)
    .order('trust_score', { ascending: false })

  // Determine "my society" workers vs "other society" workers.
  // A worker is "in society" if:
  //   - They have no worker_societies entries (visible to all), OR
  //   - They have an entry matching the resident's society
  const allWorkers = (workers ?? []).map(w => ({
    id:           w.id,
    full_name:    w.full_name,
    specialty:    w.specialty,
    daily_rate:   w.daily_rate,
    trust_score:  w.trust_score,
    photo_url:    w.photo_url,
    is_available: w.is_available,
  })) as WorkerRow[]

  const workerSocietyMap: Record<string, string[]> = {}
  for (const w of (workers ?? [])) {
    workerSocietyMap[w.id] = ((w as any).worker_societies ?? []).map((ws: any) => ws.society_id)
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-28">
      <header className="bg-white border-b border-slate-100 px-5 pt-14 pb-4 sticky top-0 z-10">
        <h1 className="text-2xl font-black text-slate-900">Directory</h1>
        <p className="text-xs text-slate-400 mt-0.5">{allWorkers.length} helpers available</p>
      </header>
      <section className="px-5 mt-5">
        <WorkerList
          workers={allWorkers}
          residentSocietyId={residentSocietyId}
          workerSocietyMap={workerSocietyMap}
        />
      </section>
    </main>
  )
}
