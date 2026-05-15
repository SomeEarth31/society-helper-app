'use client'
/**
 * Worker job board — browse open postings, apply / withdraw.
 * Society-aware ordering: specialty+society match first, then others.
 */
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IndianRupee, Clock, Briefcase, CheckCircle2, Loader2, SlidersHorizontal, Star, ChevronDown } from 'lucide-react'
import type { JobRow } from './page'

const EMOJI: Record<string, string> = {
  maid: '🧹', cook: '👨‍🍳', cleaner: '🫧', car_washer: '🚗',
  caretaker: '🤲', gardener: '🌿', other: '⚙️',
}

export default function JobBoard({
  jobs, workerSpecialty, workerId, workerSocietyIds = [],
}: {
  jobs: JobRow[]
  workerSpecialty: string | null
  workerId: string | null
  workerSocietyIds?: string[]
}) {
  const router   = useRouter()
  const supabase = createClient()
  const [showOtherSocieties, setShowOtherSocieties] = useState(false)
  const [applying, setApplying] = useState<string | null>(null)
  const [localJobs, setLocalJobs] = useState(jobs)

  const hasSociety = workerSocietyIds.length > 0

  // Partition and sort jobs
  const { primaryJobs, otherJobs } = useMemo(() => {
    const primary: JobRow[] = []
    const other:   JobRow[] = []

    for (const job of localJobs) {
      const inSociety    = hasSociety && workerSocietyIds.includes(job.society_id ?? '')
      const matchSpec    = job.specialty === workerSpecialty

      if (hasSociety) {
        // Society worker: in-society jobs are "primary", out-of-society are "other"
        if (inSociety) primary.push(job)
        else other.push(job)
      } else {
        // Visible-to-all: specialty match is "primary", rest is "other"
        if (matchSpec) primary.push(job)
        else other.push(job)
      }
    }

    // Sort primary: specialty match first
    const sort = (a: JobRow, b: JobRow) => {
      const aSpec = a.specialty === workerSpecialty ? -1 : 0
      const bSpec = b.specialty === workerSpecialty ? -1 : 0
      return aSpec - bSpec
    }

    return { primaryJobs: primary.sort(sort), otherJobs: other.sort(sort) }
  }, [localJobs, workerSocietyIds, workerSpecialty, hasSociety])

  async function handleApply(jobId: string) {
    if (!workerId) return
    setApplying(jobId)
    const { data } = await supabase.from('job_applications').upsert({
      job_posting_id: jobId,
      worker_id: workerId,
      status: 'pending',
      resolved_at: null,
    }, { onConflict: 'job_posting_id,worker_id' }).select().single()
    setApplying(null)
    if (data) {
      setLocalJobs(prev => prev.map(j =>
        j.id === jobId ? { ...j, my_application: { id: data.id, status: 'pending' } } : j
      ))
      router.refresh()
    }
  }

  async function handleWithdraw(applicationId: string, jobId: string) {
    setApplying(jobId)
    await supabase.from('job_applications')
      .update({ status: 'withdrawn', resolved_at: new Date().toISOString() })
      .eq('id', applicationId)
    setApplying(null)
    setLocalJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, my_application: null } : j
    ))
    router.refresh()
  }

  if (localJobs.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
        <Briefcase size={28} className="text-slate-300 mx-auto mb-3" />
        <p className="font-black text-slate-500">No open jobs right now</p>
        <p className="text-xs text-slate-400 mt-1">Check back later — residents post new jobs regularly</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {primaryJobs.map(job => <JobCard key={job.id} job={job} workerSpecialty={workerSpecialty} applying={applying} onApply={handleApply} onWithdraw={handleWithdraw} />)}
      </ul>

      {otherJobs.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowOtherSocieties(v => !v)}
            className="w-full flex items-center justify-between gap-2 text-xs font-bold text-slate-500 px-1 py-2 border-t border-slate-200 pt-4"
          >
            <span>{hasSociety ? `${otherJobs.length} jobs from other societies` : `${otherJobs.length} other jobs`}</span>
            <ChevronDown size={14} className={`transition-transform ${showOtherSocieties ? 'rotate-180' : ''}`} />
          </button>
          {showOtherSocieties && (
            <ul className="space-y-3 opacity-80">
              {otherJobs.map(job => <JobCard key={job.id} job={job} workerSpecialty={workerSpecialty} applying={applying} onApply={handleApply} onWithdraw={handleWithdraw} />)}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function JobCard({
  job, workerSpecialty, applying, onApply, onWithdraw,
}: {
  job: JobRow
  workerSpecialty: string | null
  applying: string | null
  onApply: (id: string) => void
  onWithdraw: (appId: string, jobId: string) => void
}) {
  const isMatch   = job.specialty === workerSpecialty
  const applied   = job.my_application && job.my_application.status !== 'withdrawn'
  const isApplying = applying === job.id

  return (
    <li className={`rounded-3xl bg-white border shadow-sm p-4 ${isMatch ? 'border-emerald-200' : 'border-slate-100'}`}>
      {isMatch && (
        <div className="flex items-center gap-1.5 mb-2.5">
          <CheckCircle2 size={13} className="text-emerald-500" />
          <span className="text-[11px] font-bold text-emerald-600">Matches your specialty</span>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-2xl bg-slate-50 flex items-center justify-center text-2xl shrink-0">
          {EMOJI[job.specialty] ?? '⚙️'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-[15px] leading-snug">{job.title}</p>
          <p className="text-xs text-slate-400 capitalize mt-0.5">{job.specialty.replace(/_/g, ' ')}</p>
          {job.employer?.flat_number && (
            <p className="text-xs text-slate-400 mt-0.5">Flat {job.employer.flat_number}</p>
          )}
          <p className="text-xs mt-0.5">
            {job.employer?.trust_score != null
              ? <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                  <Star size={10} className="fill-amber-400 text-amber-400" />
                  {job.employer.trust_score.toFixed(1)}
                  <span className="text-slate-400 font-normal ml-0.5">
                    ({job.employer.resident_reviews?.[0]?.count ?? 0} votes)
                  </span>
                </span>
              : <span className="text-slate-400">Unrated resident</span>
            }
          </p>
        </div>
      </div>

      <p className="text-sm text-slate-600 mt-3 leading-relaxed line-clamp-2">{job.description}</p>

      <div className="flex items-center gap-4 mt-3">
        {job.schedule && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Clock size={11} /> {job.schedule}
          </span>
        )}
        {job.offered_salary && (
          <span className="flex items-center gap-0.5 text-xs font-bold text-slate-700">
            <IndianRupee size={11} />{job.offered_salary.toLocaleString('en-IN')}/mo
          </span>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100">
        {applied ? (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-600">
              <CheckCircle2 size={15} /> Applied
            </span>
            {job.my_application?.status === 'pending' && (
              <button onClick={() => onWithdraw(job.my_application!.id, job.id)}
                disabled={isApplying}
                className="text-xs text-slate-400 underline min-h-[36px]">
                Withdraw
              </button>
            )}
          </div>
        ) : (
          <button onClick={() => onApply(job.id)} disabled={isApplying || !true}
            className="w-full h-11 rounded-2xl bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-100 active:scale-95 transition disabled:opacity-40">
            {isApplying ? <Loader2 size={15} className="animate-spin" /> : 'Apply →'}
          </button>
        )}
      </div>
    </li>
  )
}
