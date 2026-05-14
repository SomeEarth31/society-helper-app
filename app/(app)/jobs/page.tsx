/**
 * /jobs — Resident: manage job postings + see applicants
 */
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { Plus, Users, Clock, CheckCircle2, XCircle, Briefcase } from 'lucide-react'

export const dynamic = 'force-dynamic'

type JobPosting = {
  id: string
  title: string
  specialty: string
  description: string
  schedule: string | null
  offered_salary: number | null
  status: string
  expires_at: string
  created_at: string
  _count?: { applications: number }
}

const SPECIALTY_EMOJI: Record<string, string> = {
  maid: '🧹', cook: '👨‍🍳', cleaner: '🫧', car_washer: '🚗',
  caretaker: '🤲', gardener: '🌿', other: '⚙️',
}

export default async function JobsPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role === 'worker') redirect('/directory')

  // Fetch resident's job postings with application counts
  const { data: jobs } = await supabase
    .from('job_postings')
    .select(`
      id, title, specialty, description, schedule,
      offered_salary, status, expires_at, created_at,
      job_applications(count)
    `)
    .eq('employer_id', user.id)
    .order('created_at', { ascending: false })

  const open    = (jobs ?? []).filter(j => j.status === 'open')
  const closed  = (jobs ?? []).filter(j => j.status !== 'open')

  return (
    <main className="min-h-screen bg-slate-50 pb-28">

      {/* Header */}
      <header className="bg-white px-5 pt-14 pb-4 border-b border-slate-100 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">My Jobs</h1>
            <p className="text-xs text-slate-400 mt-0.5">Post work, review applicants</p>
          </div>
          <Link href="/jobs/new"
            className="flex items-center gap-1.5 bg-violet-600 text-white text-[13px] font-bold px-4 py-2.5 rounded-2xl shadow-md shadow-violet-200 active:scale-95 transition">
            <Plus size={15} /> Post job
          </Link>
        </div>
      </header>

      <div className="px-5 mt-5 space-y-6">

        {/* Open jobs */}
        {open.length > 0 && (
          <section>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Open ({open.length})</p>
            <ul className="space-y-3">
              {open.map(job => (
                <JobCard key={job.id} job={job} />
              ))}
            </ul>
          </section>
        )}

        {/* Empty state */}
        {(jobs ?? []).length === 0 && (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
            <Briefcase size={28} className="text-slate-300 mx-auto mb-3" />
            <p className="font-black text-slate-500">No job postings yet</p>
            <p className="text-xs text-slate-400 mt-1 mb-5">Post your first job to find helpers</p>
            <Link href="/jobs/new"
              className="inline-flex items-center gap-2 bg-violet-600 text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-md shadow-violet-200">
              <Plus size={15} /> Post a job
            </Link>
          </div>
        )}

        {/* Closed jobs */}
        {closed.length > 0 && (
          <section>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Closed / Filled</p>
            <ul className="space-y-3">
              {closed.map(job => (
                <JobCard key={job.id} job={job} muted />
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  )
}

function JobCard({ job, muted = false }: { job: any; muted?: boolean }) {
  const appCount = job.job_applications?.[0]?.count ?? 0
  const emoji = SPECIALTY_EMOJI[job.specialty] ?? '⚙️'
  const expiresDate = new Date(job.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })

  return (
    <li className={`rounded-3xl bg-white border border-slate-100 shadow-sm p-4 ${muted ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-2xl bg-violet-50 flex items-center justify-center text-2xl shrink-0">
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-slate-900 text-[15px] truncate">{job.title}</p>
            <StatusPill status={job.status} />
          </div>
          <p className="text-xs text-slate-400 mt-0.5 capitalize">{job.specialty.replace(/_/g, ' ')}</p>
          {job.schedule && (
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Clock size={11} /> {job.schedule}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Users size={12} />
            <span className="font-bold text-slate-700">{appCount}</span>
            {appCount === 1 ? 'applicant' : 'applicants'}
          </span>
          {job.status === 'open' && (
            <span className="text-[11px] text-slate-400">Expires {expiresDate}</span>
          )}
        </div>
        {appCount > 0 && (
          <Link href={`/jobs/${job.id}/applicants`}
            className="text-xs font-bold text-violet-600 bg-violet-50 px-3 py-2 rounded-xl active:scale-95 transition">
            View applicants →
          </Link>
        )}
      </div>
    </li>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    open:      { label: 'Open',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    filled:    { label: 'Filled',   cls: 'bg-violet-50 text-violet-700 border-violet-200' },
    expired:   { label: 'Expired',  cls: 'bg-slate-100 text-slate-500 border-slate-200' },
    cancelled: { label: 'Cancelled',cls: 'bg-red-50 text-red-600 border-red-100' },
  }
  const m = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-500 border-slate-200' }
  return (
    <span className={`shrink-0 text-[10px] font-bold border px-2 py-0.5 rounded-full ${m.cls}`}>{m.label}</span>
  )
}
