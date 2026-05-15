/**
 * /jobs/[id]/applicants — Resident reviews who applied and accepts/rejects
 */
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { ArrowLeft, Star, IndianRupee, CheckCircle2, XCircle, Clock } from 'lucide-react'
import ApplicantActions from './ApplicantActions'

export const dynamic = 'force-dynamic'

export default async function ApplicantsPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: job } = await supabase
    .from('job_postings')
    .select('id, title, specialty, status, employer_id')
    .eq('id', params.id)
    .single()

  if (!job || job.employer_id !== user.id) notFound()

  const { data: applications } = await supabase
    .from('job_applications')
    .select(`
      id, cover_note, status, applied_at,
      worker:workers(id, full_name, specialty, trust_score, daily_rate, photo_url, bio)
    `)
    .eq('job_posting_id', params.id)
    .order('applied_at', { ascending: false })

  return (
    <main className="min-h-screen bg-slate-50 pb-28">
      <header className="bg-white px-5 pt-14 pb-4 border-b border-slate-100 sticky top-0 z-10">
        <Link href="/jobs" className="flex items-center gap-2 text-slate-500 text-sm mb-3 min-h-[36px]">
          <ArrowLeft size={16} /> My jobs
        </Link>
        <h1 className="text-xl font-black text-slate-900 truncate">{job.title}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{(applications ?? []).length} applicant{(applications ?? []).length !== 1 ? 's' : ''}</p>
      </header>

      <div className="px-5 mt-5">
        {(!applications || applications.length === 0) ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
            <Clock size={28} className="text-slate-300 mx-auto mb-3" />
            <p className="font-black text-slate-500">No applicants yet</p>
            <p className="text-xs text-slate-400 mt-1">Workers will appear here once they apply</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {applications.map((app: any) => (
              <li key={app.id} className="rounded-3xl bg-white border border-slate-100 shadow-sm p-4">
                <div className="flex items-center gap-3 mb-3">
                  <WorkerAvatar name={app.worker?.full_name ?? '?'} url={app.worker?.photo_url ?? null} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-slate-900 text-[15px] truncate">{app.worker?.full_name}</p>
                      <AppStatusPill status={app.status} />
                    </div>
                    <p className="text-xs text-slate-400 capitalize mt-0.5">
                      {(app.worker?.specialty ?? '').replace(/_/g, ' ')}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs">
                        <Star size={11} className="text-amber-400 fill-amber-400" />
                        <span className="font-black text-slate-700">{app.worker?.trust_score?.toFixed(1) ?? '—'}</span>
                      </span>
                      {app.worker?.daily_rate && (
                        <span className="flex items-center gap-0.5 text-xs text-slate-500">
                          <IndianRupee size={11} />
                          <span className="font-bold">{app.worker.daily_rate.toLocaleString('en-IN')}</span>
                          <span className="text-slate-300">/day</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {app.cover_note && (
                  <div className="mb-3 rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                    <p className="text-xs text-slate-600 leading-relaxed">"{app.cover_note}"</p>
                  </div>
                )}

                {app.status === 'pending' && job.status === 'open' && (
                  <ApplicantActions
                    applicationId={app.id}
                    workerId={app.worker?.id}
                    jobPostingId={params.id}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}

function WorkerAvatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt={name} className="h-14 w-14 rounded-2xl object-cover shrink-0" />
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="h-14 w-14 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center text-base font-black shrink-0">
      {initials}
    </div>
  )
}

function AppStatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:  { label: 'Applied',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    accepted: { label: 'Accepted',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    rejected: { label: 'Rejected',  cls: 'bg-red-50 text-red-600 border-red-200' },
    withdrawn:{ label: 'Withdrawn', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  }
  const m = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-500 border-slate-200' }
  return <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${m.cls}`}>{m.label}</span>
}
