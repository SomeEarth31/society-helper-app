/**
 * Resident Dashboard — Uber/Urban Company grade UI.
 * Server component.
 */
import Link from 'next/link'
import { Users, IndianRupee, CalendarCheck, Plus, TrendingUp } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import AttendanceToggle from '@/components/AttendanceToggle'
import PaymentButton from '@/components/PaymentButton'
import { RateWorkerButton } from '@/components/RateButtons'
import EndEngagementButton from '@/components/EndEngagementButton'
import InviteWorkersButton from '@/components/InviteWorkersButton'
import { computeDues } from '@/lib/upi'
import { getServerTranslations } from '@/lib/i18n/server'

type Worker = {
  id: string; full_name: string; specialty: string
  trust_score: number | null; photo_url: string | null
  reviews: { count: number }[]
}
type Engagement = {
  id: string; monthly_salary: number; service_type: string | null; worker: Worker
}
type AttendanceRow = { engagement_id: string; date: string; status: string }

export default async function ResidentDashboard({
  userId,
  profile,
}: {
  userId: string
  profile: { full_name: string | null; flat_number: string | null; society_id: string | null } | null
}) {
  const supabase = createServerClient()
  const T = getServerTranslations()

  // Fetch society name if profile has one
  let societyName: string | null = null
  if (profile?.society_id) {
    const { data: soc } = await supabase
      .from('societies')
      .select('name')
      .eq('id', profile.society_id)
      .maybeSingle()
    societyName = soc?.name ?? null
  }

  const { data: engagements } = await supabase
    .from('engagements')
    .select('id, monthly_salary, service_type, worker:workers ( id, full_name, specialty, trust_score, photo_url, reviews(count) )')
    .eq('employer_id', userId)
    .eq('status', 'active')
    .returns<Engagement[]>()

  const engIds = (engagements ?? []).map(e => e.id)
  const today  = new Date()
  const mStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const mEnd   = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const todayStr = today.toISOString().slice(0, 10)
  const startStr = mStart.toISOString().slice(0, 10)
  const endStr   = mEnd.toISOString().slice(0, 10)
  const daysInMonth = mEnd.getDate()
  const monthLabel  = mStart.toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  let attendance: AttendanceRow[] = []
  if (engIds.length) {
    const { data } = await supabase
      .from('attendance')
      .select('engagement_id, date, status')
      .in('engagement_id', engIds)
      .gte('date', startStr).lte('date', endStr)
      .returns<AttendanceRow[]>()
    attendance = data ?? []
  }

  const stats = new Map<string, { daysWorked: number; today: 'present' | 'absent' | null }>()
  for (const id of engIds) stats.set(id, { daysWorked: 0, today: null })
  for (const a of attendance) {
    const s = stats.get(a.engagement_id)!
    if (a.status === 'present')  s.daysWorked += 1
    if (a.status === 'half_day') s.daysWorked += 0.5
    if (a.date === todayStr)     s.today = a.status as 'present' | 'absent'
  }

  const totalDues = (engagements ?? []).reduce((sum, e) => {
    const s = stats.get(e.id)!
    return sum + computeDues(e.monthly_salary, s.daysWorked, daysInMonth)
  }, 0)

  // Group engagements by worker_id for dedup display
  type WorkerGroup = {
    worker: Engagement['worker']
    engagements: Engagement[]
    totalDues: number
  }
  const workerGroups: WorkerGroup[] = []
  const seenWorkers = new Map<string, WorkerGroup>()
  for (const e of engagements ?? []) {
    const s    = stats.get(e.id)!
    const dues = computeDues(e.monthly_salary, s.daysWorked, daysInMonth)
    if (seenWorkers.has(e.worker.id)) {
      const g = seenWorkers.get(e.worker.id)!
      g.engagements.push(e)
      g.totalDues += dues
    } else {
      const g: WorkerGroup = { worker: e.worker, engagements: [e], totalDues: dues }
      seenWorkers.set(e.worker.id, g)
      workerGroups.push(g)
    }
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Resident'
  const initials  = (profile?.full_name ?? 'R').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()

  return (
    <main className="min-h-screen bg-slate-50 pb-24">

      {/* ── Header ── */}
      <header className="bg-white px-5 pt-14 pb-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-violet-500 mb-1">
              {monthLabel}
            </p>
            <h1 className="text-2xl font-black text-slate-900">{T.resident.greeting(firstName)}</h1>
            {(profile?.flat_number || societyName) && (
              <p className="text-xs text-slate-400 mt-0.5">
                {societyName && <span>{societyName}</span>}
                {societyName && profile?.flat_number && <span> · </span>}
                {profile?.flat_number && <span>Flat {profile.flat_number}</span>}
              </p>
            )}
          </div>
          <Link
            href="/profile"
            className="h-12 w-12 rounded-2xl bg-violet-600 flex items-center justify-center shadow-md shadow-violet-200"
          >
            <span className="text-white font-black text-sm">{initials}</span>
          </Link>
        </div>
      </header>

      {/* ── Summary card ── */}
      <section className="px-5 mt-5">
        <div className="rounded-3xl bg-gradient-to-br from-violet-700 to-violet-500 p-5 shadow-xl shadow-violet-200">
          <p className="text-violet-200 text-[11px] font-bold uppercase tracking-widest">
            {T.resident.duesSoFar}
          </p>
          <p className="text-4xl font-black text-white mt-2 flex items-center gap-1">
            <IndianRupee size={26} strokeWidth={2.5} />
            {totalDues.toLocaleString('en-IN')}
          </p>
          <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-5">
            <Chip icon={Users} value={workerGroups.length} label={T.resident.helpers} />
            <Chip icon={CalendarCheck} value={attendance.length} label={T.resident.marks} />
            <Chip icon={TrendingUp} value={daysInMonth} label={T.resident.daysPerMonth} />
          </div>
        </div>
      </section>

      {/* ── Helpers ── */}
      <section className="px-5 mt-7">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-slate-900">{T.resident.yourHelpers}</h2>
          <div className="flex items-center gap-2">
            <InviteWorkersButton />
            <Link
              href="/directory"
              className="inline-flex items-center gap-1 rounded-2xl bg-violet-50 border border-violet-100 px-3 py-1.5 text-xs font-bold text-violet-600"
            >
              <Plus size={12} />
              {T.common.hire}
            </Link>
          </div>
        </div>

        {workerGroups.length === 0 ? (
          <EmptyState
            title={T.resident.noHelpers}
            desc={T.resident.noHelpersDesc}
            cta={T.resident.browseDirectory}
          />
        ) : (
          <ul className="space-y-3">
            {workerGroups.map(group => {
              const { worker } = group
              const firstEng = group.engagements[0]
              return (
                <li key={worker.id} className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                  {/* Worker header row */}
                  <div className="flex items-center gap-3.5 p-4">
                    <WorkerAvatar name={worker.full_name} url={worker.photo_url} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate text-[15px]">{worker.full_name}</p>
                      {/* All roles listed */}
                      <p className="text-xs text-slate-400 mt-0.5 capitalize">
                        {group.engagements.map(e =>
                          (e.service_type ?? e.worker.specialty).replace(/_/g, ' ')
                        ).join(' · ')}
                      </p>
                      {worker.trust_score != null ? (
                        <span className="text-xs text-amber-500 font-semibold">
                          ★ {worker.trust_score.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Unrated</span>
                      )}
                    </div>
                    {group.engagements.length > 1 && (
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-slate-400">Total owed</p>
                        <p className="text-sm font-black text-slate-900">₹{group.totalDues.toLocaleString('en-IN')}</p>
                      </div>
                    )}
                  </div>

                  {/* Per-engagement rows */}
                  {group.engagements.map((e, idx) => {
                    const s    = stats.get(e.id)!
                    const dues = computeDues(e.monthly_salary, s.daysWorked, daysInMonth)
                    const role = (e.service_type ?? e.worker.specialty).replace(/_/g, ' ')
                    return (
                      <div key={e.id} className={`bg-slate-50 px-4 py-3.5 ${idx === 0 ? 'border-t border-slate-100' : 'border-t border-slate-200'}`}>
                        {group.engagements.length > 1 && (
                          <p className="text-[11px] font-bold uppercase tracking-widest text-violet-500 mb-2 capitalize">{role}</p>
                        )}
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              {T.resident.todayAttendance}
                            </p>
                            <div className="mt-1.5">
                              <AttendanceToggle
                                engagementId={e.id}
                                date={todayStr}
                                initial={s.today}
                              />
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              {s.daysWorked} / {daysInMonth} days
                            </p>
                            <p className="text-base font-black text-slate-900 mt-0.5">
                              ₹{dues.toLocaleString('en-IN')}
                            </p>
                            <p className="text-[10px] text-slate-400">{T.resident.owed}</p>
                          </div>
                        </div>
                        <PaymentButton
                          engagementId={e.id}
                          amount={dues}
                          daysWorked={s.daysWorked}
                          periodStart={startStr}
                          periodEnd={endStr}
                          workerName={worker.full_name}
                        />
                        <div className="flex gap-2 mt-2">
                          <EndEngagementButton
                            engagementId={e.id}
                            role="resident"
                            otherName={worker.full_name}
                          />
                        </div>
                      </div>
                    )
                  })}

                  {/* Rate button once per worker (on first engagement) */}
                  <div className="bg-slate-50 border-t border-slate-100 px-4 pb-3.5">
                    <RateWorkerButton
                      engagementId={firstEng.id}
                      workerId={worker.id}
                      reviewerId={userId}
                      workerName={worker.full_name}
                      trustScore={worker.trust_score}
                      reviewCount={worker.reviews?.[0]?.count ?? 0}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}

/* ── Sub-components ── */

function Chip({ icon: Icon, value, label }: {
  icon: React.ElementType
  value: number; label: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={12} className="text-violet-200" />
      <span className="text-white font-black text-sm">{value}</span>
      <span className="text-violet-200 text-xs">{label}</span>
    </div>
  )
}

function WorkerAvatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt={name} className="h-12 w-12 rounded-2xl object-cover shrink-0" />
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="h-12 w-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-black shrink-0">
      {initials}
    </div>
  )
}

function EmptyState({ title, desc, cta }: { title: string; desc: string; cta: string }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
      <div className="h-16 w-16 rounded-3xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
        <Users size={28} className="text-violet-300" />
      </div>
      <p className="font-black text-slate-700 text-base">{title}</p>
      <p className="text-sm text-slate-400 mt-1 mb-4">{desc}</p>
      <Link
        href="/directory"
        className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200"
      >
        <Plus size={14} />
        {cta}
      </Link>
    </div>
  )
}
