/**
 * Worker Dashboard — Modern UI (Urban Company / Uber style).
 * Server component; parent passes profile as prop.
 */
import Link from 'next/link'
import {
  IndianRupee, CalendarCheck, BadgeIndianRupee,
  Briefcase, ChevronRight, MapPin, TrendingUp,
} from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'

type WorkerSelf = {
  id: string
  full_name: string
  specialty: string
  daily_rate: number | null
  society_id: string | null
  photo_url: string | null
}

type EngagementRow = {
  id: string
  monthly_salary: number
  status: string
  employer: { full_name: string | null; flat_number: string | null } | null
}

type PaymentRow = { amount: number; status: string; created_at: string }

type JobRow = {
  id: string
  specialty: string
  description: string | null
  offered_salary: number | null
  created_at: string
  employer: { full_name: string | null; flat_number: string | null } | null
}

export default async function WorkerDashboard({
  userId,
  profile,
}: {
  userId: string
  profile: { full_name: string | null } | null
}) {
  const supabase = createServerClient()

  const { data: worker } = await supabase
    .from('workers')
    .select('id, full_name, specialty, daily_rate, society_id, photo_url')
    .eq('auth_id', userId)
    .maybeSingle<WorkerSelf>()

  const { data: engagements } = await supabase
    .from('engagements')
    .select(`
      id, monthly_salary, status,
      employer:profiles!engagements_employer_id_fkey ( full_name, flat_number )
    `)
    .eq('worker_id', worker?.id ?? '00000000-0000-0000-0000-000000000000')
    .eq('status', 'active')
    .returns<EngagementRow[]>()

  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const startIso   = monthStart.toISOString()
  const monthLabel = monthStart.toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  const engIds = (engagements ?? []).map(e => e.id)
  let monthEarnings = 0
  if (engIds.length) {
    const { data: pays } = await supabase
      .from('payments')
      .select('amount, status, created_at')
      .in('engagement_id', engIds)
      .gte('created_at', startIso)
      .returns<PaymentRow[]>()
    monthEarnings = (pays ?? [])
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount ?? 0), 0)
  }

  let jobs: JobRow[] = []
  if (worker?.society_id) {
    const { data } = await supabase
      .from('job_postings')
      .select(`
        id, specialty, description, offered_salary, created_at,
        employer:profiles!job_postings_employer_id_fkey ( full_name, flat_number )
      `)
      .eq('society_id', worker.society_id)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .returns<JobRow[]>()
    jobs = (data ?? []).filter(j => !worker.specialty || j.specialty === worker.specialty)
  }

  const displayName = profile?.full_name ?? worker?.full_name ?? 'Helper'
  const firstName   = displayName.split(' ')[0]
  const initials    = displayName.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()

  return (
    <main className="min-h-screen bg-slate-50 pb-24">

      {/* ── Gradient header ── */}
      <header className="bg-gradient-to-br from-emerald-600 to-teal-500 px-5 pt-14 pb-16">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-xs mb-0.5">Namaste 🙏</p>
            <h1 className="text-2xl font-bold text-white">{firstName}</h1>
            {worker?.specialty && (
              <p className="text-emerald-100 text-xs mt-0.5 capitalize">
                {worker.specialty.replace('_', ' ')}
                {worker.daily_rate ? ` · ₹${worker.daily_rate}/day` : ''}
              </p>
            )}
          </div>
          <div className="h-11 w-11 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center">
            <span className="text-white font-bold text-sm">{initials}</span>
          </div>
        </div>
      </header>

      {/* ── Earnings card (overlaps header) ── */}
      <section className="px-5 -mt-10">
        <div className="rounded-3xl bg-white shadow-lg shadow-emerald-50 border border-slate-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                {monthLabel} · Earned
              </p>
              <p className="mt-1 text-3xl font-bold text-slate-900 flex items-center gap-0.5">
                <IndianRupee size={22} strokeWidth={2.5} className="text-emerald-600" />
                {monthEarnings.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="space-y-2.5">
              <StatPill icon={CalendarCheck} value={engagements?.length ?? 0} label="Homes" color="emerald" />
              <StatPill icon={TrendingUp} value={jobs.length} label="Openings" color="emerald" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Active Engagements ── */}
      <section className="px-5 mt-7">
        <h2 className="mb-4 text-base font-bold text-slate-900">Active engagements</h2>
        {!engagements?.length ? (
          <EmptyCard text="No active homes yet. Check the openings below." />
        ) : (
          <ul className="space-y-3">
            {engagements.map(e => (
              <li key={e.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">
                      {e.employer?.full_name ?? 'Resident'}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin size={11} />
                      Flat {e.employer?.flat_number ?? '—'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Monthly</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">
                      ₹{e.monthly_salary.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Available openings ── */}
      <section className="px-5 mt-7">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Available openings</h2>
          <span className="text-[11px] uppercase tracking-wider font-medium text-slate-400">
            {jobs.length} {jobs.length === 1 ? 'match' : 'matches'}
          </span>
        </div>

        {jobs.length === 0 ? (
          <EmptyCard text="No openings right now. New ones appear the moment they're posted." />
        ) : (
          <ul className="space-y-3">
            {jobs.map(j => (
              <li key={j.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 capitalize">
                      <span className="h-7 w-7 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                        <Briefcase size={13} className="text-emerald-600" />
                      </span>
                      {j.specialty.replace('_', ' ')} needed
                    </p>
                    <p className="mt-1.5 text-xs text-slate-500 ml-9">
                      {j.employer?.full_name ?? 'Resident'}
                      {j.employer?.flat_number ? ` · Flat ${j.employer.flat_number}` : ''}
                    </p>
                    {j.description && (
                      <p className="mt-2 ml-9 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {j.description}
                      </p>
                    )}
                  </div>
                  {j.offered_salary != null && (
                    <div className="shrink-0">
                      <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        <BadgeIndianRupee size={12} className="mr-0.5" />
                        ₹{j.offered_salary.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Incomplete worker profile warning ── */}
      {!worker && (
        <section className="mx-5 mt-7 rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-800">Complete your helper profile</p>
          <p className="mt-1 text-xs text-amber-700 leading-relaxed">
            We couldn't find a worker record linked to your account.{' '}
            <Link href="/worker-profile" className="font-bold underline">
              Complete it →
            </Link>
          </p>
        </section>
      )}
    </main>
  )
}

/* ── Sub-components ── */

function StatPill({
  icon: Icon, value, label, color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  value: number; label: string; color: 'violet' | 'emerald'
}) {
  const bg  = color === 'emerald' ? 'bg-emerald-50'  : 'bg-violet-50'
  const ico = color === 'emerald' ? 'text-emerald-600' : 'text-violet-600'
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-600">
      <span className={`h-6 w-6 rounded-lg ${bg} flex items-center justify-center`}>
        <Icon size={12} className={ico} />
      </span>
      <span className="font-semibold text-slate-900">{value}</span>
      <span className="text-slate-400">{label}</span>
    </div>
  )
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
      <p className="text-sm text-slate-500 leading-relaxed">{text}</p>
    </div>
  )
}
