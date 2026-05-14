/**
 * Resident Dashboard — Uber/Urban Company grade UI.
 * Server component.
 */
import Link from 'next/link'
import { Users, IndianRupee, CalendarCheck, ChevronRight, Plus, TrendingUp } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import AttendanceToggle from '@/components/AttendanceToggle'
import PaymentButton from '@/components/PaymentButton'
import { computeDues } from '@/lib/upi'

type Worker = {
  id: string; full_name: string; specialty: string
  trust_score: number; photo_url: string | null
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
  profile: { full_name: string | null; flat_number: string | null } | null
}) {
  const supabase = createServerClient()

  const { data: engagements } = await supabase
    .from('engagements')
    .select('id, monthly_salary, service_type, worker:workers ( id, full_name, specialty, trust_score, photo_url )')
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
            <h1 className="text-2xl font-black text-slate-900">Hi, {firstName} 👋</h1>
            {profile?.flat_number && (
              <p className="text-xs text-slate-400 mt-0.5">Flat {profile.flat_number}</p>
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
            Dues so far this month
          </p>
          <p className="text-4xl font-black text-white mt-2 flex items-center gap-1">
            <IndianRupee size={26} strokeWidth={2.5} />
            {totalDues.toLocaleString('en-IN')}
          </p>
          <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-5">
            <Chip icon={Users} value={engagements?.length ?? 0} label="Helpers" />
            <Chip icon={CalendarCheck} value={attendance.length} label="Marks" />
            <Chip icon={TrendingUp} value={daysInMonth} label="Days/mo" />
          </div>
        </div>
      </section>

      {/* ── Helpers ── */}
      <section className="px-5 mt-7">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-slate-900">Your Helpers</h2>
          <Link
            href="/directory"
            className="inline-flex items-center gap-1 rounded-2xl bg-violet-50 border border-violet-100 px-3 py-1.5 text-xs font-bold text-violet-600"
          >
            <Plus size={12} />
            Hire
          </Link>
        </div>

        {(!engagements || engagements.length === 0) ? (
          <EmptyState />
        ) : (
          <ul className="space-y-3">
            {engagements.map(e => {
              const s    = stats.get(e.id)!
              const dues = computeDues(e.monthly_salary, s.daysWorked, daysInMonth)
              return (
                <li key={e.id} className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                  {/* Worker row */}
                  <Link href={`/engagement/${e.id}`} className="flex items-center gap-3.5 p-4 group">
                    <WorkerAvatar name={e.worker.full_name} url={e.worker.photo_url} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate text-[15px]">
                        {e.worker.full_name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 capitalize">
                        {e.worker.specialty.replace(/_/g, ' ')}
                        <span className="ml-2 text-amber-500 font-semibold">
                          ★ {e.worker.trust_score.toFixed(1)}
                        </span>
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-violet-400 transition shrink-0" />
                  </Link>

                  {/* Stats + actions */}
                  <div className="bg-slate-50 border-t border-slate-100 px-4 py-3.5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Today's attendance
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
                        <p className="text-[10px] text-slate-400">owed</p>
                      </div>
                    </div>
                    <PaymentButton
                      engagementId={e.id}
                      amount={dues}
                      daysWorked={s.daysWorked}
                      periodStart={startStr}
                      periodEnd={endStr}
                      workerName={e.worker.full_name}
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
  icon: React.ComponentType<{ size?: number; className?: string }>
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

function EmptyState() {
  return (
    <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
      <div className="h-16 w-16 rounded-3xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
        <Users size={28} className="text-violet-300" />
      </div>
      <p className="font-black text-slate-700 text-base">No helpers yet</p>
      <p className="text-sm text-slate-400 mt-1 mb-4">
        Browse the directory to hire your first helper.
      </p>
      <Link
        href="/directory"
        className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200"
      >
        <Plus size={14} />
        Browse directory
      </Link>
    </div>
  )
}
