/**
 * Worker Dashboard — Uber/Urban Company grade UI.
 * Server component.
 */
import Link from 'next/link'
import {
  IndianRupee, CalendarCheck, Briefcase,
  MapPin, TrendingUp, Bell,
} from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import { RateResidentButton } from '@/components/RateButtons'

type WorkerSelf = {
  id: string; full_name: string; specialty: string
  daily_rate: number | null; society_id: string | null; photo_url: string | null
}
type EngagementRow = {
  id: string; monthly_salary: number; status: string
  employer: {
    id: string
    full_name: string | null
    flat_number: string | null
    trust_score: number | null
    resident_reviews: { count: number }[]
  } | null
}
type PaymentRow = { amount: number; status: string; created_at: string }
type JobRow = {
  id: string; specialty: string; description: string | null
  offered_salary: number | null; created_at: string
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
    .select('id, monthly_salary, status, employer:profiles!engagements_employer_id_fkey ( id, full_name, flat_number, trust_score, resident_reviews(count) )')
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

  // Fetch attendance for the worker's active engagements
  let attendance: { engagement_id: string; date: string; status: string }[] = []
  if (engIds.length) {
    const { data: attData } = await supabase
      .from('attendance')
      .select('engagement_id, date, status')
      .in('engagement_id', engIds)
      .gte('date', startIso.slice(0, 10))
    attendance = attData ?? []
  }

  // Fetch all societies this worker is in (multi-society support)
  let jobs: JobRow[] = []
  if (worker) {
    const { data: wSocieties } = await supabase
      .from('worker_societies')
      .select('society_id')
      .eq('worker_id', worker.id)

    const societyIds = (wSocieties ?? []).map(ws => ws.society_id)
    // Fall back to the legacy workers.society_id if worker_societies is empty
    if (societyIds.length === 0 && worker.society_id) societyIds.push(worker.society_id)

    // Build query — visible-to-all workers (no societies) get ALL open jobs matching specialty
    let query = supabase
      .from('job_postings')
      .select('id, specialty, description, offered_salary, created_at, employer:profiles!job_postings_employer_id_fkey ( full_name, flat_number )')
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    if (societyIds.length > 0) {
      query = query.in('society_id', societyIds)
    }

    const { data } = await query.returns<JobRow[]>()
    jobs = (data ?? []).filter(j => !worker.specialty || j.specialty === worker.specialty)
  }

  // Pending hire requests count for badge
  let pendingHireCount = 0
  if (worker) {
    const { count } = await supabase
      .from('hire_requests')
      .select('id', { count: 'exact', head: true })
      .eq('worker_id', worker.id)
      .eq('status', 'pending')
    pendingHireCount = count ?? 0
  }

  const displayName = profile?.full_name ?? worker?.full_name ?? 'Helper'
  const firstName   = displayName.split(' ')[0]
  const initials    = displayName.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()

  return (
    <main className="min-h-screen bg-slate-50 pb-24">

      {/* ── Header ── */}
      <header className="bg-white px-5 pt-14 pb-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-1">
              {monthLabel}
            </p>
            <h1 className="text-2xl font-black text-slate-900">Hi, {firstName} 🙏</h1>
            {worker?.specialty && (
              <p className="text-xs text-slate-400 mt-0.5 capitalize">
                {worker.specialty.replace(/_/g, ' ')}
                {worker.daily_rate ? ` · ₹${worker.daily_rate}/day` : ''}
              </p>
            )}
          </div>
          <Link
            href="/worker-profile"
            className="h-12 w-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-200"
          >
            <span className="text-white font-black text-sm">{initials}</span>
          </Link>
        </div>
      </header>

      {/* ── Earnings card ── */}
      <section className="px-5 mt-5">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-500 p-5 shadow-xl shadow-emerald-200">
          <p className="text-emerald-100 text-[11px] font-bold uppercase tracking-widest">
            Earned this month
          </p>
          <p className="text-4xl font-black text-white mt-2 flex items-center gap-1">
            <IndianRupee size={26} strokeWidth={2.5} />
            {monthEarnings.toLocaleString('en-IN')}
          </p>
          <Link
            href="/hire-requests"
            className="mt-4 w-full h-12 bg-white/20 border border-white/30 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-white relative"
          >
            <Bell size={18} />
            Hire Requests
            {pendingHireCount > 0 && (
              <span className="absolute top-2 right-4 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center px-1">
                {pendingHireCount > 9 ? '9+' : pendingHireCount}
              </span>
            )}
          </Link>
          <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-5">
            <EChip icon={CalendarCheck} value={engagements?.length ?? 0} label="Homes" />
            <EChip icon={Briefcase}     value={jobs.length}               label="Openings" />
            <EChip icon={TrendingUp}    value={worker?.daily_rate ?? 0}   label="₹/day" />
          </div>
        </div>
      </section>

      {/* ── Active Engagements ── */}
      <section className="px-5 mt-7">
        <h2 className="text-lg font-black text-slate-900 mb-4">Active engagements</h2>
        {!engagements?.length ? (
          <EmptyCard text="No active homes yet. Check the openings below." />
        ) : (
          <ul className="space-y-3">
            {engagements.map(e => (
              <li key={e.id} className="rounded-3xl bg-white border border-slate-100 shadow-sm p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-[15px] truncate">
                      {e.employer?.full_name ?? 'Resident'}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                      <MapPin size={11} />
                      Flat {e.employer?.flat_number ?? '—'}
                    </p>
                    <p className="mt-0.5 text-xs">
                      {e.employer?.trust_score != null
                        ? <span className="text-amber-600 font-bold">★ {e.employer.trust_score.toFixed(1)} <span className="text-slate-400 font-normal">({e.employer.resident_reviews?.[0]?.count ?? 0} votes)</span></span>
                        : <span className="text-slate-400">Unrated resident</span>
                      }
                    </p>
                    <p className="mt-1 text-xs font-bold text-emerald-600">
                      {attendance.filter(a => a.engagement_id === e.id && a.status === 'present').length} days present this month
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Monthly</p>
                    <p className="text-lg font-black text-slate-900 mt-0.5">
                      ₹{e.monthly_salary.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                  <Link
                    href="/chat"
                    className="flex-1 text-center py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold border border-slate-100"
                  >
                    Message
                  </Link>
                  {worker && e.employer?.id && (
                    <RateResidentButton
                      engagementId={e.id}
                      workerId={worker.id}
                      residentId={e.employer.id}
                      trustScore={e.employer.trust_score}
                      reviewCount={e.employer.resident_reviews?.[0]?.count ?? 0}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Available openings ── */}
      <section className="px-5 mt-7">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-slate-900">Openings near you</h2>
          <Link
            href="/directory"
            className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-2xl"
          >
            See all →
          </Link>
        </div>

        {jobs.length === 0 ? (
          <EmptyCard text="No matching openings right now. New ones appear instantly." />
        ) : (
          <ul className="space-y-3">
            {jobs.slice(0, 3).map(j => (
              <li key={j.id} className="rounded-3xl bg-white border border-slate-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <Briefcase size={16} className="text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm capitalize truncate">
                        {j.specialty.replace(/_/g, ' ')} needed
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {j.employer?.full_name ?? 'Resident'}
                        {j.employer?.flat_number ? ` · Flat ${j.employer.flat_number}` : ''}
                      </p>
                    </div>
                  </div>
                  {j.offered_salary != null && (
                    <span className="shrink-0 inline-flex items-center rounded-2xl bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 text-xs font-black text-emerald-700">
                      ₹{j.offered_salary.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
                {j.description && (
                  <p className="mt-2.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {j.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {!worker && (
        <section className="mx-5 mt-7 rounded-3xl border-2 border-amber-200 bg-amber-50 p-5">
          <p className="font-black text-amber-800">Complete your helper profile</p>
          <p className="mt-1 text-xs text-amber-700 leading-relaxed">
            No worker record found.{' '}
            <Link href="/worker-profile" className="font-bold underline">Complete it →</Link>
          </p>
        </section>
      )}
    </main>
  )
}

function EChip({ icon: Icon, value, label }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  value: number; label: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={12} className="text-emerald-200" />
      <span className="text-white font-black text-sm">{value}</span>
      <span className="text-emerald-200 text-xs">{label}</span>
    </div>
  )
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
      <p className="text-sm text-slate-400 leading-relaxed">{text}</p>
    </div>
  )
}
